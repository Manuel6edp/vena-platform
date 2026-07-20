// =====================================================================
// VENA · Script de datos de prueba
// Ejecuta:  node scripts/seed.mjs
// Requisitos:
//   1. Haber aplicado supabase/schema.sql en Supabase.
//   2. (Recomendado) Desactivar "Confirm email" en Authentication > Providers
//      > Email, para que el seed pueda iniciar sesión y escribir inventario.
// =====================================================================

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))

// --- Cargar variables de .env (sin dependencias externas) ---
function loadEnv() {
  const env = {}
  try {
    const raw = readFileSync(join(__dirname, '..', '.env'), 'utf8')
    for (const line of raw.split('\n')) {
      const m = line.match(/^\s*([\w.]+)\s*=\s*(.*)\s*$/)
      if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '')
    }
  } catch {
    /* ignore */
  }
  return env
}

const env = loadEnv()
const URL = env.VITE_SUPABASE_URL
const KEY = env.VITE_SUPABASE_ANON_KEY

if (!URL || !KEY) {
  console.error('❌ Faltan VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY en .env')
  process.exit(1)
}

const PASSWORD = 'vena1234'

const INSTITUTIONS = [
  { email: 'central@vena.test',   name: 'Banco de Sangre Central',   city: 'Caracas',   phone: '+58 212 555 0101' },
  { email: 'valencia@vena.test',  name: 'Hemocentro Valencia',       city: 'Valencia',  phone: '+58 241 555 0202' },
  { email: 'maracaibo@vena.test', name: 'Banco de Sangre del Zulia', city: 'Maracaibo', phone: '+58 261 555 0303' },
  { email: 'oriente@vena.test',   name: 'Hemobanco Oriente',         city: 'Barcelona', phone: '+58 281 555 0404' },
]

const COMPONENTS = ['globulos_rojos', 'plasma', 'plaquetas', 'crioprecipitado', 'sangre_total']
const BLOOD = ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+']
const STATUSES = ['disponible', 'disponible', 'disponible', 'reservado', 'cuarentena']

// PRNG determinista para resultados reproducibles.
function mulberry32(seed) {
  return function () {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function dateFromToday(days) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)]
}

function buildInventory(rng) {
  const rows = []
  const count = 12 + Math.floor(rng() * 8) // 12–19 lotes
  for (let i = 0; i < count; i++) {
    // Mezcla de vencimientos: algunos vencidos, algunos por vencer, la mayoría OK.
    const roll = rng()
    let expDays
    if (roll < 0.12) expDays = -Math.floor(rng() * 10) - 1 // vencido
    else if (roll < 0.3) expDays = Math.floor(rng() * 7) // por vencer (0–6 días)
    else expDays = 10 + Math.floor(rng() * 40) // ok

    rows.push({
      component_type: pick(rng, COMPONENTS),
      blood_type: pick(rng, BLOOD),
      units: 1 + Math.floor(rng() * 12),
      expiration_date: dateFromToday(expDays),
      status: pick(rng, STATUSES),
      notes: null,
    })
  }
  return rows
}

function buildThresholds(rng) {
  // Umbral mínimo para O- y O+ en glóbulos rojos y plaquetas (los más críticos),
  // más algunos aleatorios. Deliberadamente altos para generar alertas.
  const combos = [
    ['globulos_rojos', 'O-'],
    ['globulos_rojos', 'O+'],
    ['globulos_rojos', 'A+'],
    ['plaquetas', 'O-'],
    ['plaquetas', 'AB+'],
    ['plasma', 'O+'],
  ]
  return combos.map(([component_type, blood_type]) => ({
    component_type,
    blood_type,
    min_units: 15 + Math.floor(rng() * 20),
  }))
}

async function seedInstitution(inst, index) {
  const supabase = createClient(URL, KEY)

  // 1. Registrar (o iniciar sesión si ya existe)
  let { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
    email: inst.email,
    password: PASSWORD,
    options: { data: { institution_name: inst.name } },
  })

  if (signUpErr && !/already registered/i.test(signUpErr.message)) {
    console.error(`  ❌ signUp ${inst.email}: ${signUpErr.message}`)
    return { ok: false }
  }

  // 2. Asegurar sesión
  let session = signUpData?.session
  if (!session) {
    const { data: signInData, error: signInErr } =
      await supabase.auth.signInWithPassword({ email: inst.email, password: PASSWORD })
    if (signInErr) {
      console.error(
        `  ⚠️  No se pudo iniciar sesión como ${inst.email}: ${signInErr.message}`
      )
      console.error(
        '      → Probablemente "Confirm email" está activo. Desactívalo en Supabase para sembrar datos.'
      )
      return { ok: false, needsConfirm: true }
    }
    session = signInData.session
  }

  const userId = session.user.id

  // 3. Asegurar/crear el perfil de la institución.
  //    Se usa upsert (no update) porque el trigger handle_new_user solo crea la
  //    fila para usuarios registrados DESPUÉS de aplicar el esquema; esto cubre
  //    también a los usuarios creados antes.
  const profRes = await supabase
    .from('institutions')
    .upsert({ id: userId, name: inst.name, city: inst.city, phone: inst.phone })
  if (profRes.error) {
    console.error(`  ❌ perfil ${inst.email}: ${profRes.error.message}`)
    return { ok: false }
  }

  // 4. Limpiar datos previos de esta institución (idempotencia)
  await supabase.from('inventory').delete().eq('institution_id', userId)
  await supabase.from('thresholds').delete().eq('institution_id', userId)

  // 5. Insertar inventario + umbrales
  const rng = mulberry32(1000 + index)
  const inventory = buildInventory(rng).map((r) => ({ ...r, institution_id: userId }))
  const thresholds = buildThresholds(rng).map((t) => ({ ...t, institution_id: userId }))

  const invRes = await supabase.from('inventory').insert(inventory)
  if (invRes.error) {
    console.error(`  ❌ inventario ${inst.email}: ${invRes.error.message}`)
    return { ok: false }
  }
  const thRes = await supabase
    .from('thresholds')
    .upsert(thresholds, { onConflict: 'institution_id,component_type,blood_type' })
  if (thRes.error) {
    console.error(`  ❌ umbrales ${inst.email}: ${thRes.error.message}`)
    return { ok: false }
  }

  console.log(
    `  ✅ ${inst.name} — ${inventory.length} lotes, ${thresholds.length} umbrales`
  )
  await supabase.auth.signOut()
  return { ok: true }
}

async function main() {
  console.log(`\n🩸 Sembrando datos de prueba en ${URL}\n`)
  let ok = 0
  for (let i = 0; i < INSTITUTIONS.length; i++) {
    console.log(`→ ${INSTITUTIONS[i].name} (${INSTITUTIONS[i].email})`)
    const res = await seedInstitution(INSTITUTIONS[i], i)
    if (res.ok) ok++
    if (res.needsConfirm) break
  }

  console.log(`\n${ok}/${INSTITUTIONS.length} instituciones sembradas.`)
  if (ok > 0) {
    console.log('\nCredenciales de acceso (todas con la misma contraseña):')
    console.log(`  Contraseña: ${PASSWORD}`)
    for (const i of INSTITUTIONS) console.log(`  • ${i.email}  —  ${i.name}`)
    console.log('\nInicia sesión con cualquiera para ver su inventario;')
    console.log('las demás aparecerán en la pantalla "Red VENA".\n')
  }
  process.exit(ok > 0 ? 0 : 1)
}

main()

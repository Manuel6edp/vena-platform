import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { BLOOD_TYPES, COMPONENT_TYPES } from '../lib/constants'
import { comboKey } from '../lib/inventory'
import { PageHeader, Card, Button, Spinner, BloodBadge } from '../components/ui'

export default function Settings() {
  const { user, profile } = useAuth()
  const [loading, setLoading] = useState(true)

  // Perfil
  const [name, setName] = useState('')
  const [city, setCity] = useState('')
  const [phone, setPhone] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileMsg, setProfileMsg] = useState('')

  // Umbrales: mapa "component|blood" -> min_units
  const [minMap, setMinMap] = useState({})
  const [savingThresholds, setSavingThresholds] = useState(false)
  const [thresholdMsg, setThresholdMsg] = useState('')

  useEffect(() => {
    if (!user) return
    let active = true
    ;(async () => {
      setLoading(true)
      const { data } = await supabase
        .from('thresholds')
        .select('*')
        .eq('institution_id', user.id)
      if (!active) return
      const map = {}
      for (const t of data ?? []) {
        map[comboKey(t.component_type, t.blood_type)] = t.min_units
      }
      setMinMap(map)
      setLoading(false)
    })()
    return () => {
      active = false
    }
  }, [user])

  useEffect(() => {
    if (profile) {
      setName(profile.name ?? '')
      setCity(profile.city ?? '')
      setPhone(profile.phone ?? '')
    }
  }, [profile])

  async function saveProfile(e) {
    e.preventDefault()
    setSavingProfile(true)
    setProfileMsg('')
    const { error } = await supabase
      .from('institutions')
      .update({ name, city: city || null, phone: phone || null })
      .eq('id', user.id)
    setSavingProfile(false)
    setProfileMsg(error ? 'Error: ' + error.message : 'Perfil actualizado.')
  }

  function setMin(component, blood, value) {
    setMinMap((prev) => ({
      ...prev,
      [comboKey(component, blood)]: value === '' ? '' : Number(value),
    }))
  }

  async function saveThresholds() {
    setSavingThresholds(true)
    setThresholdMsg('')
    const rows = []
    for (const c of COMPONENT_TYPES) {
      for (const bt of BLOOD_TYPES) {
        const raw = minMap[comboKey(c.value, bt)]
        const min = raw === '' || raw == null ? 0 : Number(raw)
        rows.push({
          institution_id: user.id,
          component_type: c.value,
          blood_type: bt,
          min_units: min,
        })
      }
    }
    const { error } = await supabase
      .from('thresholds')
      .upsert(rows, { onConflict: 'institution_id,component_type,blood_type' })
    setSavingThresholds(false)
    setThresholdMsg(
      error ? 'Error: ' + error.message : 'Umbrales guardados correctamente.'
    )
  }

  if (loading) return <Spinner />

  return (
    <div>
      <PageHeader
        title="Configuración"
        subtitle="Datos de la institución y umbrales de stock mínimo"
      />

      {/* Perfil */}
      <Card className="mb-6">
        <h2 className="mb-4 font-semibold text-slate-900">Datos de la institución</h2>
        <form onSubmit={saveProfile} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <label className="block sm:col-span-3">
              <span className="mb-1 block text-sm font-medium text-slate-700">
                Nombre
              </span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">
                Ciudad
              </span>
              <input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Caracas"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-1 block text-sm font-medium text-slate-700">
                Teléfono de contacto
              </span>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+58 212 000 0000"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
          </div>
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={savingProfile}>
              {savingProfile ? 'Guardando…' : 'Guardar perfil'}
            </Button>
            {profileMsg && (
              <span className="text-sm text-slate-500">{profileMsg}</span>
            )}
          </div>
        </form>
      </Card>

      {/* Umbrales */}
      <Card>
        <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold text-slate-900">
              Umbrales de stock mínimo
            </h2>
            <p className="text-sm text-slate-500">
              Define las unidades mínimas por componente y tipo de sangre. Al bajar
              del umbral se generará una alerta.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {thresholdMsg && (
              <span className="text-sm text-slate-500">{thresholdMsg}</span>
            )}
            <Button onClick={saveThresholds} disabled={savingThresholds}>
              {savingThresholds ? 'Guardando…' : 'Guardar umbrales'}
            </Button>
          </div>
        </div>

        <div className="space-y-6">
          {COMPONENT_TYPES.map((c) => (
            <div key={c.value}>
              <h3 className="mb-2 text-sm font-semibold text-slate-700">
                {c.label}{' '}
                <span className="text-xs font-normal text-slate-400">
                  ({c.short})
                </span>
              </h3>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
                {BLOOD_TYPES.map((bt) => (
                  <div
                    key={bt}
                    className="flex flex-col items-center gap-1 rounded-lg border border-slate-100 bg-slate-50 p-2"
                  >
                    <BloodBadge type={bt} />
                    <input
                      type="number"
                      min={0}
                      value={minMap[comboKey(c.value, bt)] ?? ''}
                      onChange={(e) => setMin(c.value, bt, e.target.value)}
                      placeholder="0"
                      className="w-full rounded-md border border-slate-300 px-2 py-1 text-center text-sm"
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

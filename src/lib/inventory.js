import { EXPIRY_WARNING_DAYS } from './constants'

/** Fecha de hoy a medianoche (local). */
export function today() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

/** Días desde hoy hasta la fecha dada (negativo si ya pasó). null si no hay fecha. */
export function daysUntil(dateStr) {
  if (!dateStr) return null
  const target = new Date(dateStr)
  target.setHours(0, 0, 0, 0)
  const diff = target.getTime() - today().getTime()
  return Math.round(diff / (1000 * 60 * 60 * 24))
}

/** Estado de vencimiento de un lote: 'expired' | 'warning' | 'ok' | null. */
export function expiryState(dateStr) {
  const d = daysUntil(dateStr)
  if (d === null) return null
  if (d < 0) return 'expired'
  if (d <= EXPIRY_WARNING_DAYS) return 'warning'
  return 'ok'
}

/** Suma total de unidades de una lista de lotes. */
export function totalUnits(rows) {
  return rows.reduce((sum, r) => sum + (r.units || 0), 0)
}

/**
 * Agrupa unidades por una clave (p. ej. 'component_type' o 'blood_type').
 * Devuelve { [clave]: unidades }.
 */
export function sumBy(rows, key) {
  const out = {}
  for (const r of rows) {
    out[r.key ?? r[key]] = (out[r[key]] || 0) + (r.units || 0)
  }
  return out
}

/**
 * Stock actual agregado por combinación componente+tipo de sangre.
 * Devuelve un Map con clave "component|blood" -> unidades.
 * Sólo cuenta lotes no vencidos con estado disponible por defecto.
 */
export function stockByCombo(rows, { onlyAvailable = true } = {}) {
  const map = new Map()
  for (const r of rows) {
    if (onlyAvailable && r.status !== 'disponible') continue
    if (expiryState(r.expiry_date) === 'expired') continue
    const k = `${r.component}|${r.blood_type}`
    map.set(k, (map.get(k) || 0) + (r.units || 0))
  }
  return map
}

export function comboKey(component, blood) {
  return `${component}|${blood}`
}

/** Formatea una fecha ISO a dd/mm/yyyy. */
export function formatDate(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleDateString('es-VE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

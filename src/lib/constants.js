// Dominio de VENA: tipos de hemocomponentes y grupos sanguíneos.

export const COMPONENT_TYPES = [
  { value: 'globulos_rojos', label: 'Concentrado de glóbulos rojos', short: 'CGR' },
  { value: 'plasma', label: 'Plasma fresco congelado', short: 'PFC' },
  { value: 'plaquetas', label: 'Concentrado plaquetario', short: 'CP' },
  { value: 'crioprecipitado', label: 'Crioprecipitado', short: 'CRIO' },
  { value: 'sangre_total', label: 'Sangre total', short: 'ST' },
]

export const BLOOD_TYPES = [
  'O-',
  'O+',
  'A-',
  'A+',
  'B-',
  'B+',
  'AB-',
  'AB+',
]

export const INVENTORY_STATUS = [
  { value: 'disponible', label: 'Disponible' },
  { value: 'reservado', label: 'Reservado' },
  { value: 'cuarentena', label: 'En cuarentena' },
]

// Días para considerar un lote "por vencer".
export const EXPIRY_WARNING_DAYS = 7

export function componentLabel(value) {
  return COMPONENT_TYPES.find((c) => c.value === value)?.label ?? value
}

export function componentShort(value) {
  return COMPONENT_TYPES.find((c) => c.value === value)?.short ?? value
}

export function statusLabel(value) {
  return INVENTORY_STATUS.find((s) => s.value === value)?.label ?? value
}

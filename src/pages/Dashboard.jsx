import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import {
  BLOOD_TYPES,
  COMPONENT_TYPES,
  EXPIRY_WARNING_DAYS,
  componentLabel,
} from '../lib/constants'
import {
  expiryState,
  stockByCombo,
  comboKey,
  totalUnits,
} from '../lib/inventory'
import { PageHeader, StatCard, Card, Spinner, BloodBadge } from '../components/ui'

export default function Dashboard() {
  const { user, profile } = useAuth()
  const [inventory, setInventory] = useState([])
  const [thresholds, setThresholds] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    let active = true
    ;(async () => {
      setLoading(true)
      const [inv, th] = await Promise.all([
        supabase.from('inventory').select('*').eq('institution_id', user.id),
        supabase.from('thresholds').select('*').eq('institution_id', user.id),
      ])
      if (!active) return
      setInventory(inv.data ?? [])
      setThresholds(th.data ?? [])
      setLoading(false)
    })()
    return () => {
      active = false
    }
  }, [user])

  if (loading) return <Spinner />

  // --- Métricas ---
  const available = inventory.filter(
    (r) => r.status === 'disponible' && expiryState(r.expiration_date) !== 'expired'
  )
  const total = totalUnits(available)

  const expiringSoon = inventory.filter(
    (r) => expiryState(r.expiration_date) === 'warning'
  )
  const expired = inventory.filter(
    (r) => expiryState(r.expiration_date) === 'expired'
  )

  const stock = stockByCombo(inventory)
  const belowThreshold = thresholds.filter((t) => {
    const current = stock.get(comboKey(t.component_type, t.blood_type)) || 0
    return t.min_units > 0 && current < t.min_units
  })

  // Por componente
  const byComponent = COMPONENT_TYPES.map((c) => ({
    ...c,
    units: available
      .filter((r) => r.component_type === c.value)
      .reduce((s, r) => s + r.units, 0),
  }))
  const maxComponent = Math.max(1, ...byComponent.map((c) => c.units))

  // Por tipo de sangre
  const byBlood = BLOOD_TYPES.map((bt) => ({
    type: bt,
    units: available
      .filter((r) => r.blood_type === bt)
      .reduce((s, r) => s + r.units, 0),
  }))

  return (
    <div>
      <PageHeader
        title={`Hola, ${profile?.name ?? 'institución'}`}
        subtitle="Resumen del inventario de hemocomponentes"
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Unidades disponibles" value={total} />
        <StatCard
          label="Bajo stock mínimo"
          value={belowThreshold.length}
          tone={belowThreshold.length ? 'danger' : 'success'}
          sublabel="combinaciones por debajo del umbral"
        />
        <StatCard
          label="Por vencer"
          value={expiringSoon.length}
          tone={expiringSoon.length ? 'warning' : 'success'}
          sublabel={`lotes en ≤ ${EXPIRY_WARNING_DAYS} días`}
        />
        <StatCard
          label="Vencidos"
          value={expired.length}
          tone={expired.length ? 'danger' : 'success'}
          sublabel="lotes a retirar"
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Stock por componente */}
        <Card>
          <h2 className="mb-4 font-semibold text-slate-900">Stock por componente</h2>
          <div className="space-y-4">
            {byComponent.map((c) => (
              <div key={c.value}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="text-slate-600">{c.label}</span>
                  <span className="font-semibold text-slate-900">{c.units}</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-blue-900"
                    style={{ width: `${(c.units / maxComponent) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Stock por tipo de sangre */}
        <Card>
          <h2 className="mb-4 font-semibold text-slate-900">
            Stock por tipo de sangre
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {byBlood.map((b) => (
              <div
                key={b.type}
                className="flex flex-col items-center rounded-lg border border-slate-100 bg-slate-50 py-3"
              >
                <BloodBadge type={b.type} />
                <span className="mt-2 text-xl font-bold text-slate-900">
                  {b.units}
                </span>
                <span className="text-xs text-slate-400">unidades</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Alertas rápidas */}
      {belowThreshold.length > 0 && (
        <Card className="mt-6 border-red-200 bg-red-50">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-semibold text-red-800">
                Atención: {belowThreshold.length} combinación(es) bajo el mínimo
              </h2>
              <p className="mt-1 text-sm text-red-700">
                {belowThreshold
                  .slice(0, 4)
                  .map(
                    (t) => `${componentLabel(t.component_type)} ${t.blood_type}`
                  )
                  .join(' · ')}
                {belowThreshold.length > 4 && ' …'}
              </p>
            </div>
            <Link
              to="/alertas"
              className="shrink-0 rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-500"
            >
              Ver alertas
            </Link>
          </div>
        </Card>
      )}
    </div>
  )
}

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { EXPIRY_WARNING_DAYS, componentLabel } from '../lib/constants'
import {
  expiryState,
  stockByCombo,
  comboKey,
  daysUntil,
  formatDate,
} from '../lib/inventory'
import {
  PageHeader,
  Card,
  Badge,
  BloodBadge,
  Spinner,
  EmptyState,
  Button,
} from '../components/ui'

export default function Alerts() {
  const { user } = useAuth()
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

  const stock = stockByCombo(inventory)

  // Stock bajo mínimo
  const lowStock = thresholds
    .filter((t) => t.min_units > 0)
    .map((t) => ({
      ...t,
      current: stock.get(comboKey(t.component_type, t.blood_type)) || 0,
    }))
    .filter((t) => t.current < t.min_units)
    .sort((a, b) => a.current - a.min_units - (b.current - b.min_units))

  // Lotes por vencer y vencidos
  const expiringSoon = inventory
    .filter((r) => expiryState(r.expiration_date) === 'warning')
    .sort((a, b) => daysUntil(a.expiration_date) - daysUntil(b.expiration_date))
  const expired = inventory
    .filter((r) => expiryState(r.expiration_date) === 'expired')
    .sort((a, b) => daysUntil(a.expiration_date) - daysUntil(b.expiration_date))

  const noAlerts =
    lowStock.length === 0 && expiringSoon.length === 0 && expired.length === 0

  return (
    <div>
      <PageHeader
        title="Panel de alertas"
        subtitle="Stock por debajo del mínimo y control de vencimientos"
      />

      {noAlerts ? (
        <EmptyState
          title="Todo en orden"
          message="No hay alertas de stock ni vencimientos próximos en este momento."
          icon="✅"
        />
      ) : (
        <div className="space-y-6">
          {/* Stock mínimo */}
          <AlertSection
            title="Stock bajo el mínimo"
            count={lowStock.length}
            tone="red"
            empty="Ninguna combinación por debajo del umbral."
          >
            {lowStock.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between rounded-lg border border-red-100 bg-red-50 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <BloodBadge type={t.blood_type} />
                  <span className="font-medium text-slate-800">
                    {componentLabel(t.component_type)}
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-red-700">
                    {t.current} / {t.min_units} u.
                  </p>
                  <p className="text-xs text-red-600">
                    Faltan {t.min_units - t.current} unidades
                  </p>
                </div>
              </div>
            ))}
          </AlertSection>

          {/* Vencidos */}
          <AlertSection
            title="Lotes vencidos"
            count={expired.length}
            tone="red"
            empty="No hay lotes vencidos."
          >
            {expired.map((r) => (
              <ExpiryRow key={r.id} row={r} expired />
            ))}
          </AlertSection>

          {/* Por vencer */}
          <AlertSection
            title={`Por vencer (≤ ${EXPIRY_WARNING_DAYS} días)`}
            count={expiringSoon.length}
            tone="amber"
            empty="No hay lotes próximos a vencer."
          >
            {expiringSoon.map((r) => (
              <ExpiryRow key={r.id} row={r} />
            ))}
          </AlertSection>
        </div>
      )}

      <div className="mt-6 flex gap-3">
        <Link to="/inventario">
          <Button variant="secondary">Ir al inventario</Button>
        </Link>
        <Link to="/configuracion">
          <Button variant="secondary">Configurar umbrales</Button>
        </Link>
      </div>
    </div>
  )
}

function AlertSection({ title, count, tone, empty, children }) {
  return (
    <Card>
      <div className="mb-3 flex items-center gap-2">
        <h2 className="font-semibold text-slate-900">{title}</h2>
        <Badge tone={count ? tone : 'green'}>{count}</Badge>
      </div>
      {count === 0 ? (
        <p className="text-sm text-slate-400">{empty}</p>
      ) : (
        <div className="space-y-2">{children}</div>
      )}
    </Card>
  )
}

function ExpiryRow({ row, expired = false }) {
  const d = daysUntil(row.expiration_date)
  return (
    <div
      className={`flex items-center justify-between rounded-lg border px-4 py-3 ${
        expired ? 'border-red-100 bg-red-50' : 'border-amber-100 bg-amber-50'
      }`}
    >
      <div className="flex items-center gap-3">
        <BloodBadge type={row.blood_type} />
        <div>
          <p className="font-medium text-slate-800">
            {componentLabel(row.component_type)}
          </p>
          <p className="text-xs text-slate-500">{row.units} unidades</p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-sm font-semibold text-slate-800">
          {formatDate(row.expiration_date)}
        </p>
        <Badge tone={expired ? 'red' : 'amber'}>
          {expired ? `Venció hace ${Math.abs(d)} d` : `${d} días`}
        </Badge>
      </div>
    </div>
  )
}

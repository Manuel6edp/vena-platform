import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { BLOOD_TYPES, COMPONENT_TYPES, componentLabel } from '../lib/constants'
import { expiryState } from '../lib/inventory'
import {
  PageHeader,
  Card,
  BloodBadge,
  Spinner,
  EmptyState,
  Badge,
} from '../components/ui'

export default function Network() {
  const { user } = useAuth()
  const [institutions, setInstitutions] = useState([])
  const [inventory, setInventory] = useState([])
  const [loading, setLoading] = useState(true)

  const [component, setComponent] = useState('')
  const [blood, setBlood] = useState('')

  useEffect(() => {
    let active = true
    ;(async () => {
      setLoading(true)
      const [inst, inv] = await Promise.all([
        supabase.from('institutions').select('*'),
        supabase.from('inventory').select('*'),
      ])
      if (!active) return
      setInstitutions(inst.data ?? [])
      setInventory(inv.data ?? [])
      setLoading(false)
    })()
    return () => {
      active = false
    }
  }, [])

  // Sólo unidades disponibles y no vencidas cuentan para la red.
  const availableInventory = useMemo(
    () =>
      inventory.filter(
        (r) =>
          r.status === 'disponible' &&
          expiryState(r.expiration_date) !== 'expired' &&
          r.institution_id !== user?.id
      ),
    [inventory, user]
  )

  const others = institutions.filter((i) => i.id !== user?.id)

  // Construye, por institución, el stock filtrado.
  const cards = useMemo(() => {
    return others
      .map((inst) => {
        const rows = availableInventory.filter(
          (r) =>
            r.institution_id === inst.id &&
            (!component || r.component_type === component) &&
            (!blood || r.blood_type === blood)
        )
        const byBlood = {}
        for (const bt of BLOOD_TYPES) byBlood[bt] = 0
        let total = 0
        for (const r of rows) {
          byBlood[r.blood_type] = (byBlood[r.blood_type] || 0) + r.units
          total += r.units
        }
        return { inst, total, byBlood }
      })
      .sort((a, b) => b.total - a.total)
  }, [others, availableInventory, component, blood])

  const networkTotal = cards.reduce((s, c) => s + c.total, 0)

  if (loading) return <Spinner />

  return (
    <div>
      <PageHeader
        title="Red VENA"
        subtitle="Disponibilidad de hemocomponentes en otras instituciones de la red"
      />

      <Card className="mb-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="block text-xs font-medium text-slate-500">
              Componente
            </label>
            <select
              value={component}
              onChange={(e) => setComponent(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">Todos</option>
              {COMPONENT_TYPES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium text-slate-500">
              Tipo de sangre
            </label>
            <select
              value={blood}
              onChange={(e) => setBlood(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">Todos</option>
              {BLOOD_TYPES.map((bt) => (
                <option key={bt} value={bt}>
                  {bt}
                </option>
              ))}
            </select>
          </div>
          <div className="rounded-lg bg-slate-900 px-4 py-2 text-center text-white">
            <p className="text-xs text-slate-300">Total en la red</p>
            <p className="text-xl font-bold">{networkTotal} u.</p>
          </div>
        </div>
      </Card>

      {others.length === 0 ? (
        <EmptyState
          title="Aún no hay otras instituciones"
          message="Cuando más bancos de sangre se registren en VENA, verás su disponibilidad aquí."
          icon="🏥"
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {cards.map(({ inst, total, byBlood }) => (
            <Card key={inst.id}>
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-slate-900">{inst.name}</h3>
                  <p className="text-xs text-slate-500">
                    {[inst.city, inst.phone].filter(Boolean).join(' · ') ||
                      'Sin datos de contacto'}
                  </p>
                </div>
                <Badge tone={total ? 'green' : 'slate'}>{total} u.</Badge>
              </div>

              {component && (
                <p className="mb-2 text-xs font-medium text-slate-400">
                  {componentLabel(component)}
                </p>
              )}

              <div className="grid grid-cols-4 gap-2">
                {BLOOD_TYPES.map((bt) => {
                  const units = byBlood[bt] || 0
                  const active = !blood || blood === bt
                  return (
                    <div
                      key={bt}
                      className={`flex flex-col items-center rounded-lg border py-2 ${
                        units > 0
                          ? 'border-slate-200 bg-slate-50'
                          : 'border-slate-100 bg-white'
                      } ${active ? '' : 'opacity-30'}`}
                    >
                      <BloodBadge type={bt} />
                      <span
                        className={`mt-1 text-sm font-bold ${
                          units > 0 ? 'text-slate-900' : 'text-slate-300'
                        }`}
                      >
                        {units}
                      </span>
                    </div>
                  )
                })}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import {
  BLOOD_TYPES,
  COMPONENT_TYPES,
  INVENTORY_STATUS,
  componentLabel,
  statusLabel,
} from '../lib/constants'
import { expiryState, formatDate, daysUntil } from '../lib/inventory'
import {
  PageHeader,
  Card,
  Button,
  Badge,
  BloodBadge,
  Modal,
  Spinner,
  EmptyState,
} from '../components/ui'

const EMPTY_FORM = {
  component: 'globulos_rojos',
  blood_type: 'O+',
  units: 1,
  expiry_date: '',
  status: 'disponible',
  notes: '',
}

export default function Inventory() {
  const { user } = useAuth()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Filtros
  const [filterComponent, setFilterComponent] = useState('')
  const [filterBlood, setFilterBlood] = useState('')

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('inventory')
      .select('*')
      .eq('institution_id', user.id)
      .order('expiry_date', { ascending: true, nullsFirst: false })
    setRows(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    if (user) load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const filtered = useMemo(() => {
    return rows.filter(
      (r) =>
        (!filterComponent || r.component === filterComponent) &&
        (!filterBlood || r.blood_type === filterBlood)
    )
  }, [rows, filterComponent, filterBlood])

  function openCreate() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setError('')
    setModalOpen(true)
  }

  function openEdit(row) {
    setEditing(row)
    setForm({
      component: row.component,
      blood_type: row.blood_type,
      units: row.units,
      expiry_date: row.expiry_date ?? '',
      status: row.status,
      notes: row.notes ?? '',
    })
    setError('')
    setModalOpen(true)
  }

  async function handleSave(e) {
    e.preventDefault()
    setError('')
    setSaving(true)
    const payload = {
      institution_id: user.id,
      component: form.component,
      blood_type: form.blood_type,
      units: Number(form.units),
      expiry_date: form.expiry_date || null,
      status: form.status,
      notes: form.notes || null,
    }

    let res
    if (editing) {
      res = await supabase.from('inventory').update(payload).eq('id', editing.id)
    } else {
      res = await supabase.from('inventory').insert(payload)
    }

    setSaving(false)
    if (res.error) {
      setError(res.error.message)
      return
    }
    setModalOpen(false)
    await load()
  }

  async function handleDelete(row) {
    if (
      !window.confirm(
        `¿Eliminar el lote de ${componentLabel(row.component)} ${row.blood_type} (${row.units} u.)?`
      )
    )
      return
    const { error } = await supabase.from('inventory').delete().eq('id', row.id)
    if (error) {
      window.alert('Error al eliminar: ' + error.message)
      return
    }
    await load()
  }

  return (
    <div>
      <PageHeader
        title="Gestión de inventario"
        subtitle="Administra los lotes de hemocomponentes de tu institución"
        action={<Button onClick={openCreate}>+ Nuevo lote</Button>}
      />

      {/* Filtros */}
      <Card className="mb-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="block text-xs font-medium text-slate-500">
              Componente
            </label>
            <select
              value={filterComponent}
              onChange={(e) => setFilterComponent(e.target.value)}
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
              value={filterBlood}
              onChange={(e) => setFilterBlood(e.target.value)}
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
          {(filterComponent || filterBlood) && (
            <Button
              variant="secondary"
              onClick={() => {
                setFilterComponent('')
                setFilterBlood('')
              }}
            >
              Limpiar
            </Button>
          )}
        </div>
      </Card>

      {loading ? (
        <Spinner />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="Sin lotes registrados"
          message="Agrega tu primer lote de hemocomponentes para empezar a gestionar el inventario."
          icon="🩸"
        />
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Componente</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Unidades</th>
                  <th className="px-4 py-3">Vencimiento</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {componentLabel(row.component)}
                    </td>
                    <td className="px-4 py-3">
                      <BloodBadge type={row.blood_type} />
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      {row.units}
                    </td>
                    <td className="px-4 py-3">
                      <ExpiryCell date={row.expiry_date} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={row.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => openEdit(row)}
                          className="rounded-md px-2 py-1 text-sm font-medium text-blue-900 hover:bg-blue-50"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(row)}
                          className="rounded-md px-2 py-1 text-sm font-medium text-red-600 hover:bg-red-50"
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Modal crear/editar */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Editar lote' : 'Nuevo lote'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Componente">
              <select
                value={form.component}
                onChange={(e) =>
                  setForm({ ...form, component: e.target.value })
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                {COMPONENT_TYPES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Tipo de sangre">
              <select
                value={form.blood_type}
                onChange={(e) => setForm({ ...form, blood_type: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                {BLOOD_TYPES.map((bt) => (
                  <option key={bt} value={bt}>
                    {bt}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Unidades">
              <input
                type="number"
                min={0}
                required
                value={form.units}
                onChange={(e) => setForm({ ...form, units: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </Field>
            <Field label="Fecha de vencimiento">
              <input
                type="date"
                value={form.expiry_date}
                onChange={(e) =>
                  setForm({ ...form, expiry_date: e.target.value })
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </Field>
            <Field label="Estado">
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                {INVENTORY_STATUS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Notas (opcional)">
            <textarea
              rows={2}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="Nº de bolsa, procedencia, observaciones…"
            />
          </Field>

          {error && (
            <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear lote'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">
        {label}
      </span>
      {children}
    </label>
  )
}

function StatusBadge({ status }) {
  const tone =
    status === 'disponible' ? 'green' : status === 'reservado' ? 'blue' : 'amber'
  return <Badge tone={tone}>{statusLabel(status)}</Badge>
}

function ExpiryCell({ date }) {
  const state = expiryState(date)
  if (!date) return <span className="text-slate-400">—</span>
  const d = daysUntil(date)
  if (state === 'expired')
    return (
      <span className="text-red-600">
        {formatDate(date)} <Badge tone="red">Vencido</Badge>
      </span>
    )
  if (state === 'warning')
    return (
      <span className="text-amber-700">
        {formatDate(date)} <Badge tone="amber">{d} d</Badge>
      </span>
    )
  return <span className="text-slate-600">{formatDate(date)}</span>
}

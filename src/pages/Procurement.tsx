import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Loader2, Pencil, Plus, RefreshCw, Trash2, X } from 'lucide-react'
import { supabase } from '../lib/supabase'

/**
 * Shape of a row from the Supabase `purchase_orders` table, including
 * the joined supplier name (`supplier:suppliers(name)`).
 */
interface PurchaseOrderRow {
  id: string
  supplier_id: string
  status: string
  total_cost: number
  created_at: string
  supplier: { name: string } | null
}

/** Minimal supplier shape used to populate the dropdown in the modal. */
interface SupplierOption {
  id: string
  name: string
}

/** State for the Create/Edit purchase order modal form. */
interface PurchaseOrderForm {
  supplierId: string
  totalCost: string
  status: string
}

/** Status options shown in the modal. */
const statusOptions = ['Draft', 'Sent', 'Received'] as const

/** Tailwind badge classes per purchase order status (with fallback). */
const statusStyles: Record<string, string> = {
  Draft: 'bg-slate-100 text-slate-700',
  Sent: 'bg-blue-100 text-blue-700',
  Received: 'bg-emerald-100 text-emerald-700',
}

/** Blank form state used to (re)initialize the modal. */
const emptyForm: PurchaseOrderForm = {
  supplierId: '',
  totalCost: '',
  status: 'Draft',
}

/** Format an amount as Philippine Pesos. */
function formatPeso(amount: number): string {
  return `₱${amount.toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

/** Format an ISO timestamp as a short local date. */
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default function Procurement() {
  const [orders, setOrders] = useState<PurchaseOrderRow[]>([])
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  /** ID of the purchase order being edited, or null when creating. */
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<PurchaseOrderForm>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  /** Fetch purchase orders (newest first) with the supplier name joined in. */
  const fetchOrders = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error: fetchError } = await supabase
      .from('purchase_orders')
      .select('*, supplier:suppliers(name)')
      .order('created_at', { ascending: false })
      .limit(1000)
    if (fetchError) {
      setError(fetchError.message)
    } else {
      setOrders((data as PurchaseOrderRow[]) ?? [])
    }
    setLoading(false)
  }, [])

  /** Fetch the supplier list that populates the modal dropdown. */
  const fetchSuppliers = useCallback(async () => {
    const { data, error: fetchError } = await supabase
      .from('suppliers')
      .select('id, name')
      .order('name', { ascending: true })
    if (fetchError) {
      // Keep any more important error already set by fetchOrders.
      setError((prev) => prev ?? fetchError.message)
    } else {
      setSuppliers((data as SupplierOption[]) ?? [])
    }
  }, [])

  // Load both datasets in parallel once on mount.
  useEffect(() => {
    void fetchOrders()
    void fetchSuppliers()
  }, [fetchOrders, fetchSuppliers])

  /** Open the modal in "create" mode with a blank form. */
  const openModal = () => {
    setForm(emptyForm)
    setEditingId(null)
    setFormError(null)
    setIsModalOpen(true)
  }

  /** Open the modal in "edit" mode, pre-filled with the PO's data. */
  const openEditModal = (order: PurchaseOrderRow) => {
    setForm({
      supplierId: order.supplier_id,
      totalCost: String(order.total_cost ?? ''),
      status: statusOptions.includes(
        order.status as (typeof statusOptions)[number],
      )
        ? order.status
        : 'Draft',
    })
    setEditingId(order.id)
    setFormError(null)
    setIsModalOpen(true)
  }

  /** Close the modal and reset the editing state. */
  const closeModal = () => {
    setIsModalOpen(false)
    setEditingId(null)
  }

  /** Generic change handler for every form field. */
  const handleChange = (field: keyof PurchaseOrderForm, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  /**
   * Submit the modal form. When `editingId` is set this UPDATEs the
   * existing purchase order; otherwise it INSERTs a new row into the
   * Supabase `purchase_orders` table. Local state is updated immediately
   * so the table reflects the change without a page refresh.
   */
  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setFormError(null)

    if (!form.supplierId) {
      setFormError('Please select a supplier.')
      return
    }
    const totalCost = Number(form.totalCost)
    if (!Number.isFinite(totalCost) || totalCost < 0) {
      setFormError('Total cost must be a number greater than or equal to 0.')
      return
    }

    const payload = {
      supplier_id: form.supplierId,
      status: form.status,
      total_cost: totalCost,
    }

    setSaving(true)
    if (editingId) {
      // Update the existing row and return it so we can patch local state.
      const { data, error: updateError } = await supabase
        .from('purchase_orders')
        .update(payload)
        .eq('id', editingId)
        .select()
        .single()
      setSaving(false)
      if (updateError) {
        setFormError(updateError.message)
        return
      }
      const updated = data as PurchaseOrderRow
      // The UPDATE response is a bare row (no join), so re-resolve the
      // supplier name from the locally loaded supplier list.
      setOrders((prev) =>
        prev.map((order) => {
          if (order.id !== editingId) return order
          const supplierName = suppliers.find(
            (s) => s.id === updated.supplier_id,
          )?.name
          return {
            ...updated,
            supplier: supplierName ? { name: supplierName } : null,
          }
        }),
      )
    } else {
      // Insert the new purchase order, then refresh so it lands in its
      // server-sorted (newest-first) position with the joined name.
      const { error: insertError } = await supabase
        .from('purchase_orders')
        .insert([payload])
      setSaving(false)
      if (insertError) {
        setFormError(insertError.message)
        return
      }
      await fetchOrders()
    }
    closeModal()
  }

  /**
   * Delete a purchase order after an explicit confirmation, then remove
   * it from local state immediately.
   */
  const handleDelete = async (order: PurchaseOrderRow) => {
    const confirmed = window.confirm(
      'Are you sure you want to delete this purchase order?',
    )
    if (!confirmed) return

    const { error: deleteError } = await supabase
      .from('purchase_orders')
      .delete()
      .eq('id', order.id)
    if (deleteError) {
      setError(deleteError.message)
      return
    }
    setOrders((prev) => prev.filter((o) => o.id !== order.id))
  }

  return (
    <div>
      {/* Page header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Procurement</h1>
          <p className="mt-1 text-sm text-slate-500">
            Track purchase orders placed with your suppliers.
          </p>
        </div>
        <button
          type="button"
          onClick={openModal}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" />
          Create Purchase Order
        </button>
      </div>

      {/* Fetch error banner with retry */}
      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <div className="flex items-center justify-between gap-4">
            <span>Failed to load purchase orders: {error}</span>
            <button
              type="button"
              onClick={() => {
                void fetchOrders()
                void fetchSuppliers()
              }}
              className="inline-flex shrink-0 items-center gap-2 rounded-md border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-700 transition-colors hover:bg-red-100"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Try Again
            </button>
          </div>
        </div>
      )}

      {/* Purchase orders table */}
      <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                PO ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Supplier Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Total Cost
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Date
              </th>
              <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-indigo-600" />
                </td>
              </tr>
            )}
            {!loading && orders.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-6 py-12 text-center text-sm text-slate-500"
                >
                  No purchase orders yet. Create your first one!
                </td>
              </tr>
            )}
            {!loading &&
              orders.map((order) => (
                <tr key={order.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 text-sm font-medium text-slate-900">
                    {order.id.slice(0, 8)}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-900">
                    {order.supplier?.name ?? '—'}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyles[order.status] ?? 'bg-slate-100 text-slate-700'}`}
                    >
                      {order.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-slate-900">
                    {formatPeso(Number(order.total_cost ?? 0))}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">
                    {formatDate(order.created_at)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => openEditModal(order)}
                        title="Edit purchase order"
                        className="rounded-md p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-indigo-600"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDelete(order)}
                        title="Delete purchase order"
                        className="rounded-md p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* Create/Edit purchase order modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          onClick={closeModal}
        >
          <div
            className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  {editingId ? 'Edit Purchase Order' : 'Create Purchase Order'}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {editingId
                    ? 'Update the purchase order details below.'
                    : 'Fill in the details to create a new purchase order.'}
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              {/* Supplier */}
              <div>
                <label
                  htmlFor="po-supplier"
                  className="block text-sm font-medium text-slate-700"
                >
                  Supplier <span className="text-red-500">*</span>
                </label>
                <select
                  id="po-supplier"
                  required
                  value={form.supplierId}
                  onChange={(e) => handleChange('supplierId', e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="" disabled>
                    Select a supplier
                  </option>
                  {suppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Total cost */}
              <div>
                <label
                  htmlFor="po-cost"
                  className="block text-sm font-medium text-slate-700"
                >
                  Total Cost (₱) <span className="text-red-500">*</span>
                </label>
                <input
                  id="po-cost"
                  type="number"
                  min={0}
                  step={0.01}
                  required
                  value={form.totalCost}
                  onChange={(e) => handleChange('totalCost', e.target.value)}
                  placeholder="e.g. 1500.00"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Status */}
              <div>
                <label
                  htmlFor="po-status"
                  className="block text-sm font-medium text-slate-700"
                >
                  Status
                </label>
                <select
                  id="po-status"
                  value={form.status}
                  onChange={(e) => handleChange('status', e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>

              {/* Modal-level validation / API error */}
              {formError && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                  {formError}
                </p>
              )}

              {/* Action buttons */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  {editingId ? 'Save Changes' : 'Create Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}


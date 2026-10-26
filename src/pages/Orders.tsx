import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  Clock,
  DollarSign,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  ShoppingCart,
  Trash2,
  X,
} from 'lucide-react'
import { supabase } from '../lib/supabase'

/** Recognized sales platforms (mirrors the schema CHECK constraint). */
type Platform = 'Shopee' | 'Lazada' | 'FB'

/** Recognized order statuses shown in the app. */
type OrderStatus = 'Pending' | 'Shipped' | 'Completed' | 'Cancelled'

/**
 * Shape of a row from the Supabase `orders` table.
 * Columns are snake_case, mirroring schema.sql exactly.
 */
interface OrderRow {
  id: string
  platform: string
  status: string
  total_amount: number
  created_at: string
}

/** State for the add/edit order modal form. */
interface OrderForm {
  platform: Platform
  status: OrderStatus
  totalAmount: string
}

/** Summary card descriptor. */
interface SummaryCard {
  title: string
  value: string
  subtitle: string
  icon: typeof DollarSign
  accent: string
}

/** Tailwind badge classes per order status (with fallback). */
const statusStyles: Record<string, string> = {
  Completed: 'bg-emerald-100 text-emerald-700',
  Shipped: 'bg-blue-100 text-blue-700',
  Pending: 'bg-amber-100 text-amber-700',
  Cancelled: 'bg-red-100 text-red-700',
}

/** Tailwind badge classes per platform (with fallback). */
const platformStyles: Record<string, string> = {
  Shopee: 'bg-orange-100 text-orange-700',
  Lazada: 'bg-sky-100 text-sky-700',
  FB: 'bg-indigo-100 text-indigo-700',
}

const platforms: Platform[] = ['Shopee', 'Lazada', 'FB']
const statuses: OrderStatus[] = ['Pending', 'Shipped', 'Completed', 'Cancelled']

/** Blank form state used to (re)initialize the modal. */
const emptyForm: OrderForm = {
  platform: 'Shopee',
  status: 'Pending',
  totalAmount: '',
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
  })
}

/**
 * Orders page: full order tracking backed by the Supabase `orders`
 * table — summary metrics, platform/status filters, and add / edit /
 * delete via the same modal pattern used on the Inventory page.
 */
export default function Orders() {
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Table filters (applied client-side).
  const [platformFilter, setPlatformFilter] = useState<'All' | Platform>('All')
  const [statusFilter, setStatusFilter] = useState<'All' | OrderStatus>('All')

  // Modal state.
  const [isModalOpen, setIsModalOpen] = useState(false)
  /** ID of the order being edited, or null when adding a new one. */
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<OrderForm>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  /** Fetch orders from Supabase (used on mount and after inserts). */
  const fetchOrders = useCallback(async () => {
    setLoading(true)
    setError(null)
    // Limit keeps the payload sane; matches the Dashboard query.
    const { data, error: fetchError } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1000)
    if (fetchError) {
      setError(fetchError.message)
    } else {
      setOrders((data as OrderRow[]) ?? [])
    }
    setLoading(false)
  }, [])

  // Load orders once on mount.
  useEffect(() => {
    void fetchOrders()
  }, [fetchOrders])

  // Derived metrics, computed from the full (unfiltered) list.
  const completedRevenue = orders
    .filter((o) => o.status === 'Completed')
    .reduce((sum, o) => sum + (o.total_amount ?? 0), 0)
  const pendingCount = orders.filter((o) => o.status === 'Pending').length

  // Rows shown in the table after applying the filters.
  const filteredOrders = useMemo(
    () =>
      orders.filter(
        (o) =>
          (platformFilter === 'All' || o.platform === platformFilter) &&
          (statusFilter === 'All' || o.status === statusFilter),
      ),
    [orders, platformFilter, statusFilter],
  )

  const summaryCards: SummaryCard[] = [
    {
      title: 'Total Orders',
      value: String(orders.length),
      subtitle: 'All platforms',
      icon: ShoppingCart,
      accent: 'bg-indigo-600',
    },
    {
      title: 'Completed Revenue',
      value: formatPeso(completedRevenue),
      subtitle: 'Completed orders only',
      icon: DollarSign,
      accent: 'bg-emerald-600',
    },
    {
      title: 'Pending Orders',
      value: String(pendingCount),
      subtitle: 'Awaiting fulfillment',
      icon: Clock,
      accent: 'bg-amber-500',
    },
  ]

  const openModal = () => {
    setForm(emptyForm)
    setEditingId(null)
    setFormError(null)
    setIsModalOpen(true)
  }

  /**
   * Open the modal pre-filled with an existing order's data. The order
   * id is kept in `editingId` so the submit handler knows to run an
   * UPDATE instead of an INSERT.
   */
  const openEditModal = (order: OrderRow) => {
    setForm({
      platform: (platforms as string[]).includes(order.platform)
        ? (order.platform as Platform)
        : 'Shopee',
      status: (statuses as string[]).includes(order.status)
        ? (order.status as OrderStatus)
        : 'Pending',
      totalAmount:
        order.total_amount === null ? '' : String(order.total_amount),
    })
    setEditingId(order.id)
    setFormError(null)
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingId(null)
  }

  /** Generic change handler for every form field. */
  const handleChange = (field: keyof OrderForm, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  /**
   * Submit the modal form. When `editingId` is set this performs an
   * UPDATE on the existing row; otherwise it INSERTs a new row into the
   * Supabase `orders` table. Local state is updated immediately so the
   * table reflects the change without a page refresh.
   */
  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setFormError(null)
    setSaving(true)

    const payload = {
      platform: form.platform,
      status: form.status,
      total_amount: form.totalAmount ? Number(form.totalAmount) : 0,
    }

    if (editingId) {
      // Update the existing row and return it so we can patch local state.
      const { data, error: updateError } = await supabase
        .from('orders')
        .update(payload)
        .eq('id', editingId)
        .select()
        .single()
      setSaving(false)
      if (updateError) {
        setFormError(updateError.message)
        return
      }
      setOrders((prev) =>
        prev.map((order) => (order.id === editingId ? data : order)),
      )
    } else {
      // Insert the new order.
      const { error: insertError } = await supabase
        .from('orders')
        .insert([payload])
      setSaving(false)
      if (insertError) {
        setFormError(insertError.message)
        return
      }
      // Refresh so the new order appears in its server-sorted position.
      await fetchOrders()
    }
    closeModal()
  }

  /**
   * Delete an order after an explicit confirmation. The row is removed
   * from local state immediately so no page refresh is needed.
   */
  const handleDelete = async (order: OrderRow) => {
    const confirmed = window.confirm(
      'Are you sure you want to delete this order?',
    )
    if (!confirmed) return

    const { error: deleteError } = await supabase
      .from('orders')
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
      {/* Page header + primary action */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Orders</h1>
          <p className="mt-1 text-sm text-slate-500">
            Track customer orders from Shopee, Lazada, and Facebook.
          </p>
        </div>
        <button
          type="button"
          onClick={openModal}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          <Plus className="h-4 w-4" />
          New Order
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-6 flex items-center justify-between rounded-xl bg-red-50 px-6 py-4 text-sm text-red-700">
          <span>Failed to load orders: {error}</span>
          <button
            type="button"
            onClick={() => void fetchOrders()}
            className="inline-flex items-center gap-2 font-medium underline hover:no-underline"
          >
            <RefreshCw className="h-4 w-4" />
            Try Again
          </button>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {summaryCards.map(({ title, value, subtitle, icon: Icon, accent }) => (
          <div
            key={title}
            className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">{title}</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">
                  {value}
                </p>
                <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
              </div>
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-lg ${accent}`}
              >
                <Icon className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <select
          aria-label="Filter by platform"
          value={platformFilter}
          onChange={(e) => setPlatformFilter(e.target.value as 'All' | Platform)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          <option value="All">All Platforms</option>
          {platforms.map((platform) => (
            <option key={platform} value={platform}>
              {platform}
            </option>
          ))}
        </select>
        <select
          aria-label="Filter by status"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'All' | OrderStatus)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          <option value="All">All Statuses</option>
          {statuses.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
        <span className="text-sm text-slate-500">
          Showing {filteredOrders.length} of {orders.length} orders
        </span>
      </div>

      {/* Orders data table */}
      <div className="mt-4 overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Order ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Platform
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Date
              </th>
              <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                Total
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
            {!loading && filteredOrders.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-6 py-12 text-center text-sm text-slate-500"
                >
                  {orders.length === 0
                    ? 'No orders yet — add your first one!'
                    : 'No orders match the selected filters.'}
                </td>
              </tr>
            )}
            {!loading &&
              filteredOrders.map((order) => (
                <tr key={order.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 text-sm font-medium text-slate-900">
                    {order.id.slice(0, 8)}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${platformStyles[order.platform] ?? 'bg-slate-100 text-slate-700'}`}
                    >
                      {order.platform}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyles[order.status] ?? 'bg-slate-100 text-slate-700'}`}
                    >
                      {order.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">
                    {formatDate(order.created_at)}
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-medium text-slate-900">
                    {formatPeso(order.total_amount)}
                  </td>
                  {/* Row actions: edit and delete */}
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => openEditModal(order)}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(order)}
                        className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-red-700"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Order modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={closeModal} // Clicking the backdrop closes the modal
        >
          <div
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()} // Prevent backdrop click from closing
          >
            {/* Modal header */}
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-slate-900">
                {editingId ? 'Edit Order' : 'New Order'}
              </h2>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                aria-label="Close modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal form */}
            <form onSubmit={handleSubmit} className="space-y-4 p-6">
              {formError && (
                <div
                  className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700"
                  role="alert"
                >
                  {formError}
                </div>
              )}

              {/* Platform */}
              <div>
                <label
                  htmlFor="platform"
                  className="mb-1 block text-sm font-medium text-slate-700"
                >
                  Platform
                </label>
                <select
                  id="platform"
                  value={form.platform}
                  onChange={(e) => handleChange('platform', e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  {platforms.map((platform) => (
                    <option key={platform} value={platform}>
                      {platform}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status */}
              <div>
                <label
                  htmlFor="status"
                  className="mb-1 block text-sm font-medium text-slate-700"
                >
                  Status
                </label>
                <select
                  id="status"
                  value={form.status}
                  onChange={(e) => handleChange('status', e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  {statuses.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>

              {/* Total Amount */}
              <div>
                <label
                  htmlFor="totalAmount"
                  className="mb-1 block text-sm font-medium text-slate-700"
                >
                  Total Amount (₱)
                </label>
                <input
                  id="totalAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.totalAmount}
                  onChange={(e) => handleChange('totalAmount', e.target.value)}
                  placeholder="0.00"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Modal actions */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  {saving
                    ? 'Saving…'
                    : editingId
                      ? 'Save Changes'
                      : 'Add Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}


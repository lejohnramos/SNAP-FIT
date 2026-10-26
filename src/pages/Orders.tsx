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
import type { LucideIcon } from 'lucide-react'
import { supabase } from '../lib/supabase'

/** Recognized sales platforms (mirrors the schema CHECK constraint). */
type Platform = 'Shopee' | 'Lazada' | 'FB'

/** Recognized order statuses shown in the app. */
type OrderStatus = 'Pending' | 'Shipped' | 'Completed' | 'Cancelled'

/**
 * Shape of a row from the Supabase `orders` table, joined with the
 * referenced product's name. Columns are snake_case, mirroring
 * schema.sql exactly.
 */
interface OrderRow {
  id: string
  platform: string
  status: string
  total_amount: number
  product_id: string | null
  quantity: number | null
  created_at: string
  /** Joined via `product:products(name)`; null when the product is gone. */
  product: { name: string } | null
}

/** Minimal product shape used by the order form and stock updates. */
interface ProductOption {
  id: string
  name: string
  price: number | null
  stock_level: number
}

/** State for the New Order modal form. */
interface OrderForm {
  productId: string
  quantity: string
  platform: Platform
  status: OrderStatus
}

/** Summary card descriptor. */
interface SummaryCard {
  title: string
  value: string
  caption: string
  icon: LucideIcon
  iconClasses: string
}

/** Tailwind badge classes per platform (with fallback for unknown values). */
const platformStyles: Record<string, string> = {
  Shopee: 'bg-orange-100 text-orange-700',
  Lazada: 'bg-blue-100 text-blue-700',
  FB: 'bg-purple-100 text-purple-700',
}

/** Tailwind badge classes per order status (with fallback for unknown values). */
const statusStyles: Record<string, string> = {
  Pending: 'bg-amber-100 text-amber-700',
  Shipped: 'bg-blue-100 text-blue-700',
  Completed: 'bg-emerald-100 text-emerald-700',
  Cancelled: 'bg-slate-100 text-slate-700',
}

const platforms: Platform[] = ['Shopee', 'Lazada', 'FB']
const statuses: OrderStatus[] = ['Pending', 'Shipped', 'Completed', 'Cancelled']

/** Blank form state used to (re)initialize the modal. */
const emptyForm: OrderForm = {
  productId: '',
  quantity: '',
  platform: 'Shopee',
  status: 'Pending',
}

/** Format a number as Philippine pesos. */
const formatPeso = (value: number) =>
  new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 2,
  }).format(value)

/**
 * Orders page: sales orders backed by the Supabase `orders` table.
 * Adding an order subtracts the ordered quantity from the selected
 * product's `stock_level`; editing/deleting reconciles stock so the
 * inventory page always matches.
 */
export default function Orders() {
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [products, setProducts] = useState<ProductOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Table filters (applied client-side).
  const [platformFilter, setPlatformFilter] = useState<'All' | Platform>('All')
  const [statusFilter, setStatusFilter] = useState<'All' | OrderStatus>('All')

  // Modal state.
  const [isModalOpen, setIsModalOpen] = useState(false)
  /** The order being edited, or null when adding a new one. */
  const [editingOrder, setEditingOrder] = useState<OrderRow | null>(null)
  const [form, setForm] = useState<OrderForm>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  /** Fetch orders from Supabase, newest first (used on mount and after inserts). */
  const fetchOrders = useCallback(async () => {
    const { data, error: fetchError } = await supabase
      .from('orders')
      .select('*, product:products(name)')
      .order('created_at', { ascending: false })
      .limit(1000)
    if (fetchError) {
      setError(fetchError.message)
    } else {
      setOrders((data as OrderRow[]) ?? [])
    }
  }, [])

  /** Fetch the product list used by the order form and stock updates. */
  const fetchProducts = useCallback(async () => {
    const { data, error: fetchError } = await supabase
      .from('products')
      .select('id, name, price, stock_level')
      .order('name', { ascending: true })
    if (fetchError) {
      setError(fetchError.message)
    } else {
      setProducts((data as ProductOption[]) ?? [])
    }
  }, [])

  // Load orders and products once on mount.
  useEffect(() => {
    setLoading(true)
    setError(null)
    void Promise.all([fetchOrders(), fetchProducts()]).finally(() => setLoading(false))
  }, [fetchOrders, fetchProducts])

  /** Re-run both fetches after a failure ("Try Again"). */
  const handleRetry = useCallback(async () => {
    setLoading(true)
    setError(null)
    await Promise.all([fetchOrders(), fetchProducts()])
    setLoading(false)
  }, [fetchOrders, fetchProducts])

  // Derived: key metrics computed from the full (unfiltered) list.
  const totalOrders = orders.length
  const completedRevenue = orders
    .filter((order) => order.status === 'Completed')
    .reduce((sum, order) => sum + (order.total_amount ?? 0), 0)
  const pendingOrders = orders.filter((order) => order.status === 'Pending').length

  const summaryCards: SummaryCard[] = [
    {
      title: 'Total Orders',
      value: String(totalOrders),
      caption: 'All time',
      icon: ShoppingCart,
      iconClasses: 'bg-indigo-100 text-indigo-600',
    },
    {
      title: 'Completed Revenue',
      value: formatPeso(completedRevenue),
      caption: 'From completed orders',
      icon: DollarSign,
      iconClasses: 'bg-emerald-100 text-emerald-600',
    },
    {
      title: 'Pending Orders',
      value: String(pendingOrders),
      caption: 'Awaiting fulfillment',
      icon: Clock,
      iconClasses: 'bg-amber-100 text-amber-600',
    },
  ]

  // Client-side filtering by platform and status.
  const filteredOrders = useMemo(
    () =>
      orders.filter(
        (order) =>
          (platformFilter === 'All' || order.platform === platformFilter) &&
          (statusFilter === 'All' || order.status === statusFilter),
      ),
    [orders, platformFilter, statusFilter],
  )

  /** Current local stock level for a product id. */
  const stockOf = (productId: string): number =>
    products.find((p) => p.id === productId)?.stock_level ?? 0

  /** Patch a product's stock level in local state. */
  const setStock = (productId: string, level: number) =>
    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, stock_level: level } : p)),
    )

  /**
   * Persist a product's stock level to Supabase and mirror it in local
   * state. Returns false (and raises the page error banner) on failure.
   */
  const persistStock = async (productId: string, newLevel: number) => {
    const { error: stockError } = await supabase
      .from('products')
      .update({ stock_level: newLevel })
      .eq('id', productId)
    if (stockError) {
      setError(`Order saved, but the stock update failed: ${stockError.message}`)
      return false
    }
    setStock(productId, newLevel)
    return true
  }

  const openModal = () => {
    setForm(emptyForm)
    setEditingOrder(null)
    setFormError(null)
    setIsModalOpen(true)
  }

  /** Open the modal pre-filled with an existing order's data. */
  const openEditModal = (order: OrderRow) => {
    setForm({
      productId: order.product_id ?? '',
      quantity: order.quantity === null ? '' : String(order.quantity),
      platform: (platforms as string[]).includes(order.platform)
        ? (order.platform as Platform)
        : 'Shopee',
      status: (statuses as string[]).includes(order.status)
        ? (order.status as OrderStatus)
        : 'Pending',
    })
    setEditingOrder(order)
    setFormError(null)
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingOrder(null)
  }

  /** Generic change handler for every form field. */
  const handleChange = (field: keyof OrderForm, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  /** Selected product, for the live order-total preview in the modal. */
  const selectedProduct = products.find((p) => p.id === form.productId) ?? null
  const previewQuantity = Number(form.quantity)
  const previewTotal =
    selectedProduct && form.quantity !== '' && Number.isFinite(previewQuantity) && previewQuantity > 0
      ? (selectedProduct.price ?? 0) * previewQuantity
      : null

  /**
   * Submit the modal form. When `editingOrder` is set this performs an
   * UPDATE on the existing row and reconciles stock; otherwise it
   * INSERTs a new order and then subtracts the ordered quantity from
   * the selected product's `stock_level`.
   */
  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setFormError(null)

    // Validate the product and quantity before touching the database.
    if (!form.productId) {
      setFormError('Please select a product.')
      return
    }
    const quantity = Number(form.quantity)
    if (!form.quantity || !Number.isInteger(quantity) || quantity < 1) {
      setFormError('Quantity must be a whole number of at least 1.')
      return
    }
    const product = products.find((p) => p.id === form.productId)
    if (!product) {
      setFormError('The selected product could not be found. Please refresh and try again.')
      return
    }

    setSaving(true)
    // Total amount is derived from the product's selling price.
    const total = (product.price ?? 0) * quantity

    if (editingOrder) {
      // ---- EDIT: update the order row, then reconcile stock levels ----
      const { data, error: updateError } = await supabase
        .from('orders')
        .update({
          platform: form.platform,
          status: form.status,
          product_id: form.productId,
          quantity,
          total_amount: total,
        })
        .eq('id', editingOrder.id)
        .select('*, product:products(name)')
        .single()
      if (updateError) {
        setSaving(false)
        setFormError(updateError.message)
        return
      }
      setOrders((prev) =>
        prev.map((order) => (order.id === editingOrder.id ? data : order)),
      )

      // Reconcile stock: return the old quantity, then subtract the new one.
      const oldProductId = editingOrder.product_id
      const oldQuantity = editingOrder.quantity ?? 0
      if (oldProductId === form.productId) {
        const delta = quantity - oldQuantity
        if (delta !== 0) {
          await persistStock(form.productId, stockOf(form.productId) - delta)
        }
      } else {
        if (oldProductId) {
          await persistStock(oldProductId, stockOf(oldProductId) + oldQuantity)
        }
        await persistStock(form.productId, stockOf(form.productId) - quantity)
      }
      setSaving(false)
    } else {
      // ---- ADD: insert the order first... ----
      const { error: insertError } = await supabase.from('orders').insert([
        {
          platform: form.platform,
          status: form.status,
          product_id: form.productId,
          quantity,
          total_amount: total,
        },
      ])
      if (insertError) {
        setSaving(false)
        setFormError(insertError.message)
        return
      }

      // ---- CRUCIAL: ...then subtract the ordered quantity from stock ----
      await persistStock(form.productId, product.stock_level - quantity)

      // Refresh so the new order appears in its server-sorted position.
      await fetchOrders()
      setSaving(false)
    }
    closeModal()
  }

  /**
   * Delete an order after an explicit confirmation. The row is removed
   * from local state immediately, and the ordered quantity is returned
   * to the product's stock so inventory stays accurate.
   */
  const handleDelete = async (order: OrderRow) => {
    const confirmed = window.confirm('Are you sure you want to delete this order?')
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

    // Return the ordered quantity to stock so inventory stays accurate.
    if (order.product_id && order.quantity) {
      await persistStock(order.product_id, stockOf(order.product_id) + order.quantity)
    }
  }

  return (
    <div>
      {/* Page header + primary action */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Orders</h1>
          <p className="mt-1 text-sm text-slate-500">
            Track sales from Shopee, Lazada, and Facebook. New orders automatically
            reduce stock.
          </p>
        </div>
        <button
          type="button"
          onClick={openModal}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" />
          New Order
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-6 flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm text-red-700">{error}</p>
          <button
            type="button"
            onClick={() => void handleRetry()}
            className="ml-4 inline-flex items-center gap-1.5 rounded-md border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Try Again
          </button>
        </div>
      )}

      {/* Summary cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {summaryCards.map((card) => (
          <div
            key={card.title}
            className="flex items-center justify-between rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200"
          >
            <div>
              <p className="text-sm font-medium text-slate-500">{card.title}</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{card.value}</p>
              <p className="mt-1 text-xs text-slate-400">{card.caption}</p>
            </div>
            <div className={`rounded-full p-3 ${card.iconClasses}`}>
              <card.icon className="h-5 w-5" />
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <select
          value={platformFilter}
          onChange={(e) => setPlatformFilter(e.target.value as 'All' | Platform)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          aria-label="Filter by platform"
        >
          <option value="All">All Platforms</option>
          {platforms.map((platform) => (
            <option key={platform} value={platform}>
              {platform}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'All' | OrderStatus)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          aria-label="Filter by status"
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

      {/* Orders table */}
      <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
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
                Product Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Quantity
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Status
              </th>
              <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                Total Amount
              </th>
              <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-indigo-600" />
                </td>
              </tr>
            )}
            {!loading && orders.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-6 py-12 text-center text-sm text-slate-500"
                >
                  No orders yet — add your first one!
                </td>
              </tr>
            )}
            {!loading && orders.length > 0 && filteredOrders.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-6 py-12 text-center text-sm text-slate-500"
                >
                  No orders match the selected filters.
                </td>
              </tr>
            )}
            {!loading &&
              filteredOrders.map((order) => (
                <tr key={order.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 text-xs font-medium text-slate-500">
                    {order.id.slice(0, 8)}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${platformStyles[order.platform] ?? 'bg-slate-100 text-slate-700'}`}
                    >
                      {order.platform}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-slate-900">
                    {order.product?.name ?? '—'}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">
                    {order.quantity ?? '—'}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyles[order.status] ?? 'bg-slate-100 text-slate-700'}`}
                    >
                      {order.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-semibold text-slate-900">
                    {formatPeso(order.total_amount)}
                  </td>
                  {/* Row actions: edit and delete */}
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => openEditModal(order)}
                        title="Edit order"
                        className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-indigo-600"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDelete(order)}
                        title="Delete order"
                        className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600"
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

      {/* New/Edit Order modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          onClick={closeModal}
        >
          <div
            className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">
                {editingOrder ? 'Edit Order' : 'New Order'}
              </h2>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* In-modal error (save failures) */}
            {formError && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {/* Product */}
              <div className="mb-4">
                <label
                  htmlFor="product"
                  className="mb-1 block text-sm font-medium text-slate-700"
                >
                  Product
                </label>
                <select
                  id="product"
                  value={form.productId}
                  onChange={(e) => handleChange('productId', e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="">Select a product…</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} (stock: {product.stock_level})
                    </option>
                  ))}
                </select>
              </div>


              {/* Quantity & Platform */}
              <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="quantity"
                    className="mb-1 block text-sm font-medium text-slate-700"
                  >
                    Quantity
                  </label>
                  <input
                    id="quantity"
                    type="number"
                    min="1"
                    step="1"
                    value={form.quantity}
                    onChange={(e) => handleChange('quantity', e.target.value)}
                    placeholder="1"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
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
              </div>

              {/* Status */}
              <div className="mb-4">
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

              {/* Live order-total preview */}
              {previewTotal !== null && (
                <div className="mb-4 rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-700 ring-1 ring-slate-200">
                  Order total: <span className="font-semibold">{formatPeso(previewTotal)}</span>
                  <span className="ml-1 text-xs text-slate-400">(price × quantity)</span>
                </div>
              )}

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
                  {saving ? 'Saving…' : editingOrder ? 'Save Changes' : 'Add Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

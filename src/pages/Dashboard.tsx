import { useEffect, useState } from 'react'
import { AlertTriangle, Clock, DollarSign, Loader2, RefreshCw } from 'lucide-react'
import { supabase } from '../lib/supabase'

/** Shape of a row from the Supabase `orders` table. */
interface OrderRow {
  id: string
  platform: string
  status: string
  total_amount: number
  created_at: string
}

/** Minimal product shape used for the low-stock metric. */
interface ProductStock {
  id: string
  stock_level: number
  reorder_point: number
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
 * Dashboard page: KPI summary cards and a recent orders table, all
 * backed by real data from the Supabase `orders` and `products` tables.
 */
export default function Dashboard() {
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [products, setProducts] = useState<ProductStock[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  /** Fetch orders (recent first) and product stock levels from Supabase. */
  const fetchData = async () => {
    setLoading(true)
    setError(null)
    // Limit keeps the payload sane; raised later when orders grow.
    const [ordersRes, productsRes] = await Promise.all([
      supabase
        .from('orders')
        .select('id, platform, status, total_amount, created_at')
        .order('created_at', { ascending: false })
        .limit(1000),
      supabase.from('products').select('id, stock_level, reorder_point'),
    ])
    if (ordersRes.error || productsRes.error) {
      setError(ordersRes.error?.message ?? productsRes.error?.message ?? null)
    } else {
      setOrders((ordersRes.data as OrderRow[]) ?? [])
      setProducts((productsRes.data as ProductStock[]) ?? [])
    }
    setLoading(false)
  }

  useEffect(() => {
    void fetchData()
  }, [])

  // Derived metrics, computed from the fetched rows.
  const totalSales = orders
    .filter((o) => o.status === 'Completed')
    .reduce((sum, o) => sum + (o.total_amount ?? 0), 0)
  const pendingOrders = orders.filter((o) => o.status === 'Pending').length
  const lowStock = products.filter(
    (p) => p.stock_level <= p.reorder_point,
  ).length
  const recentOrders = orders.slice(0, 5)

  const summaryCards: SummaryCard[] = [
    {
      title: 'Total Sales',
      value: formatPeso(totalSales),
      subtitle: 'Completed orders',
      icon: DollarSign,
      accent: 'bg-emerald-500',
    },
    {
      title: 'Low Stock Alerts',
      value: String(lowStock),
      subtitle: 'Collectibles at/below reorder point',
      icon: AlertTriangle,
      accent: 'bg-amber-500',
    },
    {
      title: 'Pending Orders',
      value: String(pendingOrders),
      subtitle: 'Awaiting payment confirmation',
      icon: Clock,
      accent: 'bg-blue-500',
    },
  ]

  return (
    <div>
      {/* Page header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">
            Overview of sales, stock health, and pending orders.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void fetchData()}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-6 rounded-xl bg-red-50 px-6 py-4 text-sm text-red-700">
          Failed to load dashboard data: {error}
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {summaryCards.map(({ title, value, subtitle, icon: Icon, accent }) => (
          <div
            key={title}
            className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">{title}</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
                <p className="mt-1 text-xs text-slate-400">{subtitle}</p>
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

      {/* Recent orders */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-slate-900">Recent Orders</h2>
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
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-indigo-600" />
                  </td>
                </tr>
              )}
              {!loading && recentOrders.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-12 text-center text-sm text-slate-500"
                  >
                    No orders yet.
                  </td>
                </tr>
              )}
              {!loading &&
                recentOrders.map((order) => (
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
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

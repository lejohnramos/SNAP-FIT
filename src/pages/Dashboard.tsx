import { AlertTriangle, Clock, DollarSign } from 'lucide-react'

/** Summary card data — mock values, to be replaced with Supabase queries later. */
const summaryCards = [
  {
    title: 'Total Sales',
    value: '₱48,250.00',
    subtitle: '+12.5% vs last month',
    icon: DollarSign,
    accent: 'bg-emerald-500',
  },
  {
    title: 'Low Stock Alerts',
    value: '7',
    subtitle: '4 collectibles below reorder point',
    icon: AlertTriangle,
    accent: 'bg-amber-500',
  },
  {
    title: 'Pending Orders',
    value: '14',
    subtitle: '6 awaiting payment confirmation',
    icon: Clock,
    accent: 'bg-blue-500',
  },
]

/** Supported sales platforms. */
type Platform = 'Shopee' | 'Lazada' | 'FB'

/** Order lifecycle statuses. */
type OrderStatus = 'Completed' | 'Shipped' | 'Pending' | 'Cancelled'

/** Shape of a recent order row (mirrors the `orders` table). */
interface RecentOrder {
  id: string
  platform: Platform
  status: OrderStatus
  total: number
}

/** Mock recent orders — will come from the `orders` table later. */
const recentOrders: RecentOrder[] = [
  { id: 'ORD-1042', platform: 'Shopee', status: 'Completed', total: 1250.0 },
  { id: 'ORD-1041', platform: 'Lazada', status: 'Shipped', total: 890.0 },
  { id: 'ORD-1040', platform: 'FB', status: 'Pending', total: 2100.0 },
  { id: 'ORD-1039', platform: 'Shopee', status: 'Completed', total: 450.0 },
  { id: 'ORD-1038', platform: 'Lazada', status: 'Cancelled', total: 3200.0 },
]

/** Tailwind badge classes per order status. */
const statusStyles: Record<OrderStatus, string> = {
  Completed: 'bg-emerald-100 text-emerald-700',
  Shipped: 'bg-blue-100 text-blue-700',
  Pending: 'bg-amber-100 text-amber-700',
  Cancelled: 'bg-red-100 text-red-700',
}

/** Tailwind badge classes per platform. */
const platformStyles: Record<Platform, string> = {
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

/**
 * Dashboard page: high-level KPI summary cards and a recent orders table.
 */
export default function Dashboard() {
  return (
    <div>
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">
          Overview of sales, stock health, and pending orders.
        </p>
      </div>

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
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Total
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentOrders.map((order) => (
                <tr key={order.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 text-sm font-medium text-slate-900">
                    {order.id}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${platformStyles[order.platform]}`}
                    >
                      {order.platform}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyles[order.status]}`}
                    >
                      {order.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-medium text-slate-900">
                    {formatPeso(order.total)}
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

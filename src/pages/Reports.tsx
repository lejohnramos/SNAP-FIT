import { useEffect, useMemo, useState } from 'react'
import { BarChart3, Calendar, Loader2, RefreshCw, ShoppingBag, TrendingUp } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface OrderRow {
  id: string
  platform: string
  status: string
  total_amount: number
  quantity: number | null
  created_at: string
  product: { name: string } | null
}

type DateFilter = 'Today' | 'This Week' | 'This Month'

const formatPeso = (value: number) =>
  new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 2,
  }).format(value)

function isInDateRange(dateStr: string, filter: DateFilter): boolean {
  const date = new Date(dateStr)
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  if (filter === 'Today') {
    return date >= startOfToday
  }
  if (filter === 'This Week') {
    const day = now.getDay()
    const diffToMonday = (day + 6) % 7
    const startOfWeek = new Date(startOfToday)
    startOfWeek.setDate(startOfToday.getDate() - diffToMonday)
    return date >= startOfWeek
  }
  if (filter === 'This Month') {
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    return date >= startOfMonth
  }
  return true
}

export default function Reports() {
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dateFilter, setDateFilter] = useState<DateFilter>('This Month')

  const fetchOrders = async () => {
    setLoading(true)
    setError(null)
    const { data, error: fetchError } = await supabase
      .from('orders')
      .select('id, platform, status, total_amount, quantity, created_at, product:products(name)')
      .in('status', ['Completed', 'Delivered'])
    if (fetchError) {
      setError(fetchError.message)
    } else {
      setOrders((data as unknown as OrderRow[]) ?? [])
    }
    setLoading(false)
  }

  useEffect(() => {
    void fetchOrders()
  }, [])

  const filteredOrders = useMemo(
    () => orders.filter((o) => isInDateRange(o.created_at, dateFilter)),
    [orders, dateFilter],
  )

  const totalRevenue = filteredOrders.reduce((sum, o) => sum + (o.total_amount ?? 0), 0)
  const totalOrders = filteredOrders.length

  const platformTotals = filteredOrders.reduce<Record<string, number>>((acc, order) => {
    const platform = order.platform || 'Other'
    acc[platform] = (acc[platform] ?? 0) + (order.total_amount ?? 0)
    return acc
  }, {})

  const platforms = ['Shopee', 'Lazada', 'Facebook']
  platforms.forEach((p) => {
    if (platformTotals[p] === undefined) platformTotals[p] = 0
  })
  Object.keys(platformTotals).forEach((p) => {
    if (!platforms.includes(p)) platforms.push(p)
  })

  const maxTotal = Math.max(1, ...Object.values(platformTotals))

  const colors: Record<string, string> = {
    Shopee: 'bg-orange-500',
    Lazada: 'bg-blue-500',
    Facebook: 'bg-purple-500',
    FB: 'bg-purple-500',
    Other: 'bg-slate-500',
  }

  const productSales = useMemo(() => {
    const map = new Map<string, number>()
    filteredOrders.forEach((o) => {
      const name = o.product?.name
      if (!name) return
      const qty = o.quantity ?? 0
      if (qty <= 0) return
      map.set(name, (map.get(name) ?? 0) + qty)
    })
    return Array.from(map.entries()).map(([name, qty]) => ({ name, qty }))
  }, [filteredOrders])

  const bestSellers = [...productSales].sort((a, b) => b.qty - a.qty).slice(0, 3)
  const slowMoving = [...productSales].filter((p) => p.qty > 0).sort((a, b) => a.qty - b.qty).slice(0, 3)

  const filters: DateFilter[] = ['Today', 'This Week', 'This Month']

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
          <p className="mt-1 text-sm text-slate-500">
            Sales performance and product insights.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
            {filters.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setDateFilter(f)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  dateFilter === f
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => void fetchOrders()}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors duration-200 hover:bg-slate-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-xl bg-red-50 px-6 py-4 text-sm text-red-700">
          Failed to load reports: {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center rounded-xl bg-white p-12 shadow-sm ring-1 ring-slate-200">
          <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Sales Summary */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">Total Revenue</p>
                  <p className="mt-2 text-2xl font-bold text-slate-900">{formatPeso(totalRevenue)}</p>
                  <p className="mt-1 text-xs text-slate-400">{dateFilter}</p>
                </div>
                <div className="rounded-full bg-emerald-100 p-3 text-emerald-600">
                  <TrendingUp className="h-5 w-5" />
                </div>
              </div>
            </div>
            <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">Total Orders</p>
                  <p className="mt-2 text-2xl font-bold text-slate-900">{totalOrders}</p>
                  <p className="mt-1 text-xs text-slate-400">{dateFilter}</p>
                </div>
                <div className="rounded-full bg-indigo-100 p-3 text-indigo-600">
                  <ShoppingBag className="h-5 w-5" />
                </div>
              </div>
            </div>
          </div>

          {/* Best Sellers & Slow Moving */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <h2 className="mb-4 text-lg font-semibold text-slate-900">Best Sellers</h2>
              {bestSellers.length === 0 ? (
                <p className="text-sm text-slate-500">No sales data for this period.</p>
              ) : (
                <ul className="space-y-3">
                  {bestSellers.map((p, i) => (
                    <li key={p.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-xs font-semibold text-emerald-700">
                          {i + 1}
                        </span>
                        <span className="text-sm text-slate-700">{p.name}</span>
                      </div>
                      <span className="text-sm font-medium text-slate-900">{p.qty} sold</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <h2 className="mb-4 text-lg font-semibold text-slate-900">Slow-Moving Items</h2>
              {slowMoving.length === 0 ? (
                <p className="text-sm text-slate-500">No sales data for this period.</p>
              ) : (
                <ul className="space-y-3">
                  {slowMoving.map((p, i) => (
                    <li key={p.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 text-xs font-semibold text-amber-700">
                          {i + 1}
                        </span>
                        <span className="text-sm text-slate-700">{p.name}</span>
                      </div>
                      <span className="text-sm font-medium text-slate-900">{p.qty} sold</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Platform Breakdown */}
          <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <div className="mb-4 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-indigo-600" />
              <h2 className="text-lg font-semibold text-slate-900">Sales by Platform</h2>
            </div>
            <p className="mb-6 text-sm text-slate-500">
              {dateFilter} total: <span className="font-semibold text-slate-900">{formatPeso(totalRevenue)}</span>
            </p>
            <div className="space-y-4">
              {platforms.map((platform) => {
                const value = platformTotals[platform] ?? 0
                const pct = (value / maxTotal) * 100
                const count = filteredOrders.filter((o) => o.platform === platform).length
                return (
                  <div key={platform}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-700">
                        {platform} <span className="text-slate-400">({count} orders)</span>
                      </span>
                      <span className="text-slate-500">{formatPeso(value)}</span>
                    </div>
                    <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`h-full rounded-full ${colors[platform] ?? 'bg-indigo-500'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
            {filteredOrders.length === 0 && (
              <p className="mt-6 text-center text-sm text-slate-500">
                No completed or delivered orders for this period.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

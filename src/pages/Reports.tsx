import { useEffect, useState } from 'react'
import { BarChart3, Loader2, RefreshCw } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface OrderRow {
  id: string
  platform: string
  status: string
  total_amount: number
}

const formatPeso = (value: number) =>
  new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 2,
  }).format(value)

export default function Reports() {
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchOrders = async () => {
    setLoading(true)
    setError(null)
    const { data, error: fetchError } = await supabase
      .from('orders')
      .select('id, platform, status, total_amount')
      .in('status', ['Completed', 'Delivered'])
    if (fetchError) {
      setError(fetchError.message)
    } else {
      setOrders((data as OrderRow[]) ?? [])
    }
    setLoading(false)
  }

  useEffect(() => {
    void fetchOrders()
  }, [])

  const platformTotals = orders.reduce<Record<string, number>>((acc, order) => {
    const platform = order.platform || 'Other'
    acc[platform] = (acc[platform] ?? 0) + (order.total_amount ?? 0)
    return acc
  }, {})

  const platforms = ['Shopee', 'Lazada', 'Facebook']
  platforms.forEach((p) => {
    if (platformTotals[p] === undefined) platformTotals[p] = 0
  })
  // include any other platforms present
  Object.keys(platformTotals).forEach((p) => {
    if (!platforms.includes(p)) platforms.push(p)
  })

  const maxTotal = Math.max(1, ...Object.values(platformTotals))
  const totalAll = Object.values(platformTotals).reduce((a, b) => a + b, 0)

  const colors: Record<string, string> = {
    Shopee: 'bg-orange-500',
    Lazada: 'bg-blue-500',
    Facebook: 'bg-purple-500',
    FB: 'bg-purple-500',
    Other: 'bg-slate-500',
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
          <p className="mt-1 text-sm text-slate-500">
            Sales performance by platform (Completed & Delivered orders).
          </p>
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {['Shopee', 'Lazada', 'Facebook'].map((platform) => (
              <div
                key={platform}
                className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200"
              >
                <p className="text-sm font-medium text-slate-500">{platform}</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">
                  {formatPeso(platformTotals[platform] ?? 0)}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  {orders.filter((o) => o.platform === platform).length} completed orders
                </p>
              </div>
            ))}
          </div>

          <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <div className="mb-4 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-indigo-600" />
              <h2 className="text-lg font-semibold text-slate-900">Sales by Platform</h2>
            </div>
            <p className="mb-6 text-sm text-slate-500">
              Total completed sales: <span className="font-semibold text-slate-900">{formatPeso(totalAll)}</span>
            </p>
            <div className="space-y-4">
              {platforms.map((platform) => {
                const value = platformTotals[platform] ?? 0
                const pct = (value / maxTotal) * 100
                return (
                  <div key={platform}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-700">{platform}</span>
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
            {orders.length === 0 && (
              <p className="mt-6 text-center text-sm text-slate-500">
                No completed or delivered orders yet.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

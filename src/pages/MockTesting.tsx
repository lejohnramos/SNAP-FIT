import { useState } from 'react'
import { FlaskConical, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function MockTesting() {
  const [loadingShopee, setLoadingShopee] = useState(false)
  const [loadingLazada, setLoadingLazada] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const showToast = (message: string) => {
    setToast(message)
    setTimeout(() => setToast(null), 3000)
  }

  const simulateOrder = async (platform: 'Shopee' | 'Lazada') => {
    if (platform === 'Shopee') setLoadingShopee(true)
    else setLoadingLazada(true)

    try {
      // Get product GUN-001
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('id, stock_level, price')
        .eq('sku', 'GUN-001')
        .single()

      if (productError || !product) {
        showToast('Error: Product GUN-001 not found')
        return
      }

      const quantity = 1
      const totalAmount = (product.price ?? 0) * quantity

      // Insert order
      const { error: orderError } = await supabase.from('orders').insert([
        {
          platform,
          status: 'Pending',
          product_id: product.id,
          quantity,
          total_amount: totalAmount,
          order_type: 'Standard',
        },
      ])

      if (orderError) {
        showToast('Error: Failed to create order')
        return
      }

      // Deduct stock
      const { error: stockError } = await supabase
        .from('products')
        .update({ stock_level: product.stock_level - quantity })
        .eq('id', product.id)

      if (stockError) {
        showToast('Order created but stock update failed')
        return
      }

      showToast(`${platform} order simulated successfully!`)
    } catch (error) {
      showToast('Error: Unexpected failure')
    } finally {
      if (platform === 'Shopee') setLoadingShopee(false)
      else setLoadingLazada(false)
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Developer Testing: API Webhook Simulation</h1>
        <p className="mt-1 text-sm text-slate-500">
          Simulate incoming orders from e-commerce platforms for testing.
        </p>
      </div>

      {toast && (
        <div className="mb-6 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700 ring-1 ring-emerald-200">
          {toast}
        </div>
      )}

      <div className="max-w-md rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="mb-4 flex items-center gap-2">
          <FlaskConical className="h-5 w-5 text-indigo-600" />
          <h2 className="text-lg font-semibold text-slate-900">Webhook Simulation</h2>
        </div>
        <p className="mb-6 text-sm text-slate-600">
          Click a button below to simulate a webhook order. This will create an order for SKU GUN-001 and deduct stock.
        </p>
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => void simulateOrder('Shopee')}
            disabled={loadingShopee || loadingLazada}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loadingShopee && <Loader2 className="h-4 w-4 animate-spin" />}
            {loadingShopee ? 'Simulating...' : 'Simulate Shopee Order'}
          </button>
          <button
            type="button"
            onClick={() => void simulateOrder('Lazada')}
            disabled={loadingShopee || loadingLazada}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loadingLazada && <Loader2 className="h-4 w-4 animate-spin" />}
            {loadingLazada ? 'Simulating...' : 'Simulate Lazada Order'}
          </button>
        </div>
      </div>
    </div>
  )
}

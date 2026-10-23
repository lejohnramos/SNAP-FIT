import { ShoppingCart } from 'lucide-react'

/** Orders page — placeholder, to be built in a later milestone. */
export default function Orders() {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
      <ShoppingCart className="mx-auto h-12 w-12 text-slate-300" />
      <h2 className="mt-4 text-lg font-semibold text-slate-900">Orders</h2>
      <p className="mt-1 text-sm text-slate-500">
        Order tracking across Shopee, Lazada, and Facebook will be built here.
      </p>
    </div>
  )
}

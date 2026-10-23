import { Truck } from 'lucide-react'

/** Procurement page — placeholder, to be built in a later milestone. */
export default function Procurement() {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
      <Truck className="mx-auto h-12 w-12 text-slate-300" />
      <h2 className="mt-4 text-lg font-semibold text-slate-900">Procurement</h2>
      <p className="mt-1 text-sm text-slate-500">
        Purchase orders and supplier restocking workflows will be built here.
      </p>
    </div>
  )
}

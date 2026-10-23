import { BarChart3 } from 'lucide-react'

/** Reports page — placeholder, to be built in a later milestone. */
export default function Reports() {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
      <BarChart3 className="mx-auto h-12 w-12 text-slate-300" />
      <h2 className="mt-4 text-lg font-semibold text-slate-900">Reports</h2>
      <p className="mt-1 text-sm text-slate-500">
        Sales, stock movement, and profitability reports will be built here.
      </p>
    </div>
  )
}

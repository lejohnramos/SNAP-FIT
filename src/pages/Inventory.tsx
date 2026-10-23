import { useState } from 'react'
import type { FormEvent } from 'react'
import { AlertTriangle, Plus, X } from 'lucide-react'

/** Recognized condition grades for collectibles. */
type ConditionGrade =
  | 'Mint'
  | 'Near Mint'
  | 'Excellent'
  | 'Good'
  | 'Fair'
  | 'Poor'

/** Shape of an inventory row (mirrors the `products` table). */
interface Product {
  id: number
  name: string
  conditionGrade: ConditionGrade
  edition: string
  stockLevel: number
  reorderPoint: number
}

/** State for the "Add New Collectible" modal form. */
interface CollectibleForm {
  name: string
  conditionGrade: ConditionGrade
  edition: string
  variation: string
  cost: string
  price: string
  stockLevel: string
  reorderPoint: string
}

/** Tailwind badge classes per condition grade. */
const conditionStyles: Record<ConditionGrade, string> = {
  Mint: 'bg-emerald-100 text-emerald-700',
  'Near Mint': 'bg-green-100 text-green-700',
  Excellent: 'bg-blue-100 text-blue-700',
  Good: 'bg-amber-100 text-amber-700',
  Fair: 'bg-orange-100 text-orange-700',
  Poor: 'bg-red-100 text-red-700',
}

/** Mock inventory — will come from the `products` table later. */
const mockProducts: Product[] = [
  {
    id: 1,
    name: 'Iron Man MK-85 Figure',
    conditionGrade: 'Mint',
    edition: 'First Release',
    stockLevel: 12,
    reorderPoint: 5,
  },
  {
    id: 2,
    name: 'Spider-Man Noir Bust',
    conditionGrade: 'Near Mint',
    edition: 'Limited 500',
    stockLevel: 3,
    reorderPoint: 5,
  },
  {
    id: 3,
    name: 'Batman Hush Statue',
    conditionGrade: 'Mint',
    edition: "Collector's Edition",
    stockLevel: 8,
    reorderPoint: 3,
  },
  {
    id: 4,
    name: 'Gundam RX-78-2 Model Kit',
    conditionGrade: 'Excellent',
    edition: 'Standard',
    stockLevel: 25,
    reorderPoint: 10,
  },
  {
    id: 5,
    name: 'Darth Vader Helmet Replica',
    conditionGrade: 'Good',
    edition: 'Anniversary',
    stockLevel: 2,
    reorderPoint: 4,
  },
]

/** Blank form state used to (re)initialize the modal. */
const emptyForm: CollectibleForm = {
  name: '',
  conditionGrade: 'Mint',
  edition: '',
  variation: '',
  cost: '',
  price: '',
  stockLevel: '',
  reorderPoint: '',
}

/**
 * Inventory page: collectibles data table plus an "Add New Collectible"
 * modal form (UI only — database insert logic comes later).
 */
export default function Inventory() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [form, setForm] = useState<CollectibleForm>(emptyForm)

  /** Open the modal with a fresh, empty form. */
  const openModal = () => {
    setForm(emptyForm)
    setIsModalOpen(true)
  }

  const closeModal = () => setIsModalOpen(false)

  /** Generic change handler for every form field. */
  const handleChange = (field: keyof CollectibleForm, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  /**
   * Placeholder submit handler — the Supabase insert logic will be
   * wired up in a later step. For now we just log and close the modal.
   */
  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    console.log('New collectible (UI only, no DB insert yet):', form)
    closeModal()
  }

  return (
    <div>
      {/* Page header + primary action */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Inventory</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage your collectible stock levels and reorder points.
          </p>
        </div>
        <button
          type="button"
          onClick={openModal}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          <Plus className="h-4 w-4" />
          Add New Collectible
        </button>
      </div>

      {/* Inventory data table */}
      <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Product Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Condition
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Edition
              </th>
              <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                Stock Level
              </th>
              <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                Reorder Point
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {mockProducts.map((product) => {
              const isLowStock = product.stockLevel <= product.reorderPoint
              return (
                <tr key={product.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 text-sm font-medium text-slate-900">
                    {product.name}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${conditionStyles[product.conditionGrade]}`}
                    >
                      {product.conditionGrade}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">
                    {product.edition}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span
                      className={`inline-flex items-center gap-1.5 text-sm font-semibold ${
                        isLowStock ? 'text-red-600' : 'text-slate-900'
                      }`}
                    >
                      {isLowStock && <AlertTriangle className="h-4 w-4" />}
                      {product.stockLevel}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right text-sm text-slate-500">
                    {product.reorderPoint}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Add New Collectible modal */}
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
                Add New Collectible
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
              {/* Name */}
              <div>
                <label
                  htmlFor="name"
                  className="mb-1 block text-sm font-medium text-slate-700"
                >
                  Name
                </label>
                <input
                  id="name"
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="e.g. Iron Man MK-85 Figure"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Condition Grade */}
              <div>
                <label
                  htmlFor="conditionGrade"
                  className="mb-1 block text-sm font-medium text-slate-700"
                >
                  Condition Grade
                </label>
                <select
                  id="conditionGrade"
                  value={form.conditionGrade}
                  onChange={(e) =>
                    handleChange('conditionGrade', e.target.value as ConditionGrade)
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  {(Object.keys(conditionStyles) as ConditionGrade[]).map(
                    (grade) => (
                      <option key={grade} value={grade}>
                        {grade}
                      </option>
                    ),
                  )}
                </select>
              </div>

              {/* Edition & Variation */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="edition"
                    className="mb-1 block text-sm font-medium text-slate-700"
                  >
                    Edition
                  </label>
                  <input
                    id="edition"
                    type="text"
                    value={form.edition}
                    onChange={(e) => handleChange('edition', e.target.value)}
                    placeholder="e.g. First Release"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label
                    htmlFor="variation"
                    className="mb-1 block text-sm font-medium text-slate-700"
                  >
                    Variation
                  </label>
                  <input
                    id="variation"
                    type="text"
                    value={form.variation}
                    onChange={(e) => handleChange('variation', e.target.value)}
                    placeholder="e.g. Chrome Variant"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Cost & Price */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="cost"
                    className="mb-1 block text-sm font-medium text-slate-700"
                  >
                    Cost (₱)
                  </label>
                  <input
                    id="cost"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.cost}
                    onChange={(e) => handleChange('cost', e.target.value)}
                    placeholder="0.00"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label
                    htmlFor="price"
                    className="mb-1 block text-sm font-medium text-slate-700"
                  >
                    Price (₱)
                  </label>
                  <input
                    id="price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.price}
                    onChange={(e) => handleChange('price', e.target.value)}
                    placeholder="0.00"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Stock Level & Reorder Point */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="stockLevel"
                    className="mb-1 block text-sm font-medium text-slate-700"
                  >
                    Stock Level
                  </label>
                  <input
                    id="stockLevel"
                    type="number"
                    min="0"
                    value={form.stockLevel}
                    onChange={(e) => handleChange('stockLevel', e.target.value)}
                    placeholder="0"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label
                    htmlFor="reorderPoint"
                    className="mb-1 block text-sm font-medium text-slate-700"
                  >
                    Reorder Point
                  </label>
                  <input
                    id="reorderPoint"
                    type="number"
                    min="0"
                    value={form.reorderPoint}
                    onChange={(e) => handleChange('reorderPoint', e.target.value)}
                    placeholder="0"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Modal actions */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                >
                  Add Collectible
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

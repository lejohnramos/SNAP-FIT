import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { AlertTriangle, Loader2, Pencil, Plus, RefreshCw, Trash2, X } from 'lucide-react'
import { supabase } from '../lib/supabase'

/** Recognized condition grades for collectibles. */
type ConditionGrade =
  | 'Mint'
  | 'Near Mint'
  | 'Excellent'
  | 'Good'
  | 'Fair'
  | 'Poor'

/**
 * Shape of a row from the Supabase `products` table.
 * Columns are snake_case, mirroring schema.sql exactly.
 */
interface Product {
  id: string
  sku: string
  name: string
  condition_grade: string
  edition: string | null
  variation: string | null
  stock_level: number
  reorder_point: number
  cost: number | null
  price: number | null
  created_at: string
}

/** State for the "Add New Collectible" modal form. */
interface CollectibleForm {
  sku: string
  name: string
  conditionGrade: ConditionGrade
  edition: string
  variation: string
  cost: string
  price: string
  stockLevel: string
  reorderPoint: string
}

/** Tailwind badge classes per condition grade (with fallback). */
const conditionStyles: Record<string, string> = {
  Mint: 'bg-emerald-100 text-emerald-700',
  'Near Mint': 'bg-green-100 text-green-700',
  Excellent: 'bg-blue-100 text-blue-700',
  Good: 'bg-amber-100 text-amber-700',
  Fair: 'bg-orange-100 text-orange-700',
  Poor: 'bg-red-100 text-red-700',
}

/** Blank form state used to (re)initialize the modal. */
const emptyForm: CollectibleForm = {
  sku: '',
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
 * Inventory page: collectibles data table backed by the Supabase
 * `products` table, plus an "Add New Collectible" modal that inserts
 * rows and refreshes the list.
 */
export default function Inventory() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  /** ID of the product being edited, or null when adding a new one. */
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<CollectibleForm>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  /** Fetch products from Supabase (used on mount and after inserts). */
  const fetchProducts = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error: fetchError } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false })
    if (fetchError) {
      setError(fetchError.message)
    } else {
      setProducts(data ?? [])
    }
    setLoading(false)
  }, [])

  // Load products once on mount.
  useEffect(() => {
    void fetchProducts()
  }, [fetchProducts])

  const openModal = () => {
    setForm(emptyForm)
    setEditingId(null)
    setFormError(null)
    setIsModalOpen(true)
  }

  /**
   * Open the modal pre-filled with an existing product's data. The
   * product id is kept in `editingId` so the submit handler knows to
   * run an UPDATE instead of an INSERT.
   */
  const openEditModal = (product: Product) => {
    setForm({
      sku: product.sku,
      name: product.name,
      conditionGrade: (product.condition_grade as ConditionGrade) ?? 'Mint',
      edition: product.edition ?? '',
      variation: product.variation ?? '',
      cost: product.cost === null ? '' : String(product.cost),
      price: product.price === null ? '' : String(product.price),
      stockLevel: String(product.stock_level),
      reorderPoint: String(product.reorder_point),
    })
    setEditingId(product.id)
    setFormError(null)
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingId(null)
  }

  /** Generic change handler for every form field. */
  const handleChange = (field: keyof CollectibleForm, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  /**
   * Submit the modal form. When `editingId` is set this performs an
   * UPDATE on the existing row; otherwise it INSERTs a new row into the
   * Supabase `products` table. Local state is updated immediately so the
   * table reflects the change without a page refresh.
   */
  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setFormError(null)
    setSaving(true)

    const payload = {
      sku: form.sku.trim(),
      name: form.name.trim(),
      condition_grade: form.conditionGrade,
      edition: form.edition.trim() || null,
      variation: form.variation.trim() || null,
      stock_level: Number(form.stockLevel) || 0,
      reorder_point: Number(form.reorderPoint) || 0,
      cost: form.cost ? Number(form.cost) : null,
      price: form.price ? Number(form.price) : null,
    }

    if (editingId) {
      // Update the existing row and return it so we can patch local state.
      const { data, error: updateError } = await supabase
        .from('products')
        .update(payload)
        .eq('id', editingId)
        .select()
        .single()
      setSaving(false)
      if (updateError) {
        setFormError(updateError.message)
        return
      }
      setProducts((prev) =>
        prev.map((product) => (product.id === editingId ? data : product)),
      )
    } else {
      // Insert the new collectible.
      const { error: insertError } = await supabase
        .from('products')
        .insert([payload])
      setSaving(false)
      if (insertError) {
        setFormError(insertError.message)
        return
      }
      // Refresh so the new row appears in its server-sorted position.
      await fetchProducts()
    }
    closeModal()
  }

  /**
   * Delete a product after an explicit confirmation. The row is removed
   * from local state immediately so no page refresh is needed.
   */
  const handleDelete = async (product: Product) => {
    const confirmed = window.confirm(
      'Are you sure you want to delete this product?',
    )
    if (!confirmed) return

    const { error: deleteError } = await supabase
      .from('products')
      .delete()
      .eq('id', product.id)
    if (deleteError) {
      setError(deleteError.message)
      return
    }
    setProducts((prev) => prev.filter((p) => p.id !== product.id))
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

      {/* Error banner */}
      {error && (
        <div className="mb-6 flex items-center justify-between rounded-xl bg-red-50 px-6 py-4 text-sm text-red-700">
          <span>Failed to load inventory: {error}</span>
          <button
            type="button"
            onClick={() => void fetchProducts()}
            className="inline-flex items-center gap-2 font-medium underline hover:no-underline"
          >
            <RefreshCw className="h-4 w-4" />
            Try Again
          </button>
        </div>
      )}

      {/* Inventory data table */}
      <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Product Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                SKU
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
            {!loading && products.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-6 py-12 text-center text-sm text-slate-500"
                >
                  No collectibles yet — add your first one!
                </td>
              </tr>
            )}
            {!loading &&
              products.map((product) => {
                const isLowStock = product.stock_level <= product.reorder_point
                return (
                  <tr key={product.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 text-sm font-medium text-slate-900">
                      {product.name}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500">
                      {product.sku}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${conditionStyles[product.condition_grade] ?? 'bg-slate-100 text-slate-700'}`}
                      >
                        {product.condition_grade}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">
                      {product.edition ?? '—'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span
                        className={`inline-flex items-center gap-1.5 text-sm font-semibold ${
                          isLowStock ? 'text-red-600' : 'text-slate-900'
                        }`}
                      >
                        {isLowStock && <AlertTriangle className="h-4 w-4" />}
                        {product.stock_level}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-slate-500">
                      {product.reorder_point}
                    </td>
                    {/* Row actions: edit and delete */}
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEditModal(product)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(product)}
                          className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-red-700"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </button>
                      </div>
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
                {editingId ? 'Edit Collectible' : 'Add New Collectible'}
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
              {formError && (
                <div
                  className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700"
                  role="alert"
                >
                  {formError}
                </div>
              )}

              {/* SKU */}
              <div>
                <label
                  htmlFor="sku"
                  className="mb-1 block text-sm font-medium text-slate-700"
                >
                  SKU
                </label>
                <input
                  id="sku"
                  type="text"
                  required
                  value={form.sku}
                  onChange={(e) => handleChange('sku', e.target.value)}
                  placeholder="e.g. FIG-IM-001"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

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
                    handleChange('conditionGrade', e.target.value)
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  {(
                    ['Mint', 'Near Mint', 'Excellent', 'Good', 'Fair', 'Poor'] as ConditionGrade[]
                  ).map((grade) => (
                    <option key={grade} value={grade}>
                      {grade}
                    </option>
                  ))}
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
                    placeholder="e.g. Chrome Ver."
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Cost & Selling Price */}
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
                    step="0.01"
                    min="0"
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
                    Selling Price (₱)
                  </label>
                  <input
                    id="price"
                    type="number"
                    step="0.01"
                    min="0"
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
                    onChange={(e) =>
                      handleChange('reorderPoint', e.target.value)
                    }
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
                  {saving
                    ? 'Saving…'
                    : editingId
                      ? 'Save Changes'
                      : 'Add Collectible'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

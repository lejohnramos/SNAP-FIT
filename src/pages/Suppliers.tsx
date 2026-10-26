import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Loader2, Pencil, Plus, RefreshCw, Star, Trash2, X } from 'lucide-react'
import { supabase } from '../lib/supabase'

/**
 * Shape of a row from the Supabase `suppliers` table.
 * Columns are snake_case, mirroring schema.sql exactly.
 */
interface SupplierRow {
  id: string
  name: string
  contact_info: string | null
  performance_rating: number | null
  created_at: string
}

/** State for the Add/Edit supplier modal form. */
interface SupplierForm {
  name: string
  contactInfo: string
  rating: string
}

/** Blank form state used to (re)initialize the modal. */
const emptyForm: SupplierForm = {
  name: '',
  contactInfo: '',
  rating: '',
}

/**
 * Suppliers page: vendor directory backed by the Supabase `suppliers`
 * table, with add/edit/delete through a modal form.
 */
export default function Suppliers() {
  const [suppliers, setSuppliers] = useState<SupplierRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  /** ID of the supplier being edited, or null when adding a new one. */
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<SupplierForm>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  /** Fetch suppliers from Supabase, alphabetical by name. */
  const fetchSuppliers = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error: fetchError } = await supabase
      .from('suppliers')
      .select('*')
      .order('name', { ascending: true })
    if (fetchError) {
      setError(fetchError.message)
    } else {
      setSuppliers((data as SupplierRow[]) ?? [])
    }
    setLoading(false)
  }, [])

  // Load suppliers once on mount.
  useEffect(() => {
    void fetchSuppliers()
  }, [fetchSuppliers])

  /** Open the modal in "add" mode with a blank form. */
  const openModal = () => {
    setForm(emptyForm)
    setEditingId(null)
    setFormError(null)
    setIsModalOpen(true)
  }

  /** Open the modal in "edit" mode, pre-filled with the supplier's data. */
  const openEditModal = (supplier: SupplierRow) => {
    setForm({
      name: supplier.name,
      contactInfo: supplier.contact_info ?? '',
      rating:
        supplier.performance_rating === null
          ? ''
          : String(supplier.performance_rating),
    })
    setEditingId(supplier.id)
    setFormError(null)
    setIsModalOpen(true)
  }

  /** Close the modal and reset the editing state. */
  const closeModal = () => {
    setIsModalOpen(false)
    setEditingId(null)
  }

  /** Generic change handler for every form field. */
  const handleChange = (field: keyof SupplierForm, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  /**
   * Submit the modal form. When `editingId` is set this UPDATEs the
   * existing row; otherwise it INSERTs a new row into the Supabase
   * `suppliers` table. Local state is updated immediately so the table
   * reflects the change without a page refresh.
   */
  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setFormError(null)

    // Validate the rating (schema: numeric(3,2), 0.00 - 5.00).
    const rating = form.rating.trim() === '' ? null : Number(form.rating)
    if (
      rating !== null &&
      (!Number.isFinite(rating) || rating < 0 || rating > 5)
    ) {
      setFormError('Rating must be a number between 0 and 5.')
      return
    }
    if (!form.name.trim()) {
      setFormError('Please enter a supplier name.')
      return
    }

    const payload = {
      name: form.name.trim(),
      contact_info: form.contactInfo.trim() || null,
      performance_rating: rating,
    }

    setSaving(true)
    if (editingId) {
      // Update the existing row and return it so we can patch local state.
      const { data, error: updateError } = await supabase
        .from('suppliers')
        .update(payload)
        .eq('id', editingId)
        .select()
        .single()
      setSaving(false)
      if (updateError) {
        setFormError(updateError.message)
        return
      }
      setSuppliers((prev) =>
        prev.map((supplier) =>
          supplier.id === editingId ? (data as SupplierRow) : supplier,
        ),
      )
    } else {
      // Insert the new supplier, then refresh so it lands in its
      // server-sorted (alphabetical) position.
      const { error: insertError } = await supabase
        .from('suppliers')
        .insert([payload])
      setSaving(false)
      if (insertError) {
        setFormError(insertError.message)
        return
      }
      await fetchSuppliers()
    }
    closeModal()
  }

  /**
   * Delete a supplier after an explicit confirmation, then remove it
   * from local state immediately. Products that referenced this
   * supplier keep their data (FK is ON DELETE SET NULL).
   */
  const handleDelete = async (supplier: SupplierRow) => {
    const confirmed = window.confirm(
      'Are you sure you want to delete this supplier?',
    )
    if (!confirmed) return

    const { error: deleteError } = await supabase
      .from('suppliers')
      .delete()
      .eq('id', supplier.id)
    if (deleteError) {
      setError(deleteError.message)
      return
    }
    setSuppliers((prev) => prev.filter((s) => s.id !== supplier.id))
  }

  return (
    <div>
      {/* Page header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Suppliers</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage the vendors you source collectibles from.
          </p>
        </div>
        <button
          type="button"
          onClick={openModal}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" />
          Add New Supplier
        </button>
      </div>

      {/* Fetch error banner with retry */}
      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <div className="flex items-center justify-between gap-4">
            <span>Failed to load suppliers: {error}</span>
            <button
              type="button"
              onClick={() => void fetchSuppliers()}
              className="inline-flex shrink-0 items-center gap-2 rounded-md border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-700 transition-colors hover:bg-red-100"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Try Again
            </button>
          </div>
        </div>
      )}

      {/* Suppliers table */}
      <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Supplier Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Contact Info
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Performance Rating
              </th>
              <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-indigo-600" />
                </td>
              </tr>
            )}
            {!loading && suppliers.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="px-6 py-12 text-center text-sm text-slate-500"
                >
                  No suppliers yet. Add your first one to get started!
                </td>
              </tr>
            )}
            {!loading &&
              suppliers.map((supplier) => (
                <tr key={supplier.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 text-sm font-medium text-slate-900">
                    {supplier.name}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">
                    {supplier.contact_info ?? '—'}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {supplier.performance_rating !== null ? (
                      <span className="inline-flex items-center gap-1 font-medium text-amber-600">
                        <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                        {supplier.performance_rating.toFixed(1)}
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => openEditModal(supplier)}
                        title="Edit supplier"
                        className="rounded-md p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-indigo-600"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDelete(supplier)}
                        title="Delete supplier"
                        className="rounded-md p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* Add/Edit supplier modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          onClick={closeModal}
        >
          <div
            className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  {editingId ? 'Edit Supplier' : 'Add New Supplier'}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {editingId
                    ? 'Update the supplier details below.'
                    : 'Fill in the details to add a new supplier.'}
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              {/* Supplier name */}
              <div>
                <label
                  htmlFor="supplier-name"
                  className="block text-sm font-medium text-slate-700"
                >
                  Supplier Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="supplier-name"
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="e.g. GreatToys Online"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Contact info */}
              <div>
                <label
                  htmlFor="supplier-contact"
                  className="block text-sm font-medium text-slate-700"
                >
                  Contact Info
                </label>
                <input
                  id="supplier-contact"
                  type="text"
                  value={form.contactInfo}
                  onChange={(e) => handleChange('contactInfo', e.target.value)}
                  placeholder="Email, phone, or address"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Performance rating */}
              <div>
                <label
                  htmlFor="supplier-rating"
                  className="block text-sm font-medium text-slate-700"
                >
                  Performance Rating (0-5)
                </label>
                <input
                  id="supplier-rating"
                  type="number"
                  min={0}
                  max={5}
                  step={0.5}
                  value={form.rating}
                  onChange={(e) => handleChange('rating', e.target.value)}
                  placeholder="e.g. 4.5"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Modal-level validation / API error */}
              {formError && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                  {formError}
                </p>
              )}

              {/* Action buttons */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  {editingId ? 'Save Changes' : 'Add Supplier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}


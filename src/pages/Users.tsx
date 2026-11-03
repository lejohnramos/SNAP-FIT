import { useCallback, useEffect, useState } from 'react'
import { Loader2, RefreshCw } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface UserRow {
  id: string
  email: string
  role: string
  is_active: boolean
}

export default function Users() {
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updating, setUpdating] = useState<string | null>(null)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error: fetchError } = await supabase
      .from('users')
      .select('id, email, role, is_active')
      .order('email', { ascending: true })
    if (fetchError) {
      setError(fetchError.message)
    } else {
      setUsers((data as UserRow[]) ?? [])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    void fetchUsers()
  }, [fetchUsers])

  const updateRole = async (userId: string, role: string) => {
    setUpdating(userId)
    const { error: updateError } = await supabase
      .from('users')
      .update({ role })
      .eq('id', userId)
    if (updateError) {
      setError(updateError.message)
    } else {
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role } : u)),
      )
    }
    setUpdating(null)
  }

  const toggleStatus = async (userId: string, currentStatus: boolean) => {
    setUpdating(userId)
    const { error: updateError } = await supabase
      .from('users')
      .update({ is_active: !currentStatus })
      .eq('id', userId)
    if (updateError) {
      setError(updateError.message)
    } else {
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId ? { ...u, is_active: !currentStatus } : u,
        ),
      )
    }
    setUpdating(null)
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">User Management</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage user roles and account status.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void fetchUsers()}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors duration-200 hover:bg-slate-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="mb-6 rounded-xl bg-red-50 px-6 py-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Status
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
            {!loading && users.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="px-6 py-12 text-center text-sm text-slate-500"
                >
                  No users found.
                </td>
              </tr>
            )}
            {!loading &&
              users.map((user) => (
                <tr key={user.id} className="transition-colors duration-200 hover:bg-slate-50">
                  <td className="px-6 py-4 text-sm text-slate-900">
                    {user.email}
                  </td>
                  <td className="px-6 py-4">
                    <select
                      value={user.role}
                      onChange={(e) => void updateRole(user.id, e.target.value)}
                      disabled={updating === user.id}
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
                    >
                      <option value="Admin">Admin</option>
                      <option value="Staff">Staff</option>
                    </select>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        user.is_active
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      type="button"
                      onClick={() => void toggleStatus(user.id, user.is_active)}
                      disabled={updating === user.id}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors duration-200 hover:bg-slate-50 disabled:opacity-50"
                    >
                      {user.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

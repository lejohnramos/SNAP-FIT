import { useCallback, useEffect, useState } from 'react'
import { Loader2, RefreshCw, Save } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

interface UserRow {
  id: string
  email: string
  full_name: string | null
  role: string
  is_active: boolean
}

export default function Users() {
  const { user: currentUser, role: currentRole } = useAuth()
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updating, setUpdating] = useState<string | null>(null)
  const [nameDrafts, setNameDrafts] = useState<Record<string, string>>({})

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error: fetchError } = await supabase
      .from('users')
      .select('id, email, full_name, role, is_active')
      .order('email', { ascending: true })
    if (fetchError) {
      setError(fetchError.message)
    } else {
      const rows = (data as UserRow[]) ?? []
      setUsers(rows)
      const drafts: Record<string, string> = {}
      rows.forEach((u) => (drafts[u.id] = u.full_name ?? ''))
      setNameDrafts(drafts)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    void fetchUsers()
  }, [fetchUsers])

  const updateRole = async (userId: string, role: string) => {
    if (currentRole !== 'Super Admin') return
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

  const updateFullName = async (userId: string) => {
    if (currentRole !== 'Super Admin') return
    setUpdating(userId)
    const fullName = nameDrafts[userId]?.trim() || null
    const { error: updateError } = await supabase
      .from('users')
      .update({ full_name: fullName })
      .eq('id', userId)
    if (updateError) {
      setError(updateError.message)
    } else {
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, full_name: fullName } : u)),
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

  const canEditRole = (targetUser: UserRow) => {
    if (!currentUser || !currentRole) return false
    if (targetUser.id === currentUser.id) return false // Self-protection
    if (currentRole === 'Super Admin') {
      // Super Admin can change others' roles, but cannot assign Super Admin
      return targetUser.role !== 'Super Admin'
    }
    if (currentRole === 'Admin') {
      return false // Admin cannot change any roles
    }
    return false
  }

  const isOwnRow = (userId: string) => {
    return currentUser?.id === userId
  }

  const canDeactivate = (targetUser: UserRow) => {
    if (!currentUser || !currentRole) return false
    if (targetUser.id === currentUser.id) return false // Self-protection
    if (currentRole === 'Super Admin') {
      // Super Admin can deactivate Admin and Staff
      return targetUser.role === 'Admin' || targetUser.role === 'Staff'
    }
    if (currentRole === 'Admin') {
      // Admin can only deactivate Staff
      return targetUser.role === 'Staff'
    }
    return false
  }

  const getRoleTooltip = (targetUser: UserRow) => {
    if (targetUser.id === currentUser?.id) return 'Cannot change your own role.'
    if (currentRole === 'Admin') return 'Admins cannot change roles.'
    if (currentRole === 'Super Admin' && targetUser.role === 'Super Admin') return 'Cannot assign Super Admin role.'
    return ''
  }

  const getDeactivateTooltip = (targetUser: UserRow) => {
    if (targetUser.id === currentUser?.id) return 'Cannot deactivate your own account.'
    if (currentRole === 'Admin' && (targetUser.role === 'Super Admin' || targetUser.role === 'Admin')) {
      return 'Only Super Admin can manage Admins'
    }
    if (currentRole === 'Super Admin' && targetUser.role === 'Super Admin') {
      return 'Cannot deactivate Super Admin'
    }
    return ''
  }

  const canEditName = () => currentRole === 'Super Admin'

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

      {currentRole !== 'Super Admin' && (
        <div className="mb-6 rounded-xl bg-amber-50 px-6 py-4 text-sm text-amber-700 ring-1 ring-amber-200">
          Only the Super Admin has permission to modify user roles and names.
        </div>
      )}

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
                Full Name
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
                <td colSpan={5} className="px-6 py-12 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-indigo-600" />
                </td>
              </tr>
            )}
            {!loading && users.length === 0 && (
              <tr>
                <td
                  colSpan={5}
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
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={nameDrafts[user.id] ?? ''}
                        onChange={(e) =>
                          setNameDrafts((prev) => ({
                            ...prev,
                            [user.id]: e.target.value,
                          }))
                        }
                        disabled={!canEditName() || updating === user.id}
                        placeholder="Enter full name"
                        className="w-48 rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
                      />
                      {canEditName() && (
                        <button
                          type="button"
                          onClick={() => void updateFullName(user.id)}
                          disabled={updating === user.id}
                          className="rounded-lg border border-slate-300 bg-white p-1.5 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                          title="Save name"
                        >
                          <Save className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {canEditRole(user) ? (
                      <select
                        value={user.role}
                        onChange={(e) => void updateRole(user.id, e.target.value)}
                        disabled={updating === user.id}
                        className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <option value="Admin">Admin</option>
                        <option value="Staff">Staff</option>
                      </select>
                    ) : (
                      <span
                        className="text-sm text-slate-700"
                        title={getRoleTooltip(user)}
                      >
                        {user.role}
                        {isOwnRow(user.id) && <span className="ml-1 text-slate-500">(You)</span>}
                      </span>
                    )}
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
                      disabled={!canDeactivate(user) || updating === user.id}
                      title={getDeactivateTooltip(user)}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors duration-200 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
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

import { NavLink, useNavigate } from 'react-router-dom'
import {
  BarChart3,
  Boxes,
  LayoutDashboard,
  LogOut,
  Package,
  ShoppingCart,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

/** Sidebar navigation items with their Lucide icons. */
const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/inventory', label: 'Inventory', icon: Package },
  { to: '/orders', label: 'Orders', icon: ShoppingCart },
  { to: '/reports', label: 'Reports', icon: BarChart3 },
]

/**
 * Permanent left sidebar with the Snap-Fit Collectibles logo area,
 * primary navigation links, and the signed-in user's account section.
 */
export default function Sidebar() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <aside className="flex w-64 shrink-0 flex-col bg-slate-900">
      {/* Logo area */}
      <div className="flex items-center gap-3 px-6 py-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600">
          <Boxes className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-base font-bold leading-tight text-white">
            Snap-Fit
          </h1>
          <p className="text-xs text-slate-400">Collectibles</p>
        </div>
      </div>

      {/* Navigation links */}
      <nav className="flex-1 space-y-1 px-3 py-2">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'} // Exact match for the dashboard route
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`
            }
          >
            <Icon className="h-5 w-5" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Footer: signed-in user + sign out */}
      <div className="border-t border-slate-800 px-3 py-4">
        <p className="mb-2 truncate px-3 text-xs text-slate-400">
          Signed in as{' '}
          <span className="font-medium text-slate-300">{user?.email}</span>
        </p>
        <button
          type="button"
          onClick={handleSignOut}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
        >
          <LogOut className="h-5 w-5" />
          Sign Out
        </button>
      </div>
    </aside>
  )
}

import { NavLink } from 'react-router-dom'
import {
  BarChart3,
  Boxes,
  Building2,
  LayoutDashboard,
  Package,
  ShoppingCart,
  Truck,
} from 'lucide-react'

/** Sidebar navigation items with their Lucide icons. */
const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/inventory', label: 'Inventory', icon: Package },
  { to: '/orders', label: 'Orders', icon: ShoppingCart },
  { to: '/procurement', label: 'Procurement', icon: Truck },
  { to: '/suppliers', label: 'Suppliers', icon: Building2 },
  { to: '/reports', label: 'Reports', icon: BarChart3 },
]

/**
 * Permanent left sidebar with the Snap-Fit Collectibles logo area
 * and primary navigation links. The active link is highlighted.
 */
export default function Sidebar() {
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

      {/* Footer */}
      <div className="border-t border-slate-800 px-6 py-4">
        <p className="text-xs text-slate-500">Inventory &amp; Procurement</p>
        <p className="text-xs text-slate-500">v0.1.0</p>
      </div>
    </aside>
  )
}

import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'

/**
 * Main application layout: a permanent left sidebar plus a scrollable
 * content area where the routed page (via <Outlet />) is rendered.
 */
export default function Layout() {
  return (
    <div className="flex h-screen bg-slate-100">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="p-8">{<Outlet />}</div>
      </main>
    </div>
  )
}

import { Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import Sidebar from './Sidebar'

/**
 * Main application layout: a permanent left sidebar plus a scrollable
 * content area where the routed page (via <Outlet />) is rendered.
 *
 * The routed page is wrapped in a keyed motion.div so navigating between
 * pages plays a short fade-in + slide-up transition. AnimatePresence
 * (mode="wait") fades the old page out before the new one slides in.
 */
export default function Layout() {
  const location = useLocation()

  return (
    <div className="flex h-screen bg-slate-100">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="p-8"
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  )
}

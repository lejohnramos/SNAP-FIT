import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Inventory from './pages/Inventory'
import Orders from './pages/Orders'
import Procurement from './pages/Procurement'
import Suppliers from './pages/Suppliers'
import Reports from './pages/Reports'

/**
 * Application routes. Every page renders inside the shared Layout,
 * which provides the permanent left sidebar.
 */
export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/inventory" element={<Inventory />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/procurement" element={<Procurement />} />
        <Route path="/suppliers" element={<Suppliers />} />
        <Route path="/reports" element={<Reports />} />
        {/* Redirect any unknown path back to the dashboard */}
        <Route path="*" element={<Dashboard />} />
      </Route>
    </Routes>
  )
}

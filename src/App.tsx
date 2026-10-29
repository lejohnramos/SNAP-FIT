import { Navigate, Route, Routes } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Inventory from './pages/Inventory'
import Orders from './pages/Orders'
import Reports from './pages/Reports'

/**
 * Application routes.
 *
 * - /login and /register are public (auth pages).
 * - Everything else is wrapped in ProtectedRoute, which requires a
 *   Supabase session and renders pages inside the shared Layout.
 */
export default function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Protected app routes */}
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/reports" element={<Reports />} />
        </Route>
      </Route>

      {/* Redirect any unknown path to the dashboard (protected → /login) */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

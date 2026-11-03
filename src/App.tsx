import { Navigate, Route, Routes } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Inventory from './pages/Inventory'
import Orders from './pages/Orders'
import Reports from './pages/Reports'
import Users from './pages/Users'
import { useAuth } from './contexts/AuthContext'

/**
 * Application routes.
 *
 * - /login and /register are public (auth pages).
 * - Everything else is wrapped in ProtectedRoute, which requires a
 *   Supabase session and renders pages inside the shared Layout.
 */
function AdminRoute({ children }: { children: React.ReactElement }) {
  const { role } = useAuth()
  if (role !== 'Admin') {
    return <Navigate to="/" replace />
  }
  return children
}

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
          <Route
            path="/users"
            element={
              <AdminRoute>
                <Users />
              </AdminRoute>
            }
          />
        </Route>
      </Route>

      {/* Redirect any unknown path to the dashboard (protected → /login) */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

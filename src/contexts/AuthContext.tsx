import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

/** Result type shared by signIn / signUp. */
interface AuthResult {
  error: string | null
  /** signUp only: true when the user must confirm their email first. */
  needsEmailConfirmation?: boolean
}

interface AuthContextValue {
  session: Session | null
  user: User | null
  role: string | null
  isActive: boolean | null
  fullName: string | null
  /** True while the initial session is being restored from storage. */
  loading: boolean
  signIn: (email: string, password: string) => Promise<AuthResult>
  signUp: (email: string, password: string) => Promise<AuthResult>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

/** Map a Supabase AuthError to a friendly message. */
function toMessage(err: { message: string } | null): string | null {
  return err ? err.message : null
}

/**
 * Provides the Supabase auth session to the whole app and exposes
 * sign-in / sign-up / sign-out helpers. Sessions are persisted by
 * supabase-js (localStorage) and restored on page load.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [role, setRole] = useState<string | null>(null)
  const [isActive, setIsActive] = useState<boolean | null>(null)
  const [fullName, setFullName] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchUserProfile = async (authUser: User | null) => {
    if (!authUser) {
      setRole(null)
      setIsActive(null)
      setFullName(null)
      return
    }
    try {
      // First fetch role and is_active (critical for access control)
      const { data: roleData, error: roleError } = await supabase
        .from('users')
        .select('role, is_active')
        .eq('id', authUser.id)
        .single()

      console.log("Fetched Profile (role):", roleData, roleError)

      if (!roleError && roleData) {
        setRole(roleData.role ?? null)
        setIsActive(roleData.is_active ?? null)
      } else {
        console.error("Auth Fetch Error (role):", roleError)
        setRole(null)
        setIsActive(null)
      }

      // Fetch full_name separately so it never blocks role loading
      try {
        const { data: nameData, error: nameError } = await supabase
          .from('users')
          .select('full_name')
          .eq('id', authUser.id)
          .single()
        if (!nameError && nameData) {
          setFullName(nameData.full_name ?? null)
        } else {
          if (nameError) console.error("Auth Fetch Error (full_name):", nameError)
          setFullName(null)
        }
      } catch (nameErr) {
        console.error("Auth Fetch Error (full_name):", nameErr)
        setFullName(null)
      }
    } catch (error) {
      console.error("Auth Fetch Error:", error)
      // Try to recover role at least
      try {
        const { data: roleData } = await supabase
          .from('users')
          .select('role, is_active')
          .eq('id', authUser.id)
          .single()
        setRole(roleData?.role ?? null)
        setIsActive(roleData?.is_active ?? null)
      } catch {
        setRole(null)
        setIsActive(null)
      }
      setFullName(null)
    }
  }

  useEffect(() => {
    // Restore any existing session (persisted by supabase-js).
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session)
      const authUser = data.session?.user ?? null
      setUser(authUser)
      await fetchUserProfile(authUser)
      setLoading(false)
    })

    // Keep the context in sync with login/logout/token-refresh events.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession)
      const authUser = newSession?.user ?? null
      setUser(authUser)
      await fetchUserProfile(authUser)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string): Promise<AuthResult> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: toMessage(error) }
  }

  const signUp = async (email: string, password: string): Promise<AuthResult> => {
    const { data, error } = await supabase.auth.signUp({ email, password })
    // When email confirmation is enabled, `data.session` is null right
    // after sign-up and the user must click the link in their inbox first.
    return { error: toMessage(error), needsEmailConfirmation: !error && !data.session }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setRole(null)
    setIsActive(null)
    setFullName(null)
  }

  return (
    <AuthContext.Provider value={{ session, user, role, isActive, fullName, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

/** Access the auth context. Throws if used outside of <AuthProvider>. */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}

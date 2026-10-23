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
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Restore any existing session (persisted by supabase-js).
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setUser(data.session?.user ?? null)
      setLoading(false)
    })

    // Keep the context in sync with login/logout/token-refresh events.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      setUser(newSession?.user ?? null)
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
  }

  return (
    <AuthContext.Provider value={{ session, user, loading, signIn, signUp, signOut }}>
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

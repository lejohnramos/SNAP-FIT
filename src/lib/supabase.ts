import { createClient } from '@supabase/supabase-js'

/**
 * Supabase client singleton.
 *
 * Credentials are read from Vite environment variables (see `.env` and
 * `src/vite-env.d.ts`). The anon key is safe to expose in the browser
 * because Row Level Security (RLS) policies in `schema.sql` control
 * what data the client can actually access.
 */

/** localStorage key holding the "Remember Me" preference ('1' = remember). */
export const REMEMBER_ME_KEY = 'snapfit-remember-me'

/**
 * Read the current "Remember Me" preference. Defaults to true when the
 * flag has never been set (matching the checkbox's default state).
 */
export const getRememberMe = (): boolean =>
  window.localStorage.getItem(REMEMBER_ME_KEY) !== '0'

/**
 * Custom storage adapter that routes Supabase session tokens to either
 * localStorage (persist across browser restarts when "Remember Me" is
 * checked) or sessionStorage (current tab only when unchecked), based
 * on the preference flag written by the Login page just before sign-in.
 *
 * `setItem` keeps only one authoritative copy of each token so a later
 * login with the opposite preference never resurrects a stale session.
 */
const rememberAwareStorage = {
  getItem(key: string): string | null {
    return getRememberMe()
      ? window.localStorage.getItem(key)
      : window.sessionStorage.getItem(key)
  },
  setItem(key: string, value: string): void {
    if (getRememberMe()) {
      window.sessionStorage.removeItem(key)
      window.localStorage.setItem(key, value)
    } else {
      window.localStorage.removeItem(key)
      window.sessionStorage.setItem(key, value)
    }
  },
  removeItem(key: string): void {
    window.localStorage.removeItem(key)
    window.sessionStorage.removeItem(key)
  },
}

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  { auth: { storage: rememberAwareStorage } },
)

import { createClient } from '@supabase/supabase-js'

/**
 * Supabase client singleton.
 *
 * Credentials are read from Vite environment variables (see `.env` and
 * `src/vite-env.d.ts`). The anon key is safe to expose in the browser
 * because Row Level Security (RLS) policies in `schema.sql` control
 * what data the client can actually access.
 */
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
)

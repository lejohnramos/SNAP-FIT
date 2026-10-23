/// <reference types="vite/client" />

/** Typed environment variables for the Snap-Fit Collectibles app. */
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

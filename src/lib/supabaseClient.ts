import { createClient } from '@supabase/supabase-js';

const isEnvAvailable = typeof import.meta !== 'undefined' && typeof import.meta.env !== 'undefined';
const supabaseUrl = isEnvAvailable ? import.meta.env.VITE_SUPABASE_URL : process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = isEnvAvailable ? import.meta.env.VITE_SUPABASE_ANON_KEY : process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    '[Supabase] FATAL: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set. ' +
    'Backend operations will fail silently without valid credentials.'
  );
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder-url.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);

import { createClient } from '@supabase/supabase-js';

const isEnvAvailable = typeof import.meta !== 'undefined' && typeof import.meta.env !== 'undefined';
const supabaseUrl = (isEnvAvailable ? import.meta.env.VITE_SUPABASE_URL : process.env.VITE_SUPABASE_URL) || 'https://placeholder-url.supabase.co';
const supabaseAnonKey = (isEnvAvailable ? import.meta.env.VITE_SUPABASE_ANON_KEY : process.env.VITE_SUPABASE_ANON_KEY) || 'placeholder-anon-key';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Supabase environment variables VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are not configured. Backend actions will fail.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

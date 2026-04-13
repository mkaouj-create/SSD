import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

console.log('Supabase URL:', supabaseUrl ? 'Configured' : 'MISSING');
console.log('Supabase Key:', supabaseAnonKey ? 'Configured' : 'MISSING');

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('CRITICAL: Supabase environment variables are missing! Check your .env file.');
}

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
);

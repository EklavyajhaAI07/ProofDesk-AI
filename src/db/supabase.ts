import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('[Supabase] URL or Anon Key is missing. Check your .env file and restart the dev server.');
}

// Validate URL format
let validUrl = supabaseUrl;
try {
  new URL(supabaseUrl);
} catch {
  console.error('[Supabase] Invalid SUPABASE_URL format:', supabaseUrl);
  validUrl = '';
}

// Create Supabase client with additional options for reliability
export const supabase = createClient(validUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
  global: {
    fetch: (...args: any[]) => {
      // Add timeout to all fetch requests via AbortController
      const [url, options = {}] = args;
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 30000); // 30s timeout

      const fetchPromise = fetch(url, { ...options, signal: controller.signal })
        .finally(() => clearTimeout(id));

      return fetchPromise;
    },
  },
});

// Connection health check function
export async function checkSupabaseConnection(): Promise<{ ok: boolean; error?: string }> {
  if (!validUrl || !supabaseAnonKey) {
    return { ok: false, error: 'Missing Supabase URL or Anon Key' };
  }
  try {
    const { error } = await supabase.from('documents').select('id', { count: 'exact', head: true });
    if (error) {
      // If table doesn't exist, connection is still OK
      if (error.code === '42P01') {
        return { ok: true };
      }
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err.message || 'Unknown connection error' };
  }
}

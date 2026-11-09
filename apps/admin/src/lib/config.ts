import { createClient } from '@supabase/supabase-js';
// Reuse the public-key guard; never trust a VITE_ value just because it is configured.
// @ts-expect-error Existing public helper is plain JavaScript.
import { supabaseConfiguration } from '../../../../src/supabase/config.js';
export const config = supabaseConfiguration(import.meta.env) as {
  configured: boolean; error?: string; url?: string; key?: string;
};
export const client = config.configured ? createClient(config.url!, config.key!, {
  global: {fetch: (input, init) => fetch(input, {...init, signal: init?.signal ? AbortSignal.any([init.signal, AbortSignal.timeout(15000)]) : AbortSignal.timeout(15000)})},
  auth: { flowType: 'pkce', detectSessionInUrl: false, persistSession: true,
    autoRefreshToken: true, storageKey: 'rt-admin-auth-v1' },
}) : null;
export function returnUrl(action?: string) {
  const url = new URL(import.meta.env.BASE_URL, window.location.origin);
  if (action) url.searchParams.set('auth_action', action);
  return url.href;
}
export function publicUrl() {
  return new URL('../', new URL(import.meta.env.BASE_URL, window.location.origin)).pathname + '#/';
}

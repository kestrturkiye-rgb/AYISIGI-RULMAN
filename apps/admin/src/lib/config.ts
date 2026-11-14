import {createCookieClient} from '../../../../src/security/cookie-client.js';
import projectConfig from '../project-config.json';
// Reuse the public-key guard; never trust a VITE_ value just because it is configured.
// @ts-expect-error Existing public helper is plain JavaScript.
import { supabaseConfiguration } from '../../../../src/supabase/config.js';
export const config = supabaseConfiguration({...import.meta.env, VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL || projectConfig.url, VITE_SUPABASE_PUBLISHABLE_KEY: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || projectConfig.publicKey}) as {
  configured: boolean; error?: string; url?: string; key?: string;
};
export const client = config.configured ? createCookieClient(config.url!, config.key!, {
  global: {fetch: (input, init) => fetch(input, {...init, signal: init?.signal ? AbortSignal.any([init.signal, AbortSignal.timeout(15000)]) : AbortSignal.timeout(15000)})},
}) : null;
export function returnUrl(action?: string) {
  const url = new URL(import.meta.env.BASE_URL, window.location.origin);
  if (action) url.searchParams.set('auth_action', action);
  return url.href;
}
export function publicUrl() {
  return import.meta.env.VITE_PUBLIC_SITE_URL || new URL('../', new URL(import.meta.env.BASE_URL, window.location.origin)).pathname + '#/';
}

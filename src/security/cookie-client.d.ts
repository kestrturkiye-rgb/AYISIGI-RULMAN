import type {SupabaseClient,SupabaseClientOptions} from '@supabase/supabase-js';
export function createCookieClient(url:string,key:string,options?:SupabaseClientOptions<any>):SupabaseClient;
export function redirectToAuthHost(options?:{admin?:boolean}):boolean;
export function createCookieAuth(options?:Record<string,unknown>):any;

import {createCookieClient} from '../security/cookie-client.js';
import {supabaseConfiguration} from './config.js';
import publicProject from '../../apps/admin/src/project-config.json';
export const configuration=supabaseConfiguration({...import.meta.env,VITE_SUPABASE_URL:import.meta.env.VITE_SUPABASE_URL||publicProject.url,VITE_SUPABASE_PUBLISHABLE_KEY:import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY||publicProject.publicKey});
let client;
export function getSupabaseClient(){
 if(!configuration.configured)return null;
 return client ||= createCookieClient(configuration.url,configuration.key);
}

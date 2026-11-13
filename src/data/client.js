import {createClient} from '@supabase/supabase-js';
import {configuration} from '../supabase/client.js';
import {createRepository} from './repository.js';
let repository;
export function getPublicRepository(){
 if(!configuration.configured)throw Error(configuration.error||'Supabase veri kaynağı seçildi ancak proje bağlantısı tanımlanmadı.');
 // Public reads must never inherit an admin session and its draft-reading RLS rights.
 return repository ||= createRepository(createClient(configuration.url,configuration.key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false,storageKey:'rt-public-read-only'}}),configuration.url);
}

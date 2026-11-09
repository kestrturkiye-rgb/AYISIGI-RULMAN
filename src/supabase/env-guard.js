function dataMode(env={}){const mode=env.VITE_DATA_SOURCE||'static';if(!['static','supabase'].includes(mode))throw Error('VITE_DATA_SOURCE static veya supabase olmalı.');return mode;}
import {supabaseConfiguration} from './config.js';
export function assertPublicEnvironment(env){
 for(const [name,value] of Object.entries(env))if(value&&/^VITE_.*(?:SECRET|PASSWORD|SERVICE_ROLE|DATABASE_URL|PRIVATE_KEY)/i.test(name))throw Error(`${name}: gizli değerler VITE_ değişkenlerinde kullanılamaz.`);
 const mode=dataMode(env);const config=supabaseConfiguration(env);if(mode==='supabase'&&!config.configured)throw Error('Supabase veri kaynağı için proje URL ve public anahtar gereklidir.');if(config.error)throw Error(config.error);return config;
}

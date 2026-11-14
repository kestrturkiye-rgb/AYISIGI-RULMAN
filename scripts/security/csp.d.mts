import type {Plugin} from 'vite';
export function contentSecurityPolicy(options?:{header?:boolean;projectUrl?:string}):string;
export function cspPlugin():Plugin;

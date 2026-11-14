import {defineConfig} from 'vite';
import {cspPlugin} from './scripts/security/csp.mjs';
export default defineConfig({server:{proxy:{'/api/auth':{target:'http://127.0.0.1:4187'}}},plugins:[cspPlugin()],publicDir:process.env.VITE_MINIMAL_PUBLIC_BUILD==='true'?false:'public',build:{rolldownOptions:{output:{codeSplitting:{groups:[{name:'react',test:/node_modules\/(react|react-dom|scheduler)\//},{name:'supabase',test:/node_modules\/@supabase\//}]}}}}});

import {defineConfig} from 'vite';
export default defineConfig({publicDir:process.env.VITE_MINIMAL_PUBLIC_BUILD==='true'?false:'public',build:{rolldownOptions:{output:{codeSplitting:{groups:[{name:'react',test:/node_modules\/(react|react-dom|scheduler)\//},{name:'supabase',test:/node_modules\/@supabase\//}]}}}}});

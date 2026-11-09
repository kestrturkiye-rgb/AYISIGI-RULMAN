import { defineConfig, loadEnv } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';
export default defineConfig(({mode}) => {
  const env = loadEnv(mode, path.resolve(import.meta.dirname, '../..'), 'VITE_');
  return {
    base: env.VITE_ADMIN_BASE || '/admin/',
    envDir: path.resolve(import.meta.dirname, '../..'),
    plugins: [tailwindcss()],
    build: { outDir: '../../dist/admin', emptyOutDir: true, rolldownOptions: { output: { codeSplitting: { groups: [
      {name:'supabase',test:/node_modules\/@supabase\//},
      {name:'validation',test:/node_modules\/(zod|react-hook-form|@hookform)\//},
      {name:'react',test:/node_modules\/(react|react-dom|react-router|react-router-dom|scheduler)\//},
    ] } } } },
    server: { fs: { allow: [path.resolve(import.meta.dirname, '../..')] } },
  };
});

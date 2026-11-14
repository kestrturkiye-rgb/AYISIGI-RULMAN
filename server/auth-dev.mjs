// Loopback-only development bridge. Never expose this HTTP server publicly.
import {createServer} from 'node:http';import {makeAuthHandler} from '../api/_auth.mjs';
if(process.env.NODE_ENV==='production')throw Error('Bu araç sadece yerel geliştirme içindir.');
process.env.RT_AUTH_ALLOW_LOCALHOST='true';const handler=makeAuthHandler();
createServer((req,res)=>{if(!req.url.startsWith('/api/auth/')){res.statusCode=404;return res.end();}return handler(req,res);}).listen(4187,'127.0.0.1',()=>console.log('Yerel auth köprüsü: http://127.0.0.1:4187 (Vite /api/auth proxy).'));

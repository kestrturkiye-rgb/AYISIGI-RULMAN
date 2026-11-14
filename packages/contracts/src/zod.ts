import {z} from 'zod';
// Strict CSP must not need eval, including Zod's capability probe during schema creation.
z.config({jitless:true});
export {z};

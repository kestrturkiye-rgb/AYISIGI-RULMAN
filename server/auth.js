import { randomBytes, scryptSync, timingSafeEqual, createHash } from 'node:crypto';
export function hashPassword(password) {const salt=randomBytes(16).toString('hex');return `${salt}:${scryptSync(password,salt,64).toString('hex')}`}
export function validPasswordHash(hash) {return /^[a-f0-9]{32}:[a-f0-9]{128}$/.test(hash || '')}
export function verifyPassword(password,hash) {
 if(typeof password!=='string'||password.length>256||!validPasswordHash(hash))return false;
 const [salt,expected]=hash.split(':');return timingSafeEqual(scryptSync(password,salt,64),Buffer.from(expected,'hex'));
}
export const tokenHash=token=>createHash('sha256').update(token).digest('hex');

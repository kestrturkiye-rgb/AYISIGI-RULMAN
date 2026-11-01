import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

export function openStore(filename) {
 mkdirSync(dirname(filename), {recursive:true,mode:0o700});
 const db=new DatabaseSync(filename);
 db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
 CREATE TABLE IF NOT EXISTS quotes (
  id TEXT PRIMARY KEY, request_key TEXT UNIQUE NOT NULL, fingerprint TEXT NOT NULL,
  created_at TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'new', payload TEXT NOT NULL,
  email_status TEXT NOT NULL DEFAULT 'queued', email_attempts INTEGER NOT NULL DEFAULT 0,
  next_email_at INTEGER NOT NULL DEFAULT 0
 );
 CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, expires INTEGER NOT NULL);`);
 const convert=row=>row?{id:row.id,createdAt:row.created_at,status:row.status,emailStatus:row.email_status,emailAttempts:row.email_attempts,...JSON.parse(row.payload)}:null;
 return {
  db, close:()=>db.close(),
  existing:key=>db.prepare('SELECT * FROM quotes WHERE request_key=?').get(key),
  insert:(id,key,fingerprint,payload)=>db.prepare('INSERT INTO quotes(id,request_key,fingerprint,created_at,payload) VALUES(?,?,?,?,?)').run(id,key,fingerprint,new Date().toISOString(),JSON.stringify(payload)),
  get:id=>convert(db.prepare('SELECT * FROM quotes WHERE id=?').get(id)),
  list:(status,search,page)=>{
   const where=`WHERE (?='' OR status=?) AND (?='' OR id LIKE ? ESCAPE '\\' OR payload LIKE ? ESCAPE '\\')`;
   const term='%'+search.replace(/[\\%_]/g,'\\$&')+'%';const args=[status,status,search,term,term];
   return {total:db.prepare(`SELECT count(*) AS total FROM quotes ${where}`).get(...args).total,quotes:db.prepare(`SELECT * FROM quotes ${where} ORDER BY created_at DESC LIMIT 25 OFFSET ?`).all(...args,(page-1)*25).map(convert)};
  },
  setStatus:(id,status)=>db.prepare('UPDATE quotes SET status=? WHERE id=?').run(status,id),
  due:()=>db.prepare("SELECT id FROM quotes WHERE email_status='queued' AND next_email_at<=? ORDER BY created_at LIMIT 10").all(Date.now()).map(r=>r.id),
  emailResult:(id,success)=>db.prepare(`UPDATE quotes SET email_status=CASE WHEN ? THEN 'sent' WHEN email_attempts>=4 THEN 'failed' ELSE 'queued' END, email_attempts=email_attempts+1,next_email_at=? WHERE id=?`).run(success?1:0,Date.now()+60000,id),
  retry:id=>db.prepare("UPDATE quotes SET email_status='queued',email_attempts=0,next_email_at=0 WHERE id=? AND email_status='failed'").run(id),
  session:(token,expires)=>{db.prepare('DELETE FROM sessions WHERE expires<?').run(Date.now());db.prepare('INSERT INTO sessions VALUES(?,?)').run(token,expires)},
  authenticated:token=>Boolean(db.prepare('SELECT token FROM sessions WHERE token=? AND expires>?').get(token,Date.now())),
  logout:token=>db.prepare('DELETE FROM sessions WHERE token=?').run(token),
 };
}

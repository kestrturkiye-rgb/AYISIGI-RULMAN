import { z } from 'zod';
export const roleSchema = z.enum(['admin', 'editor', 'sales']);
export type StaffRole = z.infer<typeof roleSchema>;
export const staffSchema = z.object({ user_id: z.string().uuid(), role: roleSchema });
export type StaffMember = z.infer<typeof staffSchema>;
const usernamePattern = /^[A-Za-z0-9][A-Za-z0-9._-]{2,63}$/;
const internalAccountDomain = 'admin.rulmanteklif.com';
export const loginIdentifierSchema = z.string().trim().max(254).refine(
  value => z.email().safeParse(value).success || usernamePattern.test(value),
  'Geçerli bir kullanıcı adı veya e-posta adresi girin.',
);
export function authEmailForIdentifier(identifier: string): string {
  const value = loginIdentifierSchema.parse(identifier);
  return value.includes('@') ? value : `${value.toLowerCase()}@${internalAccountDomain}`;
}
export function isRecoveryEmail(value: string): boolean {
  return z.email().safeParse(value.trim()).success &&
    !value.trim().toLowerCase().endsWith('@' + internalAccountDomain);
}
export const loginSchema = z.object({
  email: loginIdentifierSchema,
  password: z.string().min(1, 'Şifrenizi girin.').max(256, 'Şifre çok uzun.'),
});
export type LoginValues = z.infer<typeof loginSchema>;
export const passwordSchema = z.object({
  password: z.string().min(12, 'En az 12 karakterli bir şifre seçin.').max(128),
  confirmation: z.string(),
}).refine(value => value.password === value.confirmation, {
  path: ['confirmation'], message: 'Şifreler eşleşmiyor.',
});
export type PasswordValues = z.infer<typeof passwordSchema>;

const countSchema = z.number().int().nonnegative().safe();
export const dashboardSchema = z.object({
  role: roleSchema, generatedAt: z.iso.datetime({offset:true}),
  period: z.enum(['today','week']), periodStart: z.iso.datetime({offset:true}),
  timezone: z.literal('Europe/Istanbul'),
  catalog: z.object({total:countSchema,drafts:countSchema,published:countSchema}).nullable(),
  quotes: z.object({today:countSchema,week:countSchema,periodTotal:countSchema,pending:countSchema,new:countSchema,
    statuses:z.array(z.object({status:z.enum(['new','in_progress','quoted','won','lost','closed']),count:countSchema}))}).nullable(),
  recentQuotes:z.array(z.object({id:z.string().uuid(),status:z.enum(['new','in_progress','quoted','won','lost','closed']),created_at:z.iso.datetime({offset:true}),customer:z.string(),lines:countSchema,quantity:countSchema})).max(5),
  topProducts:z.array(z.object({product_id:z.string().nullable(),sku:z.string(),name:z.string(),quantity:countSchema,requests:countSchema})).max(5),
  stock:z.object({lowCount:countSchema,unknownCount:countSchema,items:z.array(z.object({id:z.string(),sku:z.string(),name:z.string(),quantity:z.number().nonnegative(),threshold:z.number().nonnegative()})).max(5)}),
}).superRefine((value,ctx)=>{
  if(value.role==='admin'&&(value.catalog===null||value.quotes===null))ctx.addIssue({code:'custom',message:'Admin özetinde gerekli alanlar eksik.'});
  if(value.role==='editor'&&value.catalog===null)ctx.addIssue({code:'custom',message:'Katalog özeti eksik.'});
  if(value.role==='sales'&&value.quotes===null)ctx.addIssue({code:'custom',message:'Talep özeti eksik.'});
  if(value.role==='editor'&&(value.quotes!==null||value.recentQuotes.length||value.topProducts.length))ctx.addIssue({code:'custom',message:'Editör yanıtında ticari veri bulunamaz.'});
  if(value.role==='sales'&&value.catalog!==null)ctx.addIssue({code:'custom',message:'Satış yanıtında katalog yönetim verisi bulunamaz.'});
});
export type Dashboard = z.infer<typeof dashboardSchema>;
export type DashboardPeriod = Dashboard['period'];
export * from './catalog.ts';

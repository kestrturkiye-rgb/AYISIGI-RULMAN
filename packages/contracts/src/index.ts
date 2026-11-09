import { z } from 'zod';
export const roleSchema = z.enum(['admin', 'editor', 'sales']);
export type StaffRole = z.infer<typeof roleSchema>;
export const staffSchema = z.object({ user_id: z.string().uuid(), role: roleSchema });
export type StaffMember = z.infer<typeof staffSchema>;
export const loginSchema = z.object({
  email: z.email('Geçerli bir e-posta adresi girin.').trim().max(254),
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

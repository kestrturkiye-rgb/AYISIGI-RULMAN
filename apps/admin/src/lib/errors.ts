export function authMessage(error: unknown): string {
  const value = error as {code?: string; status?: number};
  if (value.status === 429 || ['over_request_rate_limit','over_email_send_rate_limit'].includes(value.code || ''))
    return 'Çok fazla deneme yapıldı. Bir süre sonra tekrar deneyin.';
  if (['invalid_credentials','email_not_confirmed'].includes(value.code || ''))
    return 'Giriş bilgileri doğrulanamadı. E-posta ve şifrenizi kontrol edin.';
  if (value.code === 'weak_password') return 'Daha güçlü, en az 12 karakterli bir şifre seçin.';
  return 'İşlem tamamlanamadı. Bağlantınızı kontrol edip tekrar deneyin.';
}

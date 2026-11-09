-- Admin adım 1. Transaction yönetimi migration çalıştırıcısındadır.
alter type private.staff_role add value if not exists 'sales';
alter type private.quote_state add value if not exists 'won';
alter type private.quote_state add value if not exists 'lost';

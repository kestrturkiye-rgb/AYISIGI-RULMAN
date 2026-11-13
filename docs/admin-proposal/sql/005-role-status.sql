-- ÖNERİ: Henüz migration dizinine taşımayın veya canlıya uygulamayın.
-- Önkoşul: mevcut 202611020001..004 migration'ları.
-- 006'dan önce ayrı transaction olarak tamamlanmalıdır.
begin;
alter type private.staff_role add value if not exists 'sales';
alter type private.quote_state add value if not exists 'won';
alter type private.quote_state add value if not exists 'lost';
commit;

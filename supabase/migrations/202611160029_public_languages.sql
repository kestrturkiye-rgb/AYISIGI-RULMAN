-- Public English overrides are content, never executable markup. Existing languages and records are preserved.
alter table public.site_settings drop constraint site_settings_key_check;
alter table public.site_settings add constraint site_settings_key_check check(key in ('identity','contact','theme','search','footer','seo','announcements','maintenance','quote_ui','analytics','accounts','privacy','localization'));
insert into public.site_settings(key,value) values('localization','{"entries":[{"source":"Rulmanlar","translation":"Bearings"}]}') on conflict(key) do nothing;

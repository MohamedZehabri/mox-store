-- شغّل هذا الملف في Supabase > SQL Editor إذا لم يكن جدول shipping_rates وعمود delivery_type موجودين.
-- app.js يحتاجهما، وبدونهما يفشل إرسال الطلبات.
alter table public.orders add column if not exists delivery_type text default 'home';

create table if not exists public.shipping_rates (
  wilaya text primary key,
  home_price numeric(12,2),
  desk_price numeric(12,2),
  is_active boolean not null default true
);
alter table public.shipping_rates enable row level security;

drop policy if exists "public read shipping" on public.shipping_rates;
create policy "public read shipping" on public.shipping_rates
for select to anon, authenticated using (true);

drop policy if exists "admins manage shipping" on public.shipping_rates;
create policy "admins manage shipping" on public.shipping_rates
for all to authenticated
using (exists (select 1 from public.admins a where a.user_id = (select auth.uid())))
with check (exists (select 1 from public.admins a where a.user_id = (select auth.uid())));

-- مثال لإضافة سعر ولاية (اسم الولاية يجب أن يطابق القائمة في الموقع تماماً):
-- insert into public.shipping_rates (wilaya, home_price, desk_price) values ('بسكرة', 600, 400);

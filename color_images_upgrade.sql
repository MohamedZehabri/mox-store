-- نفّذ هذا الملف مرة واحدة في Supabase > SQL Editor.
-- 1) صورة لكل لون: { "أسود": "https://...png", "وردي": "https://...png" }
alter table public.products add column if not exists color_images jsonb not null default '{}'::jsonb;

-- 2) مخزن صور المنتجات (عام للقراءة، والرفع للمديرين فقط)
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do update set public = true;

drop policy if exists "public read product-images" on storage.objects;
create policy "public read product-images" on storage.objects
for select to anon, authenticated using (bucket_id = 'product-images');

drop policy if exists "admins upload product-images" on storage.objects;
create policy "admins upload product-images" on storage.objects
for insert to authenticated
with check (bucket_id = 'product-images' and exists (select 1 from public.admins a where a.user_id = auth.uid()));

drop policy if exists "admins update product-images" on storage.objects;
create policy "admins update product-images" on storage.objects
for update to authenticated
using (bucket_id = 'product-images' and exists (select 1 from public.admins a where a.user_id = auth.uid()))
with check (bucket_id = 'product-images' and exists (select 1 from public.admins a where a.user_id = auth.uid()));

drop policy if exists "admins delete product-images" on storage.objects;
create policy "admins delete product-images" on storage.objects
for delete to authenticated
using (bucket_id = 'product-images' and exists (select 1 from public.admins a where a.user_id = auth.uid()));

-- نفّذ هذا الملف في Supabase > SQL Editor.
-- 1) الجداول
create extension if not exists pgcrypto;

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text default '',
  price numeric(12,2) not null check (price >= 0),
  category text default 'عام',
  image_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  phone text not null,
  wilaya text not null,
  commune text not null,
  address text not null,
  note text default '',
  items jsonb not null,
  total numeric(12,2) not null check (total >= 0),
  status text not null default 'جديد',
  created_at timestamptz not null default now()
);

create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- 2) تفعيل الحماية
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.admins enable row level security;

-- المدير فقط يستطيع قراءة قائمة المديرين؛ لا توجد صلاحية عامة.
create policy "admins can read admins" on public.admins
for select to authenticated using (auth.uid() = user_id);

-- الزوار يرون المنتجات النشطة فقط.
create policy "public can view active products" on public.products
for select to anon, authenticated using (is_active = true);

-- المديرون يستطيعون إدارة كل المنتجات.
create policy "admins manage products" on public.products
for all to authenticated
using (exists (select 1 from public.admins a where a.user_id = auth.uid()))
with check (exists (select 1 from public.admins a where a.user_id = auth.uid()));

-- الزبون يستطيع إرسال طلب جديد فقط. لا يستطيع قراءة الطلبات أو تعديلها.
create policy "public can place orders" on public.orders
for insert to anon, authenticated
with check (
  status = 'جديد'
  and length(trim(customer_name)) >= 3
  and length(trim(phone)) >= 9
  and length(trim(wilaya)) > 0
  and length(trim(commune)) > 0
  and length(trim(address)) > 0
);

-- المديرون فقط يقرؤون الطلبات ويحدّثون حالتها.
create policy "admins read orders" on public.orders
for select to authenticated
using (exists (select 1 from public.admins a where a.user_id = auth.uid()));

create policy "admins update orders" on public.orders
for update to authenticated
using (exists (select 1 from public.admins a where a.user_id = auth.uid()))
with check (exists (select 1 from public.admins a where a.user_id = auth.uid()));

-- ملاحظة: لا تمنح anon أو authenticated صلاحية حذف الطلبات.


-- 3) احتساب المجموع من أسعار قاعدة البيانات، لا من إجمالي يرسله المتصفح.
create or replace function public.set_order_total_from_products()
returns trigger language plpgsql security definer set search_path = public as $$
declare item jsonb; product_price numeric; calculated_total numeric := 0; product_uuid uuid;
begin
  if jsonb_typeof(new.items) <> 'array' or jsonb_array_length(new.items) = 0 then
    raise exception 'Order must contain at least one item';
  end if;
  for item in select value from jsonb_array_elements(new.items)
  loop
    product_uuid := (item->>'product_id')::uuid;
    if coalesce((item->>'quantity')::integer,0) < 1 or (item->>'quantity')::integer > 20 then
      raise exception 'Invalid item quantity';
    end if;
    select price into product_price from public.products where id = product_uuid and is_active = true;
    if product_price is null then raise exception 'Product unavailable'; end if;
    calculated_total := calculated_total + product_price * (item->>'quantity')::integer;
  end loop;
  new.total := calculated_total;
  return new;
end; $$;
drop trigger if exists orders_calculate_total on public.orders;
create trigger orders_calculate_total before insert on public.orders
for each row execute function public.set_order_total_from_products();

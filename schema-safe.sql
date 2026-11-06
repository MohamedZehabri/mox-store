-- نسخة آمنة: يمكن تشغيلها حتى لو كانت بعض الجداول موجودة (لا تحذف أي بيانات).
-- شغّلها في Supabase > SQL Editor.

create extension if not exists pgcrypto;

-- 1) الجداول
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

-- 1.b) أعمدة جديدة (إضافة فقط)
alter table public.products add column if not exists sizes text[] not null default '{}';
alter table public.products add column if not exists colors text[] not null default '{}';
alter table public.products add column if not exists stock integer check (stock is null or stock >= 0); -- null = غير محدود
alter table public.products add column if not exists discount_enabled boolean not null default false;
alter table public.products add column if not exists discount_step numeric(5,2) not null default 10 check (discount_step between 0 and 100);
alter table public.products add column if not exists discount_max numeric(5,2) not null default 50 check (discount_max between 0 and 100);
alter table public.orders add column if not exists delivery_type text;

-- 2) تفعيل الحماية
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.admins enable row level security;

-- 3) السياسات
drop policy if exists "Admins can view own record" on public.admins;
drop policy if exists "admins can read admins" on public.admins;
create policy "admins can read admins" on public.admins
for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "public can view active products" on public.products;
create policy "public can view active products" on public.products
for select to anon, authenticated using (is_active = true);

drop policy if exists "admins manage products" on public.products;
create policy "admins manage products" on public.products
for all to authenticated
using (exists (select 1 from public.admins a where a.user_id = (select auth.uid())))
with check (exists (select 1 from public.admins a where a.user_id = (select auth.uid())));

drop policy if exists "public can place orders" on public.orders;
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

drop policy if exists "admins read orders" on public.orders;
create policy "admins read orders" on public.orders
for select to authenticated
using (exists (select 1 from public.admins a where a.user_id = (select auth.uid())));

drop policy if exists "admins update orders" on public.orders;
create policy "admins update orders" on public.orders
for update to authenticated
using (exists (select 1 from public.admins a where a.user_id = (select auth.uid())))
with check (exists (select 1 from public.admins a where a.user_id = (select auth.uid())));

-- 4) سعر القطعة بعد خصم الكمية (الطريقة 1: كل القطع تنزل بنفس النسبة)
-- لتغيير الطريقة لاحقاً يكفي تعديل هذه الدالة (ودالة unitPrice في app.js).
create or replace function public.discounted_unit_price(
  base numeric, enabled boolean, step numeric, max_pct numeric, qty integer
) returns numeric language sql immutable as $$
  select case
    when enabled and qty > 1
      then round(base * (1 - least(coalesce(step,0) * (qty - 1), coalesce(max_pct,0)) / 100.0), 2)
    else base
  end
$$;

-- 5) احتساب الطلب من قاعدة البيانات: الأسعار، الخصم، المقاس، اللون، المخزون
create or replace function public.set_order_total_from_products()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  rec record; item jsonb; prod public.products%rowtype;
  qty_map jsonb := '{}'::jsonb; q integer; unit numeric;
  new_items jsonb := '[]'::jsonb; calculated_total numeric := 0;
  sz text; col text;
begin
  if jsonb_typeof(new.items) <> 'array' or jsonb_array_length(new.items) = 0 then
    raise exception 'Order must contain at least one item';
  end if;

  -- المرور الأول: مجموع كمية كل منتج + فحص المخزون + خصمه
  for rec in
    select (t.e->>'product_id')::uuid as pid, sum((t.e->>'quantity')::integer)::integer as qty
    from jsonb_array_elements(new.items) as t(e)
    group by 1
  loop
    if rec.qty < 1 or rec.qty > 20 then raise exception 'Invalid item quantity'; end if;
    select * into prod from public.products where id = rec.pid and is_active = true for update;
    if not found then raise exception 'Product unavailable'; end if;
    if prod.stock is not null then
      if prod.stock < rec.qty then raise exception 'Insufficient stock'; end if;
      update public.products set stock = stock - rec.qty where id = rec.pid;
    end if;
    qty_map := qty_map || jsonb_build_object(rec.pid::text, rec.qty);
  end loop;

  -- المرور الثاني: فحص كل سطر وإعادة بنائه بالأسعار الحقيقية
  for item in select value from jsonb_array_elements(new.items)
  loop
    q := (item->>'quantity')::integer;
    if q is null or q < 1 then raise exception 'Invalid item quantity'; end if;
    select * into prod from public.products where id = (item->>'product_id')::uuid;

    sz := nullif(trim(coalesce(item->>'size','')), '');
    col := nullif(trim(coalesce(item->>'color','')), '');
    if coalesce(cardinality(prod.sizes),0) > 0 then
      if sz is null or not (sz = any(prod.sizes)) then raise exception 'Invalid size'; end if;
    else sz := null; end if;
    if coalesce(cardinality(prod.colors),0) > 0 then
      if col is null or not (col = any(prod.colors)) then raise exception 'Invalid color'; end if;
    else col := null; end if;

    unit := public.discounted_unit_price(prod.price, prod.discount_enabled, prod.discount_step,
                                         prod.discount_max, (qty_map->>prod.id::text)::integer);
    calculated_total := calculated_total + unit * q;
    new_items := new_items || jsonb_build_array(jsonb_build_object(
      'product_id', prod.id, 'name', prod.name, 'price', unit, 'base_price', prod.price,
      'quantity', q, 'size', sz, 'color', col, 'line_total', unit * q));
  end loop;

  new.items := new_items;
  new.total := calculated_total;
  return new;
end; $$;

drop trigger if exists orders_calculate_total on public.orders;
create trigger orders_calculate_total before insert on public.orders
for each row execute function public.set_order_total_from_products();

-- 6) إرجاع الكمية للمخزون عند تحويل الطلب إلى «ملغى»
create or replace function public.restore_stock_on_cancel()
returns trigger language plpgsql security definer set search_path = public as $$
declare item jsonb;
begin
  if new.status = 'ملغى' and old.status is distinct from 'ملغى' then
    for item in select value from jsonb_array_elements(old.items)
    loop
      update public.products
         set stock = stock + coalesce((item->>'quantity')::integer, 0)
       where id = (item->>'product_id')::uuid and stock is not null;
    end loop;
  end if;
  return new;
end; $$;

drop trigger if exists orders_restore_stock on public.orders;
create trigger orders_restore_stock after update of status on public.orders
for each row execute function public.restore_stock_on_cancel();

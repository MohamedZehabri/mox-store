-- MOX x Meta (Pixel + Conversions API) — run ONCE in Supabase > SQL Editor.
-- Everything is additive: no existing column, table, policy or trigger is modified.

-- 1) Browser context stored with each new order (nullable, filled by the site at checkout).
--    Needed so the Purchase sent at delivery time can be matched to the original ad click.
alter table public.orders
  add column if not exists meta_fbp text,
  add column if not exists meta_fbc text,
  add column if not exists meta_ua  text;

-- 2) One row per order and event => a Purchase can never be queued twice for the same order.
create table if not exists public.meta_events (
  id          bigint generated always as identity primary key,
  order_id    uuid not null references public.orders(id) on delete cascade,
  event_name  text not null check (event_name in ('Purchase')),
  event_id    text not null unique,
  status      text not null default 'pending' check (status in ('pending','sending','sent','failed')),
  attempts    integer not null default 0,
  last_error  text,
  fbtrace_id  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  sent_at     timestamptz,
  unique (order_id, event_name)
);
create index if not exists meta_events_status_idx on public.meta_events (status, created_at);

-- 3) Failures of browser-mirrored events (no personal data stored).
create table if not exists public.meta_event_errors (
  id         bigint generated always as identity primary key,
  event_name text,
  event_id   text,
  error      text,
  created_at timestamptz not null default now()
);

-- 4) Lock both tables: RLS on + no policies + no grants => only the server (service role) can touch them.
alter table public.meta_events       enable row level security;
alter table public.meta_event_errors enable row level security;
revoke all on public.meta_events       from anon, authenticated;
revoke all on public.meta_event_errors from anon, authenticated;

-- 5) Queue a Purchase the moment an order's status BECOMES 'تم التسليم'.
--    Works even if the status is changed from the Supabase dashboard instead of the admin page.
create or replace function public.enqueue_meta_purchase()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'تم التسليم' and old.status is distinct from new.status then
    insert into public.meta_events (order_id, event_name, event_id)
    values (new.id, 'Purchase', 'purchase_' || new.id::text)
    on conflict do nothing;      -- already queued/sent for this order: do nothing
  end if;
  return new;
end;
$$;

drop trigger if exists trg_enqueue_meta_purchase on public.orders;
create trigger trg_enqueue_meta_purchase
  after update of status on public.orders
  for each row execute function public.enqueue_meta_purchase();

-- ---- Useful queries ----
-- Status of every Purchase:
--   select o.customer_name, e.order_id, e.status, e.attempts, e.last_error, e.sent_at
--   from public.meta_events e join public.orders o on o.id = e.order_id order by e.created_at desc;
-- Retry a failed row that exhausted its 5 attempts:
--   update public.meta_events set status = 'pending', attempts = 0 where id = <ID>;
-- After testing with META_TEST_EVENT_CODE, re-queue the test rows so they are sent for real:
--   update public.meta_events set status = 'pending', attempts = 0, sent_at = null, fbtrace_id = null
--   where status = 'sent' and sent_at >= '<test start time>';

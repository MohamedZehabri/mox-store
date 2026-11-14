-- نفّذ هذا الملف مرة واحدة في Supabase > SQL Editor ليتمكن المدير من حذف الطلبات من لوحة الإدارة.
-- (سجلات Meta المرتبطة بالطلب تُحذف معه تلقائياً، وإحصاءات الزبائن تُحسب من الطلبات المتبقية.)
grant delete on public.orders to authenticated;

drop policy if exists "admins delete orders" on public.orders;
create policy "admins delete orders" on public.orders
for delete to authenticated
using (exists (select 1 from public.admins a where a.user_id = auth.uid()));

-- MOX SMART FIT v2: أعمدة اختيارية لدليل المقاسات (مثل Temu). كلها اختيارية، ولا يتغير شيء إن تُركت فارغة.
alter table public.size_charts add column if not exists alt_label text;            -- مقاس محلي مقابل (مثل 34 أو 36)
alter table public.size_charts add column if not exists body_chest_min numeric;    -- نطاق الجسم الذي يناسبه هذا المقاس (من جدول المورّد)
alter table public.size_charts add column if not exists body_chest_max numeric;
alter table public.size_charts add column if not exists body_waist_min numeric;
alter table public.size_charts add column if not exists body_waist_max numeric;
alter table public.size_charts add column if not exists body_height_min numeric;
alter table public.size_charts add column if not exists body_height_max numeric;
alter table public.products add column if not exists model_note text;              -- مثال: العارض طوله 178 سم ويرتدي M

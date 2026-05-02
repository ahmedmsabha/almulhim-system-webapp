-- خطط اشتراك المنصّة (شيكل) — نفّذ في SQL Editor بعد وجود جدول subscription_plans (Drizzle / migration).
-- يحدّث الصفوف إن وُجدت نفس المعرفات (معرفات ثابتة لسهولة المراجع).

INSERT INTO public.subscription_plans (id, name, description, duration_days, price, is_active, updated_at)
VALUES
  (
    'a1000001-0001-4001-8001-000000000001'::uuid,
    'اشتراك شهري',
    'تجديد شهري — 30 شيكل',
    30,
    30.00,
    true,
    now()
  ),
  (
    'a1000001-0001-4001-8001-000000000002'::uuid,
    'اشتراك فصل دراسي',
    'الفصل الأول أو الفصل الثاني — 150 شيكل',
    135,
    150.00,
    true,
    now()
  ),
  (
    'a1000001-0001-4001-8001-000000000003'::uuid,
    'اشتراك سنة دراسية كاملة',
    'سنة كاملة — 300 شيكل',
    365,
    300.00,
    true,
    now()
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  duration_days = EXCLUDED.duration_days,
  price = EXCLUDED.price,
  is_active = EXCLUDED.is_active,
  updated_at = now();

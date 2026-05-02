-- إعدادات عامة (صفحة الاشتراك) + طلبات الاشتراك من النموذج العام
-- نفّذ بعد جدول subscription_plans

CREATE TABLE IF NOT EXISTS app_setting (
  id TEXT PRIMARY KEY,
  whatsapp_url TEXT,
  telegram_url TEXT,
  grades_json TEXT NOT NULL DEFAULT '[]',
  subscribe_page_note_ar TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO app_setting (id, grades_json)
VALUES (
  'site',
  '["الصف العاشر — فلسطين","الصف الحادي عشر — علمي — فلسطين","الصف الثاني عشر (التوجيهي) — علمي — فلسطين"]'
)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS subscription_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  grade TEXT NOT NULL,
  plan_id UUID REFERENCES subscription_plans (id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscription_leads_created_at ON subscription_leads (created_at DESC);

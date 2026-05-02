-- التحقق من فهارس التفرد الحرجة لمشروع Drizzle (منصة الفيزياء)
-- نفِّذ الملف كاملاً في Supabase → SQL Editor
--
-- 1) watch_progress: يجب أن يوجد فهرس UNIQUE على (student_id, lesson_id)
--    حتى يعمل upsert في lib/db/queries/videos.ts (onConflictDoUpdate)
-- 2) coupons: يجب أن يوجد فهرس UNIQUE على (code)
--
-- أسماء Drizzle المتوقعة:
--    watch_progress_student_id_lesson_id
--    coupons_code_key

-- ---------------------------------------------------------------------------
-- أ) ملخص سريع: هل الشرط محقق؟ (نتيجة true = سليم)
-- ---------------------------------------------------------------------------
SELECT
  EXISTS (
    SELECT 1
    FROM pg_index ix
    JOIN pg_class tbl ON tbl.oid = ix.indrelid
    JOIN pg_namespace ns ON ns.oid = tbl.relnamespace
    WHERE ns.nspname = 'public'
      AND tbl.relname = 'watch_progress'
      AND ix.indisunique
      AND NOT ix.indisprimary
      AND pg_get_indexdef(ix.indexrelid, 0, true) LIKE '%student_id%'
      AND pg_get_indexdef(ix.indexrelid, 0, true) LIKE '%lesson_id%'
  ) AS watch_progress_pair_unique_ok,
  EXISTS (
    SELECT 1
    FROM pg_index ix
    JOIN pg_class tbl ON tbl.oid = ix.indrelid
    JOIN pg_namespace ns ON ns.oid = tbl.relnamespace
    WHERE ns.nspname = 'public'
      AND tbl.relname = 'coupons'
      AND ix.indisunique
      AND NOT ix.indisprimary
      AND pg_get_indexdef(ix.indexrelid, 0, true) LIKE '%(code)%'
  ) AS coupons_code_unique_ok;

-- ---------------------------------------------------------------------------
-- ب) مطابقة أسماء Drizzle بالضبط (اختياري — مفيد لو push تم بلا اختلاف)
-- ---------------------------------------------------------------------------
SELECT
  EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'watch_progress'
      AND indexname = 'watch_progress_student_id_lesson_id'
  ) AS drizzle_name_watch_progress_ok,
  EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'coupons'
      AND indexname = 'coupons_code_key'
  ) AS drizzle_name_coupons_ok;

-- ---------------------------------------------------------------------------
-- ج) تفاصيل: كل فهارس UNIQUE غير الـ PRIMARY على الجدولين (للمقارنة اليدوية)
-- ---------------------------------------------------------------------------
SELECT
  t.relname AS table_name,
  i.relname AS index_name,
  ix.indisprimary AS is_primary,
  pg_get_indexdef(ix.indexrelid, 0, true) AS index_definition
FROM pg_index ix
JOIN pg_class t ON t.oid = ix.indrelid
JOIN pg_namespace n ON n.oid = t.relnamespace
JOIN pg_class i ON i.oid = ix.indexrelid
WHERE n.nspname = 'public'
  AND t.relname IN ('watch_progress', 'coupons')
  AND ix.indisunique
ORDER BY t.relname, i.relname;

-- ---------------------------------------------------------------------------
-- إصلاح مقترح (شغّله فقط إن ظهر أحد الشرطين false أعلاه، ثم أعد تشغيل هذا الملف)
-- ---------------------------------------------------------------------------
-- CREATE UNIQUE INDEX IF NOT EXISTS watch_progress_student_id_lesson_id
--   ON public.watch_progress (student_id, lesson_id);
--
-- CREATE UNIQUE INDEX IF NOT EXISTS coupons_code_key
--   ON public.coupons (code);

-- Supabase Storage: bucket للـ PDF مع قراءة عامة ورفع عبر Signed Upload من الخادم (يفضّل SUPABASE_SERVICE_ROLE_KEY).
-- نفّذ من SQL Editor بعد إنشاء الحاوية materials من الواجهة إن لم تكن موجودة.

INSERT INTO storage.buckets (id, name, public)
VALUES ('materials', 'materials', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

-- قراءة للطلاب والروابط العامة، ولـ Storage API (.download) لجلسات anon/authenticated عندما لا يُستخدم مفتاح الخدمة.
DROP POLICY IF EXISTS "Public read materials objects" ON storage.objects;
DROP POLICY IF EXISTS "Materials public read anon" ON storage.objects;
DROP POLICY IF EXISTS "Materials public read authenticated" ON storage.objects;

CREATE POLICY "Materials public read anon"
ON storage.objects FOR SELECT
TO anon
USING (bucket_id = 'materials');

CREATE POLICY "Materials public read authenticated"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'materials');

-- الرفع من المتصفح عبر Signed Upload URL يستخدم دور anon مع token؛ يلزم السماح بإنشاء/استبدال الصفوف في هذه الحاوية.
DROP POLICY IF EXISTS "Materials signed upload insert" ON storage.objects;
CREATE POLICY "Materials signed upload insert"
ON storage.objects FOR INSERT
TO anon
WITH CHECK (bucket_id = 'materials');

DROP POLICY IF EXISTS "Materials signed upload update" ON storage.objects;
CREATE POLICY "Materials signed upload update"
ON storage.objects FOR UPDATE
TO anon
USING (bucket_id = 'materials')
WITH CHECK (bucket_id = 'materials');

-- لا تمنح INSERT على حاويات أخرى؛ المسارات تحت materials فقط (مسارات ملفات pdf تحت مجلد pdfs/).

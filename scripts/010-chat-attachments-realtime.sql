-- مرفقات الدردشة + Realtime على جدول messages + حاوية Storage خاصة
-- نفّذ من SQL Editor في Supabase (أو عبر ترحيلك المعتاد).

ALTER TABLE messages
ADD COLUMN IF NOT EXISTS attachments jsonb NOT NULL DEFAULT '[]'::jsonb;

INSERT INTO storage.buckets (id, name, public)
VALUES ('chat_attachments', 'chat_attachments', false)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

-- رفع موقّع: anon + token (نفس أسلوب materials)
DROP POLICY IF EXISTS "Chat signed upload insert" ON storage.objects;
CREATE POLICY "Chat signed upload insert"
ON storage.objects FOR INSERT
TO anon
WITH CHECK (bucket_id = 'chat_attachments');

DROP POLICY IF EXISTS "Chat signed upload update" ON storage.objects;
CREATE POLICY "Chat signed upload update"
ON storage.objects FOR UPDATE
TO anon
USING (bucket_id = 'chat_attachments')
WITH CHECK (bucket_id = 'chat_attachments');

-- تسليم أحداث Realtime يتطلب سياسات SELECT مناسبة على messages (للمشتركين في المحادثة).
DROP POLICY IF EXISTS "messages_select_realtime_participants" ON messages;
CREATE POLICY "messages_select_realtime_participants"
ON messages FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = messages.conversation_id
    AND (
      c.student_id = (SELECT auth.uid())
      OR EXISTS (
        SELECT 1 FROM profiles pr
        WHERE pr.id = (SELECT auth.uid())
        AND pr.role = 'admin'
      )
    )
  )
);

-- إدراج رسائل من الطالب أو المشرف ضمن محادثاتهم فقط
DROP POLICY IF EXISTS "messages_insert_participants" ON messages;
CREATE POLICY "messages_insert_participants"
ON messages FOR INSERT
TO authenticated
WITH CHECK (
  sender_id = (SELECT auth.uid())
  AND EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = conversation_id
    AND (
      c.student_id = (SELECT auth.uid())
      OR EXISTS (
        SELECT 1 FROM profiles pr
        WHERE pr.id = (SELECT auth.uid())
        AND pr.role = 'admin'
      )
    )
  )
);

-- تمييز مقروء: الطالب يحدّث رسائل المرسل غير هو؛ المشرف يحدّث رسائل الطلاب
DROP POLICY IF EXISTS "messages_update_student_read" ON messages;
CREATE POLICY "messages_update_student_read"
ON messages FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = messages.conversation_id
    AND c.student_id = (SELECT auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = messages.conversation_id
    AND c.student_id = (SELECT auth.uid())
  )
);

DROP POLICY IF EXISTS "messages_update_admin_read" ON messages;
CREATE POLICY "messages_update_admin_read"
ON messages FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles pr
    WHERE pr.id = (SELECT auth.uid())
    AND pr.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles pr
    WHERE pr.id = (SELECT auth.uid())
    AND pr.role = 'admin'
  )
);

-- إضافة الجدول لمنشور Realtime
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE messages;
EXCEPTION
  WHEN OTHERS THEN
    IF SQLERRM ILIKE '%member%' OR SQLERRM ILIKE '%already%' THEN
      NULL;
    ELSE
      RAISE;
    END IF;
END $$;

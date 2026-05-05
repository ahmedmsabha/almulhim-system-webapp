CREATE OR REPLACE FUNCTION public.notify_new_message()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  conv_student_id uuid;
  admin_ids_json jsonb;
  target_ids jsonb;
  notif_title text;
  notif_url text;
  body_preview text;
BEGIN
  SELECT c.student_id INTO conv_student_id
  FROM public.conversations c
  WHERE c.id = NEW.conversation_id;

  IF conv_student_id IS NULL THEN
    RETURN NEW;
  END IF;

  body_preview := LEFT(NEW.content, 180);

  IF NEW.sender_role = 'admin' THEN
    target_ids := jsonb_build_array(conv_student_id::text);
    notif_title := 'رسالة جديدة من المعلم';
    notif_url := '/student/messages';

  ELSIF NEW.sender_role = 'student' THEN
    SELECT COALESCE(jsonb_agg(p.id::text), '[]'::jsonb)
    INTO admin_ids_json
    FROM public.profiles p
    WHERE p.role = 'admin';

    target_ids := admin_ids_json;
    notif_title := 'رسالة جديدة من الطالب';
    notif_url := '/admin/messages';

  ELSE
    RETURN NEW;
  END IF;

  IF target_ids IS NULL OR target_ids = '[]'::jsonb THEN
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url := 'https://fcpppqthkuqxomoyiffy.supabase.co/functions/v1/send-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer your-secret-here'
    ),
    body := jsonb_build_object(
      'userIds', target_ids,
      'title', notif_title,
      'body', body_preview,
      'url', notif_url
    )
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_message_insert_push ON public.messages;
CREATE TRIGGER on_message_insert_push
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_message();

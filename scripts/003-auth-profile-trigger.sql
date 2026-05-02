-- تشغيله يدوياً في SQL Editor في Supabase بعد إنشاء جدول public.profiles (مثلاً بعد drizzle push).
-- ينشئ صفاً في profiles عند كل تسجيل مستخدم جديد في Auth.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, phone, grade, role)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'full_name', split_part(coalesce(new.email, 'user'), '@', 1)),
    coalesce(new.raw_user_meta_data->>'phone', ''),
    coalesce(new.raw_user_meta_data->>'grade', '12'),
    case
      when new.raw_user_meta_data->>'role' = 'admin' then 'admin'
      else 'student'
    end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

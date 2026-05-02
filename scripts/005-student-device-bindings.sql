-- جدول ربط جهاز واحد لكل طالب + سياسات RLS (يُنفَّذ بعد drizzle db push أو يدوياً في SQL Editor).

create table if not exists public.student_device_bindings (
  student_id uuid not null references public.profiles (id) on delete cascade,
  token_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint student_device_bindings_pkey primary key (student_id)
);

alter table public.student_device_bindings enable row level security;

drop policy if exists "Students read own device binding" on public.student_device_bindings;
create policy "Students read own device binding"
  on public.student_device_bindings for select
  using (auth.uid() = student_id);

drop policy if exists "Students insert own device binding" on public.student_device_bindings;
create policy "Students insert own device binding"
  on public.student_device_bindings for insert
  with check (auth.uid() = student_id);

drop policy if exists "Students update own device binding" on public.student_device_bindings;
create policy "Students update own device binding"
  on public.student_device_bindings for update
  using (auth.uid() = student_id)
  with check (auth.uid() = student_id);

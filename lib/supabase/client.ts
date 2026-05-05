import { createBrowserClient } from '@supabase/ssr'

function browserAnonKey(): string {
  const k =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim()
  if (!k) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"
    )
  }
  return k
}

// Browser client for client-side components
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    browserAnonKey(),
    {
      auth: {
        persistSession: true,
        storageKey: 'almulhim-auth',
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    },
  )
}

// TODO: Configure Supabase project with the following tables:
// - profiles (id, email, full_name, phone, grade, avatar_url, role, created_at, updated_at)
// - video_lessons (id, title, description, unit, duration, thumbnail_url, hls_url, youtube_id, is_preview, is_published, order, ...)
// - pdf_materials (id, title, description, category, file_url, file_size, page_count, is_published, created_at, updated_at)
// - announcements (id, title, body, image_url, is_pinned, is_published, published_at, created_at, updated_at)
// - messages (id, conversation_id, sender_id, sender_role, content, is_read, created_at)
// - conversations (id, student_id, last_message, last_message_at, unread_count, created_at)
// - subscriptions (id, student_id, plan_id, status, start_date, end_date, created_at, updated_at)
// - subscription_plans (id, name, description, duration_days, price, is_active, created_at, updated_at)
// - watch_progress (id, student_id, lesson_id, progress, last_position, completed, last_watched_at)

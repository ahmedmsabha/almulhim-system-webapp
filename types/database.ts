/** Drizzle table row / insert types — database layer. */
export type {
  ProfileRow,
  NewProfileRow,
  SubscriptionPlanRow,
  NewSubscriptionPlanRow,
  SubscriptionRow,
  NewSubscriptionRow,
  VideoLessonRow,
  NewVideoLesson,
  PdfMaterialRow,
  NewPdfMaterial,
  AnnouncementRow,
  NewAnnouncement,
  WatchProgressRow,
  NewWatchProgress,
  DownloadedItemRow,
  NewDownloadedItem,
  ConversationRow,
  NewConversation,
  MessageRow,
  NewMessage,
  CouponRow,
  NewCoupon,
  AppSettingRow,
  NewAppSettingRow,
  SubscriptionLeadRow,
  NewSubscriptionLeadRow,
} from "@/lib/db/schema"

/** Domain models serialized for app layers (ISO date strings, narrowed unions). */
export interface Profile {
  id: string
  email: string
  full_name: string
  phone: string
  grade: string
  avatar_url: string | null
  role: "student" | "admin"
  created_at: string
  updated_at: string
}

export interface VideoLesson {
  id: string
  title: string
  description: string
  unit: string
  duration: number
  thumbnail_url: string | null
  /** Full URL to HLS master playlist on R2 (.m3u8). Paid full lessons. */
  hls_url: string | null
  /** YouTube id for free previews only (`is_preview === true`). */
  youtube_id: string | null
  is_preview: boolean
  is_published: boolean
  order: number
  created_at: string
  updated_at: string
}

export interface PDFMaterial {
  id: string
  title: string
  description: string | null
  category: "شرح" | "تمارين" | "امتحانات" | "حلول" | "ملخصات"
  file_url: string | null
  file_size: number
  page_count: number
  is_published: boolean
  created_at: string
  updated_at: string
}

export interface Announcement {
  id: string
  title: string
  body: string
  /** Admin UI alias (some forms use `content` instead of `body`) */
  content?: string
  image_url: string | null
  is_pinned: boolean
  is_published: boolean
  published_at: string
  created_at: string
  updated_at: string
  priority?: "low" | "medium" | "high" | "normal" | "urgent"
  targetAudience?: "all" | "premium" | "free"
}

/** شكل موسّع لتجارب واجهة إدارة الدروس (غير مخزَّن بالكامل كـ VideoLesson) */
export interface Lesson {
  id: string
  title: string
  description: string
  duration: number
  categoryId: string
  isFree: boolean
  videoUrl?: string | null
  viewCount: number
}

/** شكل موسّع لتجارب إدارة PDF */
export interface PDF {
  id: string
  title: string
  description: string
  categoryId: string
  isFree: boolean
  fileSize: number
  downloadCount: number
}

/** طالب لوحة الإدارة — نفس الشخصية مع اشتراك اختياري */
export type Student = Profile & { subscription?: Subscription }

export interface Message {
  id: string
  conversation_id: string
  sender_id: string
  sender_role: "student" | "admin"
  content: string
  is_read: boolean
  created_at: string
}

export interface Conversation {
  id: string
  student_id: string
  student_name: string
  student_avatar: string | null
  last_message: string | null
  last_message_at: string | null
  unread_count: number
  created_at: string
}

/** Aggregated subscription state for student shell and dashboard (no row vs active vs ended). */
export type StudentSubscriptionUiStatus = "none" | "active" | "expired"

export interface Subscription {
  id: string
  student_id: string
  plan_id: string
  plan_name: string
  status: "active" | "expiring_soon" | "expired" | "cancelled"
  start_date: string
  end_date: string
  created_at: string
  updated_at: string
}

export interface SubscriptionPlan {
  id: string
  name: string
  description: string | null
  duration_days: number
  price: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface DownloadedItem {
  id: string
  item_type: "video" | "pdf"
  item_id: string
  title: string
  file_size: number
  downloaded_at: string
  local_path: string | null
}

export interface WatchProgress {
  id: string
  student_id: string
  lesson_id: string
  progress: number
  last_position: number
  completed: boolean
  last_watched_at: string
}

/** عرض تجريبي لجدول الطلاب في الواجهة الإدارية (لا يُطابق نموذج قاعدة البيانات حرفياً) */
export interface DemoStudent {
  id: string
  name: string
  email: string
  phone: string
  /** يعكس وجود اشتراك يمنح الوصول للمحتوى (نشط أو يوشك على الانتهاء) */
  isActive: boolean
  /** يعرض نوع الباقة عند التفعيل؛ `pending` إذا لم يُفعَّل اشتراك بعد أو انتهى/أُلغي آخر اشتراك */
  subscriptionType: "premium" | "monthly" | "term" | "pending"
  subscriptionEndDate?: string | null
  /** أحدث صف اشتراك في الجدول — لتمديده أو تعديله */
  subscriptionRecordId?: string | null
  subscriptionPlanId?: string | null
  subscriptionStartDate?: string | null
  /** الحالة الخام في الجدول (قبل استنتاج انتهاء الصلاحية من التاريخ) */
  subscriptionDbStatus?: string | null
  createdAt: string
  /** وجود صف ربط جهاز في قاعدة البيانات */
  hasDeviceBinding?: boolean
}

export interface AdminStats {
  active_students: number
  expiring_subscriptions: number
  total_lessons: number
  total_pdfs: number
  unread_messages: number
  recent_announcements: number
}

export interface SubscriptionRequestForm {
  student_name: string
  phone: string
  grade: string
  notes: string
}

export interface LoginForm {
  email: string
  password: string
}

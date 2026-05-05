import { sql } from "drizzle-orm"
import {
  boolean,
  date,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core"

export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(),
  email: text("email").notNull(),
  full_name: text("full_name").notNull(),
  phone: text("phone").notNull().default(""),
  grade: text("grade").notNull().default(""),
  avatar_url: text("avatar_url"),
  role: text("role").notNull().default("student"),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})

export const subscriptionPlans = pgTable("subscription_plans", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),
  duration_days: integer("duration_days").notNull(),
  price: numeric("price", { precision: 12, scale: 2 }).notNull(),
  is_active: boolean("is_active").notNull().default(true),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})

export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  student_id: uuid("student_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  plan_id: uuid("plan_id")
    .notNull()
    .references(() => subscriptionPlans.id, { onDelete: "restrict" }),
  plan_name: text("plan_name"),
  status: text("status").notNull(),
  start_date: timestamp("start_date", { withTimezone: true }).notNull(),
  end_date: timestamp("end_date", { withTimezone: true }).notNull(),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  activated_by: uuid("activated_by").references(() => profiles.id, { onDelete: "set null" }),
  notes: text("notes"),
})

/**
 * Video lessons (`video_lessons`) — ARCHITECTURE.md refers to this as the `videos` domain table.
 * Full lessons use `hls_url` (master.m3u8 on R2). Previews (`is_preview`) use optional `youtube_id`.
 */
export const videoLessons = pgTable("video_lessons", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  description: text("description").default(""),
  unit: text("unit").notNull(),
  duration: integer("duration").notNull(),
  thumbnail_url: text("thumbnail_url"),
  /** Full HLS master playlist URL on Cloudflare R2 (paid / full lessons). */
  hls_url: text("hls_url"),
  /** YouTube video id — only meaningful when `is_preview` is true. */
  youtube_id: text("youtube_id"),
  is_preview: boolean("is_preview").notNull().default(false),
  is_published: boolean("is_published").notNull().default(false),
  order: integer("order").notNull().default(0),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})

/** Alias for docs / imports that follow ARCHITECTURE table name `videos`. */
export const videos = videoLessons

/** Legacy table name aligned with Supabase migrations (`pdf_materials`). */
export const pdfMaterials = pgTable("pdf_materials", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  description: text("description"),
  category: text("category").notNull(),
  file_url: text("file_url"),
  file_size: integer("file_size").notNull(),
  page_count: integer("page_count").notNull(),
  is_published: boolean("is_published").notNull().default(false),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})

export const announcements = pgTable("announcements", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  image_url: text("image_url"),
  is_pinned: boolean("is_pinned").notNull().default(false),
  is_published: boolean("is_published").notNull().default(true),
  published_at: timestamp("published_at", { withTimezone: true }).notNull().defaultNow(),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})

export const watchProgress = pgTable(
  "watch_progress",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    student_id: uuid("student_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    lesson_id: uuid("lesson_id")
      .notNull()
      .references(() => videoLessons.id, { onDelete: "cascade" }),
    progress: integer("progress").notNull().default(0),
    last_position: integer("last_position").notNull().default(0),
    completed: boolean("completed").notNull().default(false),
    last_watched_at: timestamp("last_watched_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    studentLessonUniq: uniqueIndex("watch_progress_student_id_lesson_id").on(
      t.student_id,
      t.lesson_id
    ),
  })
)

export const downloadedItems = pgTable("downloaded_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  resource_type: text("resource_type").notNull(),
  resource_id: uuid("resource_id").notNull(),
  encrypted_at: timestamp("encrypted_at", { withTimezone: true }).notNull(),
  expires_at: timestamp("expires_at", { withTimezone: true }).notNull(),
})

export const conversations = pgTable("conversations", {
  id: uuid("id").primaryKey().defaultRandom(),
  student_id: uuid("student_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  last_message: text("last_message"),
  last_message_at: timestamp("last_message_at", { withTimezone: true }),
  unread_count: integer("unread_count").notNull().default(0),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  conversation_id: uuid("conversation_id")
    .notNull()
    .references(() => conversations.id, { onDelete: "cascade" }),
  sender_id: uuid("sender_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  sender_role: text("sender_role").notNull(),
  content: text("content").notNull(),
  /** مرفقات الرسالة: صور (حتى 5) أو ملفات pdf/صوت (حتى 5) — لا يُخلَط النوعان في رسالة واحدة. */
  attachments: jsonb("attachments")
    .$type<
      {
        kind: "image" | "pdf" | "audio"
        storage_path: string
        file_name: string
        mime_type: string
        size_bytes?: number
      }[]
    >()
    .notNull()
    .default(sql`'[]'::jsonb`),
  is_read: boolean("is_read").notNull().default(false),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

/** صف واحد (`id = site`) لإعدادات عامة تظهر في صفحة الاشتراك ويمكن للمشرف تعديلها. */
export const appSetting = pgTable("app_setting", {
  id: text("id").primaryKey(),
  whatsapp_url: text("whatsapp_url"),
  telegram_url: text("telegram_url"),
  grades_json: text("grades_json").notNull().default("[]"),
  subscribe_page_note_ar: text("subscribe_page_note_ar"),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})

/** طلبات اشتراك واردة من النموذج العام (لمتابعتها يدوياً). */
export const subscriptionLeads = pgTable("subscription_leads", {
  id: uuid("id").primaryKey().defaultRandom(),
  student_name: text("student_name").notNull(),
  phone: text("phone").notNull(),
  grade: text("grade").notNull(),
  plan_id: uuid("plan_id").references(() => subscriptionPlans.id, { onDelete: "set null" }),
  notes: text("notes"),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

export const coupons = pgTable(
  "coupons",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: text("code").notNull(),
    discount_days: integer("discount_days").notNull(),
    max_uses: integer("max_uses").notNull(),
    used_count: integer("used_count").notNull().default(0),
    expires_at: date("expires_at").notNull(),
    is_active: boolean("is_active").notNull().default(true),
  },
  (t) => ({
    codeUniq: uniqueIndex("coupons_code_key").on(t.code),
  })
)

/** One browser/device fingerprint per student (hashed token). Admin can clear to allow a new device. */
export const studentDeviceBindings = pgTable("student_device_bindings", {
  student_id: uuid("student_id")
    .primaryKey()
    .references(() => profiles.id, { onDelete: "cascade" }),
  token_hash: text("token_hash").notNull(),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})

/** اشتراكات Web Push لكل جهاز؛ `endpoint` فريد عالمياً من مزوّد الدفع. */
export const pushSubscriptions = pgTable("push_subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  endpoint: text("endpoint").notNull().unique(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

export type ProfileRow = typeof profiles.$inferSelect
export type NewProfileRow = typeof profiles.$inferInsert
export type SubscriptionPlanRow = typeof subscriptionPlans.$inferSelect
export type NewSubscriptionPlanRow = typeof subscriptionPlans.$inferInsert
export type SubscriptionRow = typeof subscriptions.$inferSelect
export type NewSubscriptionRow = typeof subscriptions.$inferInsert
export type VideoLessonRow = typeof videoLessons.$inferSelect
export type NewVideoLesson = typeof videoLessons.$inferInsert
export type PdfMaterialRow = typeof pdfMaterials.$inferSelect
export type NewPdfMaterial = typeof pdfMaterials.$inferInsert
export type AnnouncementRow = typeof announcements.$inferSelect
export type NewAnnouncement = typeof announcements.$inferInsert
export type WatchProgressRow = typeof watchProgress.$inferSelect
export type NewWatchProgress = typeof watchProgress.$inferInsert
export type DownloadedItemRow = typeof downloadedItems.$inferSelect
export type NewDownloadedItem = typeof downloadedItems.$inferInsert
export type ConversationRow = typeof conversations.$inferSelect
export type NewConversation = typeof conversations.$inferInsert
export type MessageRow = typeof messages.$inferSelect
export type NewMessage = typeof messages.$inferInsert
export type AppSettingRow = typeof appSetting.$inferSelect
export type NewAppSettingRow = typeof appSetting.$inferInsert
export type SubscriptionLeadRow = typeof subscriptionLeads.$inferSelect
export type NewSubscriptionLeadRow = typeof subscriptionLeads.$inferInsert
export type CouponRow = typeof coupons.$inferSelect
export type NewCoupon = typeof coupons.$inferInsert
export type StudentDeviceBindingRow = typeof studentDeviceBindings.$inferSelect
export type NewStudentDeviceBindingRow = typeof studentDeviceBindings.$inferInsert
export type PushSubscriptionRow = typeof pushSubscriptions.$inferSelect
export type NewPushSubscriptionRow = typeof pushSubscriptions.$inferInsert

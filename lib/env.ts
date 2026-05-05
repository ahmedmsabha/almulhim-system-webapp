import { z } from "zod"

const dbMissingMessage = (key: string) =>
  `${key} is missing or empty. في لوحة تحكم Supabase، افتح مشروعك → Settings → Database → Connection strings. استخدم Session mode لـ DATABASE_URL عند الحاجة، و Pooler (6543) لـ DATABASE_URL_POOLER إن وُجد؛ وإلا يُعاد استخدام DATABASE_URL.`

// مفاتيح VAPID لـ Web Push (الخادم + العميل العام فقط):
// npx web-push generate-vapid-keys
// ثم أضف القيم في `.env.local` وفي متغيرات بيئة Vercel (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`).
const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "production", "test"]).optional(),
    NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).optional(),
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1).optional(),
    DATABASE_URL: z.string().min(1),
    DATABASE_URL_POOLER: z.string().min(1).optional(),
    VAPID_PUBLIC_KEY: z.string().min(1),
    VAPID_PRIVATE_KEY: z.string().min(1),
    NEXT_PUBLIC_VAPID_PUBLIC_KEY: z.string().min(1),
  })
  .superRefine((data, ctx) => {
    const hasAnon =
      !!data.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
      !!data.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim()
    if (!hasAnon) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "يجب ضبط NEXT_PUBLIC_SUPABASE_ANON_KEY أو NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (من إعدادات API في Supabase).",
        path: ["NEXT_PUBLIC_SUPABASE_ANON_KEY"],
      })
    }
  })

export type Env = z.infer<typeof envSchema> & {
  supabaseAnonKey: string
  databaseUrlPooler: string
}

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env)
  if (!parsed.success) {
    if (!process.env.DATABASE_URL?.trim()) {
      throw new Error(dbMissingMessage("DATABASE_URL"))
    }
    throw new Error(`Invalid environment configuration: ${parsed.error.message}`)
  }

  const data = parsed.data
  const supabaseAnonKey = (
    data.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    data.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    ""
  ).trim()

  const databaseUrlPooler = data.DATABASE_URL_POOLER?.trim() || data.DATABASE_URL.trim()

  return {
    ...data,
    supabaseAnonKey,
    databaseUrlPooler,
  }
}

export const env = loadEnv()

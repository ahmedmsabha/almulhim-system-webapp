import "server-only"

import { eq } from "drizzle-orm"

import { adminDb } from "@/lib/db/client"
import { appSetting } from "@/lib/db/schema"

export const SITE_SETTING_ID = "site"

/** صفوف افتراضية (فلسطين) إذا لم يُضبط JSON بعد */
export const DEFAULT_SUBSCRIBE_GRADES = [
  "الصف العاشر — فلسطين",
  "الصف الحادي عشر — علمي — فلسطين",
  "الصف الثاني عشر (التوجيهي) — علمي — فلسطين",
] as const

export type AppSettingDTO = {
  id: string
  whatsapp_url: string | null
  telegram_url: string | null
  grades: string[]
  subscribe_page_note_ar: string | null
  updated_at: string
}

function parseGradesJson(raw: string | null | undefined): string[] {
  if (!raw?.trim()) return []
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter((x): x is string => typeof x === "string" && x.trim().length > 0)
  } catch {
    return []
  }
}

export async function getAppSetting(): Promise<AppSettingDTO> {
  try {
    const rows = await adminDb
      .select()
      .from(appSetting)
      .where(eq(appSetting.id, SITE_SETTING_ID))
      .limit(1)

    const row = rows[0]
    const grades = parseGradesJson(row?.grades_json)
    return {
      id: SITE_SETTING_ID,
      whatsapp_url: row?.whatsapp_url?.trim() || null,
      telegram_url: row?.telegram_url?.trim() || null,
      grades: grades.length ? grades : [...DEFAULT_SUBSCRIBE_GRADES],
      subscribe_page_note_ar: row?.subscribe_page_note_ar?.trim() || null,
      updated_at: row?.updated_at?.toISOString() ?? "",
    }
  } catch {
    return {
      id: SITE_SETTING_ID,
      whatsapp_url: null,
      telegram_url: null,
      grades: [...DEFAULT_SUBSCRIBE_GRADES],
      subscribe_page_note_ar: null,
      updated_at: "",
    }
  }
}

export async function upsertAppSetting(input: {
  whatsapp_url: string | null
  telegram_url: string | null
  grades: string[]
  subscribe_page_note_ar: string | null
}): Promise<void> {
  const grades_json = JSON.stringify(input.grades.filter((g) => g.trim().length > 0))
  const now = new Date()
  await adminDb
    .insert(appSetting)
    .values({
      id: SITE_SETTING_ID,
      whatsapp_url: input.whatsapp_url?.trim() || null,
      telegram_url: input.telegram_url?.trim() || null,
      grades_json,
      subscribe_page_note_ar: input.subscribe_page_note_ar?.trim() || null,
      updated_at: now,
    })
    .onConflictDoUpdate({
      target: appSetting.id,
      set: {
        whatsapp_url: input.whatsapp_url?.trim() || null,
        telegram_url: input.telegram_url?.trim() || null,
        grades_json,
        subscribe_page_note_ar: input.subscribe_page_note_ar?.trim() || null,
        updated_at: now,
      },
    })
}

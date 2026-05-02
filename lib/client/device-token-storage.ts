"use client"

/**
 * رمز ثابت يُخزَّن محلياً (localStorage) لتمييز «جهاز التصفّح» هذا عن غيره.
 *
 * الحقيقة على الويب/PWA:
 * - لا يوجد معرّف جهاز حقيقي من نظام التشغيل داخل المتصفح؛ ما نستخدمه هو تخزين لكل منشأ (origin).
 * - المتصفّح المختلف أو ملف تعريف آخر أو (في بعض الحالات) التطبيق المثبَّت مقابل تبويب Safari قد يحصل على مخزن منفصل، فيُعرَّف كجهاز آخر — هذا الحد المعتاد بدون تطبيق أصلي أو Passkeys.
 * - تثبيت PWA لا يغيّر ذلك جوهرياً: ما زال المعرف مرتبطاً بتخزين ذلك العميل وليس بالعتاد الفيزيائي.
 *
 * يتحقّق المعلّم من التعارض عند تسجيل الدخول (زر الدخول)، وليس بعد تحميل لوحة الطالب.
 */
const STORAGE_KEY = "physics_device_token_v1"

export function getOrCreateDeviceToken(): string {
  if (typeof window === "undefined") {
    return ""
  }
  let t = localStorage.getItem(STORAGE_KEY)
  if (!t || t.length < 16) {
    t = crypto.randomUUID()
    localStorage.setItem(STORAGE_KEY, t)
  }
  return t
}

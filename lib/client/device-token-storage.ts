"use client"

/**
 * رمز ثابت يُخزَّن محلياً (localStorage) لتمييز «جهاز التصفّح» هذا عن غيره.
 *
 * الحقيقة على الويب/PWA:
 * - لا يوجد معرّف جهاز حقيقي من نظام التشغيل داخل المتصفح؛ ما نستخدمه هو تخزين لكل منشأ (origin).
 * - المتصفّح المختلف أو ملف تعريف آخر يحصل على توكن مختلف — هذا حدّ الويب دون تطبيق أصلي أو Passkeys.
 * - **عنوان IP العام** لا يصلح كمعرّف جهاز: المتصفح لا يعرفه بدون خادم، وعدة أجهزة/طلاب
 *   خلف نفس شبكة غزة أو المدرسة يشتركون نفس الـ IP (NAT)، فيصير الحظر/السماح عشوائياً.
 * - الربط الحالي (توكن في localStorage لكل منشأ) هو المعيار العملي على الويب دون تطبيق أصلي.
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

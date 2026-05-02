"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Bell,
  CreditCard,
  Globe,
  Mail,
  Phone,
  Save,
  Settings2,
  User,
} from "lucide-react"
import { toast } from "sonner"

import {
  adminSaveProfileSettings,
  adminSaveSubscribePageSettings,
  adminSaveSubscriptionPlan,
} from "@/actions/admin-settings"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Spinner } from "@/components/ui/spinner"
import { CURRENCY } from "@/lib/config"
import type { AppSettingDTO } from "@/lib/db/queries/site-settings"
import type { Profile, SubscriptionPlan } from "@/types"

type TabId = "profile" | "subscribe" | "plans"

export function AdminSettingsClient({
  initialProfile,
  initialPlans,
  initialAppSetting,
}: {
  initialProfile: Profile
  initialPlans: SubscriptionPlan[]
  initialAppSetting: AppSettingDTO
}) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabId>("profile")

  const [profileName, setProfileName] = useState(initialProfile.full_name)
  const [profilePhone, setProfilePhone] = useState(initialProfile.phone)
  const [savingProfile, setSavingProfile] = useState(false)

  const [waUrl, setWaUrl] = useState(initialAppSetting.whatsapp_url ?? "")
  const [tgUrl, setTgUrl] = useState(initialAppSetting.telegram_url ?? "")
  const [gradesText, setGradesText] = useState(initialAppSetting.grades.join("\n"))
  const [subscribeNote, setSubscribeNote] = useState(
    initialAppSetting.subscribe_page_note_ar ?? ""
  )
  const [savingSubscribe, setSavingSubscribe] = useState(false)

  const [planDrafts, setPlanDrafts] = useState(() =>
    initialPlans.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description ?? "",
      duration_days: String(p.duration_days),
      price: String(p.price),
      is_active: p.is_active,
    }))
  )
  const [savingPlanId, setSavingPlanId] = useState<string | null>(null)

  const tabs = useMemo(
    () =>
      [
        { id: "profile" as const, label: "الملف الشخصي", icon: User },
        { id: "subscribe" as const, label: "صفحة الاشتراك والصفوف", icon: Settings2 },
        { id: "plans" as const, label: "خطط الأسعار", icon: CreditCard },
      ] as const,
    []
  )

  const saveProfile = async () => {
    setSavingProfile(true)
    try {
      const res = await adminSaveProfileSettings({
        full_name: profileName,
        phone: profilePhone,
      })
      if (!res.success) {
        toast.error(res.error)
        return
      }
      toast.success("تم حفظ الملف الشخصي")
      router.refresh()
    } finally {
      setSavingProfile(false)
    }
  }

  const saveSubscribePage = async () => {
    setSavingSubscribe(true)
    try {
      const res = await adminSaveSubscribePageSettings({
        whatsapp_url: waUrl,
        telegram_url: tgUrl,
        grades_text: gradesText,
        subscribe_page_note_ar: subscribeNote,
      })
      if (!res.success) {
        toast.error(res.error)
        return
      }
      toast.success("تم حفظ إعدادات صفحة الاشتراك")
      router.refresh()
    } finally {
      setSavingSubscribe(false)
    }
  }

  const savePlan = async (planId: string) => {
    const row = planDrafts.find((p) => p.id === planId)
    if (!row) return
    const duration = parseInt(row.duration_days, 10)
    const price = Number(row.price)
    if (!Number.isFinite(duration) || duration < 1) {
      toast.error("مدة الخطة غير صالحة")
      return
    }
    if (!Number.isFinite(price) || price < 0) {
      toast.error("السعر غير صالح")
      return
    }

    setSavingPlanId(planId)
    try {
      const res = await adminSaveSubscriptionPlan({
        id: row.id,
        name: row.name.trim(),
        description: row.description.trim() || null,
        duration_days: duration,
        price,
        is_active: row.is_active,
      })
      if (!res.success) {
        toast.error(res.error)
        return
      }
      toast.success("تم تحديث الخطة")
      router.refresh()
    } finally {
      setSavingPlanId(null)
    }
  }

  const updatePlanDraft = (
    planId: string,
    patch: Partial<(typeof planDrafts)[number]>
  ) => {
    setPlanDrafts((prev) =>
      prev.map((p) => (p.id === planId ? { ...p, ...patch } : p))
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">الإعدادات</h1>
        <p className="text-muted-foreground">
          الملف الشخصي للمعلِّم، محتوى صفحة الاشتراك، وخطط الأسعار المعروضة للطلاب
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        <Card className="h-fit border-0 shadow-sm lg:col-span-1">
          <CardContent className="p-2">
            <nav className="space-y-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-right transition-colors ${
                    activeTab === tab.id ?
                      "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <tab.icon className="h-5 w-5 shrink-0" />
                  <span className="font-medium">{tab.label}</span>
                </button>
              ))}
            </nav>
          </CardContent>
        </Card>

        <div className="space-y-6 lg:col-span-3">
          {activeTab === "profile" && (
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle>الملف الشخصي</CardTitle>
                <CardDescription>
                  يظهر الاسم للطلاب حيثما يُعرض اسم المعلِّم؛ البريد يُدار من حساب Supabase Auth.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="adm-name">الاسم الكامل</Label>
                    <div className="relative mt-1.5">
                      <User className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="adm-name"
                        className="pr-10"
                        value={profileName}
                        onChange={(e) => setProfileName(e.target.value)}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="adm-email">البريد الإلكتروني</Label>
                    <div className="relative mt-1.5">
                      <Mail className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="adm-email"
                        className="pr-10"
                        value={initialProfile.email}
                        readOnly
                        disabled
                      />
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <Label htmlFor="adm-phone">رقم الهاتف للتواصل</Label>
                    <div className="relative mt-1.5">
                      <Phone className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="adm-phone"
                        className="pr-10"
                        dir="ltr"
                        value={profilePhone}
                        onChange={(e) => setProfilePhone(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <Button
                  type="button"
                  className="gap-2"
                  onClick={() => void saveProfile()}
                  disabled={savingProfile}
                >
                  {savingProfile ?
                    <Spinner className="h-4 w-4" />
                  : <Save className="h-4 w-4" />}
                  حفظ التغييرات
                </Button>
              </CardContent>
            </Card>
          )}

          {activeTab === "subscribe" && (
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle>صفحة الاشتراك العامة</CardTitle>
                <CardDescription>
                  روابط التواصل تُدمَج مع المتغيرات العامة إذا تركت فارغة هنا. الصفوف: سطر لكل صف يظهر في
                  قائمة نموذج الاشتراك.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="set-wa">رابط واتساب (اختياري)</Label>
                    <Input
                      id="set-wa"
                      className="mt-1.5 font-mono text-sm"
                      dir="ltr"
                      placeholder="https://wa.me/..."
                      value={waUrl}
                      onChange={(e) => setWaUrl(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="set-tg">رابط تيليغرام (اختياري)</Label>
                    <Input
                      id="set-tg"
                      className="mt-1.5 font-mono text-sm"
                      dir="ltr"
                      placeholder="https://t.me/..."
                      value={tgUrl}
                      onChange={(e) => setTgUrl(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="set-grades">الصفوف المعروضة (سطر لكل صف)</Label>
                  <Textarea
                    id="set-grades"
                    className="mt-1.5 min-h-[140px]"
                    value={gradesText}
                    onChange={(e) => setGradesText(e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="set-note">ملاحظة إضافية في أعلى صفحة الاشتراك (اختياري)</Label>
                  <Textarea
                    id="set-note"
                    className="mt-1.5"
                    rows={3}
                    value={subscribeNote}
                    onChange={(e) => setSubscribeNote(e.target.value)}
                    placeholder="مثال: مواعيد التسجيل للفصل الحالي..."
                  />
                </div>

                <Button
                  type="button"
                  className="gap-2"
                  onClick={() => void saveSubscribePage()}
                  disabled={savingSubscribe}
                >
                  {savingSubscribe ?
                    <Spinner className="h-4 w-4" />
                  : <Save className="h-4 w-4" />}
                  حفظ إعدادات الصفحة
                </Button>

                <Card className="border-dashed bg-muted/40">
                  <CardContent className="flex gap-3 pt-6 text-sm text-muted-foreground">
                    <Globe className="mt-0.5 h-4 w-4 shrink-0" />
                    <p>
                      بعد إنشاء الجداول (`scripts/009-public-settings-and-leads.sql`) وتشغيل{" "}
                      <code className="rounded bg-muted px-1">drizzle-kit push</code> إن لزم، يصبح الحفظ فعّالاً.
                      بدون الجدول يظهر خطأ واضح من الخادم.
                    </p>
                  </CardContent>
                </Card>
              </CardContent>
            </Card>
          )}

          {activeTab === "plans" && (
            <div className="space-y-5">
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle>خطط الاشتراك في قاعدة البيانات</CardTitle>
                  <CardDescription>
                    هذه الأسعار والأسماء تُعرض في `/subscribe` للطلاب. السعر بال{CURRENCY.labelAr}.
                  </CardDescription>
                </CardHeader>
              </Card>

              {planDrafts.map((draft, idx) => (
                <Card key={draft.id} className="border-0 shadow-sm">
                  <CardHeader className="pb-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <CardTitle className="text-base">خطة {idx + 1}</CardTitle>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={draft.is_active}
                          onCheckedChange={(v) => updatePlanDraft(draft.id, { is_active: v })}
                          id={`active-${draft.id}`}
                        />
                        <Label htmlFor={`active-${draft.id}`} className="text-sm font-normal">
                          نشطة للعرض
                        </Label>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="sm:col-span-2">
                        <Label>اسم الخطة</Label>
                        <Input
                          className="mt-1.5"
                          value={draft.name}
                          onChange={(e) =>
                            updatePlanDraft(draft.id, { name: e.target.value })
                          }
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <Label>الوصف</Label>
                        <Textarea
                          className="mt-1.5"
                          rows={2}
                          value={draft.description}
                          onChange={(e) =>
                            updatePlanDraft(draft.id, { description: e.target.value })
                          }
                        />
                      </div>
                      <div>
                        <Label>المدة (يوماً)</Label>
                        <Input
                          className="mt-1.5 tabular-nums"
                          dir="ltr"
                          value={draft.duration_days}
                          onChange={(e) =>
                            updatePlanDraft(draft.id, { duration_days: e.target.value })
                          }
                        />
                      </div>
                      <div>
                        <Label>السعر ({CURRENCY.symbol})</Label>
                        <Input
                          className="mt-1.5 tabular-nums"
                          dir="ltr"
                          type="number"
                          min={0}
                          step={1}
                          value={draft.price}
                          onChange={(e) =>
                            updatePlanDraft(draft.id, { price: e.target.value })
                          }
                        />
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      className="gap-2"
                      onClick={() => void savePlan(draft.id)}
                      disabled={savingPlanId === draft.id}
                    >
                      {savingPlanId === draft.id ?
                        <Spinner className="h-4 w-4" />
                      : <Save className="h-4 w-4" />}
                      حفظ هذه الخطة
                    </Button>
                  </CardContent>
                </Card>
              ))}

              {planDrafts.length === 0 ?
                <Card className="border-dashed">
                  <CardContent className="py-10 text-center text-muted-foreground">
                    لا توجد خطط في الجدول. نفّذ `scripts/007-subscription-plans-seed.sql`.
                  </CardContent>
                </Card>
              : null}

              <Card className="border-dashed bg-muted/30">
                <CardContent className="flex gap-3 pt-6 text-sm text-muted-foreground">
                  <Bell className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>
                    إشعارات البريد والمظهر يمكن إضافتها لاحقاً؛ هذه الشاشة تركز على ما يظهر للطالب في صفحة
                    الاشتراك وحفظه فعلياً في قاعدة البيانات.
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

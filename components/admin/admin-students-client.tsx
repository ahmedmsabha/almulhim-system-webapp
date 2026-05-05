"use client"

import { useEffect, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Search,
  UserPlus,
  MoreVertical,
  Mail,
  Phone,
  Calendar,
  Crown,
  Edit,
  Smartphone,
  CalendarClock,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import type { DemoStudent, SubscriptionPlan } from "@/types"
import { adminListDemoStudents } from "@/actions/admin-students"
import { adminResetStudentDeviceBinding } from "@/actions/admin-device-binding"
import {
  deactivateStudentSubscriptionAdmin,
  saveStudentSubscriptionAdmin,
} from "@/actions/students"
import { Spinner } from "@/components/ui/spinner"
import { queryKeys } from "@/lib/query-keys"

function addDaysToIsoDate(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

export function AdminStudentsClient({
  initialStudents,
  subscriptionPlans,
}: {
  initialStudents: DemoStudent[]
  subscriptionPlans: SubscriptionPlan[]
}) {
  const queryClient = useQueryClient()

  const { data: students = initialStudents } = useQuery({
    queryKey: queryKeys.adminStudents(),
    queryFn: async () => {
      try {
        const res = await adminListDemoStudents()
        if (!res.success) {
          throw new Error(res.error)
        }
        return res.data
      } catch (e) {
        throw e instanceof Error ? e : new Error("فشل تحميل الطلاب")
      }
    },
    initialData: initialStudents,
  })

  const saveSubscriptionMutation = useMutation({
    mutationFn: async (input: Parameters<typeof saveStudentSubscriptionAdmin>[0]) => {
      try {
        const res = await saveStudentSubscriptionAdmin(input)
        if (!res.success) {
          throw new Error(res.error)
        }
        return res.data
      } catch (e) {
        throw e instanceof Error ? e : new Error("فشل الحفظ")
      }
    },
    onSuccess: async () => {
      try {
        await queryClient.invalidateQueries({ queryKey: queryKeys.adminStudents() })
      } catch {
        /* ignore */
      }
    },
  })

  const deactivateSubscriptionMutation = useMutation({
    mutationFn: async (input: Parameters<typeof deactivateStudentSubscriptionAdmin>[0]) => {
      try {
        const res = await deactivateStudentSubscriptionAdmin(input)
        if (!res.success) {
          throw new Error(res.error)
        }
        return res.data
      } catch (e) {
        throw e instanceof Error ? e : new Error("فشل الإلغاء")
      }
    },
    onSuccess: async () => {
      try {
        await queryClient.invalidateQueries({ queryKey: queryKeys.adminStudents() })
      } catch {
        /* ignore */
      }
    },
  })

  const resetDeviceMutation = useMutation({
    mutationFn: async (studentId: string) => {
      try {
        const res = await adminResetStudentDeviceBinding(studentId)
        if (!res.success) {
          throw new Error(res.error)
        }
        return res.data
      } catch (e) {
        throw e instanceof Error ? e : new Error("فشل إعادة ضبط الجهاز")
      }
    },
    onSuccess: async () => {
      toast.success("تم إعادة ضبط الجهاز")
      try {
        await queryClient.invalidateQueries({ queryKey: queryKeys.adminStudents() })
      } catch {
        /* ignore */
      }
    },
    onError: (err: Error) => {
      toast.error(err.message)
    },
  })

  const [searchQuery, setSearchQuery] = useState("")
  const [filterType, setFilterType] = useState<"all" | "active" | "inactive" | "premium">("all")
  const [selectedStudent, setSelectedStudent] = useState<DemoStudent | null>(null)
  const [subscriptionStudent, setSubscriptionStudent] = useState<DemoStudent | null>(null)
  const [subPlanId, setSubPlanId] = useState("")
  const [subStart, setSubStart] = useState("")
  const [subEnd, setSubEnd] = useState("")
  const [subSaving, setSubSaving] = useState(false)
  const [showAddDialog, setShowAddDialog] = useState(false)

  useEffect(() => {
    if (!subscriptionStudent || subscriptionPlans.length === 0) return
    const firstPlan = subscriptionPlans[0]
    const pid = subscriptionStudent.subscriptionPlanId ?? firstPlan.id
    const plan = subscriptionPlans.find((p) => p.id === pid) ?? firstPlan
    const start =
      subscriptionStudent.subscriptionStartDate?.slice(0, 10) ??
      new Date().toISOString().slice(0, 10)
    const end =
      subscriptionStudent.subscriptionEndDate?.slice(0, 10) ??
      addDaysToIsoDate(start, plan.duration_days)
    setSubPlanId(pid)
    setSubStart(start)
    setSubEnd(end)
  }, [subscriptionStudent, subscriptionPlans])

  const filteredStudents = students.filter((student) => {
    const matchesSearch =
      student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.email.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesFilter =
      filterType === "all" ||
      (filterType === "active" && student.isActive) ||
      (filterType === "inactive" && !student.isActive) ||
      (filterType === "premium" && student.subscriptionType === "premium")

    return matchesSearch && matchesFilter
  })

  async function handleSaveSubscription() {
    if (!subscriptionStudent) return
    setSubSaving(true)
    try {
      await saveSubscriptionMutation.mutateAsync({
        studentId: subscriptionStudent.id,
        subscriptionRecordId: subscriptionStudent.subscriptionRecordId ?? null,
        planId: subPlanId,
        startDateIso: subStart,
        endDateIso: subEnd,
      })
      toast.success(
        subscriptionStudent.subscriptionRecordId ?
          "تم حفظ تعديلات الاشتراك"
        : "تم تفعيل الاشتراك",
      )
      setSubscriptionStudent(null)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "فشل الحفظ")
    } finally {
      setSubSaving(false)
    }
  }

  async function handleDeactivateSubscription() {
    if (!subscriptionStudent?.subscriptionRecordId) return
    if (
      !window.confirm(
        "إلغاء اشتراك هذا الطالب؟ سيُوقَف وصوله للمحتوى حتى تعيد التفعيل.",
      )
    ) {
      return
    }
    setSubSaving(true)
    try {
      await deactivateSubscriptionMutation.mutateAsync({
        studentId: subscriptionStudent.id,
        subscriptionRecordId: subscriptionStudent.subscriptionRecordId,
      })
      toast.success("تم إلغاء الاشتراك")
      setSubscriptionStudent(null)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "فشل الإلغاء")
    } finally {
      setSubSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">إدارة الطلاب</h1>
          <p className="text-muted-foreground">إجمالي {students.length} طالب مسجل</p>
        </div>
        <Button
          type="button"
          onClick={() => {
            setShowAddDialog(true)
            toast.info("إنشاء الطلاب يتم من تسجيل المستخدمين في Supabase Auth ثم ظهورهم تلقائياً هنا.")
          }}
          className="gap-2"
        >
          <UserPlus className="h-4 w-4" />
          إرشادات الإضافة
        </Button>
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="البحث عن طالب..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {[
                { value: "all", label: "الكل" },
                { value: "active", label: "نشط" },
                { value: "inactive", label: "غير نشط" },
                { value: "premium", label: "مميز" },
              ].map((filter) => (
                <Button
                  key={filter.value}
                  type="button"
                  variant={filterType === filter.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterType(filter.value as typeof filterType)}
                >
                  {filter.label}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {filteredStudents.map((student) => (
          <Card
            key={student.id}
            className="border-0 shadow-sm hover:shadow-md transition-shadow"
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/80">
                  <span className="text-lg font-bold text-primary-foreground">
                    {student.name.charAt(0)}
                  </span>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="flex items-center gap-2 font-semibold text-foreground">
                        {student.name}
                        {student.subscriptionType === "premium" && (
                          <Crown className="h-4 w-4 text-chart-4" />
                        )}
                      </h3>
                      <p className="text-sm text-muted-foreground">{student.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-1 text-xs ${
                          student.isActive
                            ? "bg-chart-2/10 text-chart-2"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {student.isActive ? "نشط" : "غير نشط"}
                      </span>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                          <DropdownMenuItem onClick={() => setSelectedStudent(student)}>
                            <Edit className="ml-2 h-4 w-4" />
                            عرض التفاصيل
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setSubscriptionStudent(student)}
                          >
                            <CalendarClock className="ml-2 h-4 w-4" />
                            تعديل الاشتراك
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              if (
                                !window.confirm(
                                  "سيتمكن الطالب من ربط حسابه بجهاز جديد عند تسجيل الدخول التالي. المتابعة؟"
                                )
                              ) {
                                return
                              }
                              resetDeviceMutation.mutate(student.id)
                            }}
                          >
                            <Smartphone className="ml-2 h-4 w-4" />
                            إعادة ضبط الجهاز
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <a href={`mailto:${student.email}`} className="flex items-center">
                              <Mail className="ml-2 h-4 w-4" />
                              إرسال بريد
                            </a>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-4 text-sm text-muted-foreground">
                    {student.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3.5 w-3.5" />
                        {student.phone}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      انضم {new Date(student.createdAt).toLocaleDateString("ar-EG")}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        student.subscriptionType === "premium"
                          ? "bg-chart-4/10 text-chart-4"
                          : student.subscriptionType === "monthly"
                            ? "bg-primary/10 text-primary"
                            : student.subscriptionType === "term"
                              ? "bg-accent/15 text-accent-foreground"
                              : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {student.subscriptionType === "premium"
                        ? "اشتراك مميز"
                        : student.subscriptionType === "monthly"
                          ? "اشتراك شهري"
                          : student.subscriptionType === "term"
                            ? "اشتراك فصلي"
                            : "بانتظار التفعيل"}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {filteredStudents.length === 0 && (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">لا يوجد طلاب مطابقين للبحث</p>
              <Button
                type="button"
                variant="link"
                className="mt-2"
                onClick={() => {
                  void (async () => {
                    try {
                      await queryClient.invalidateQueries({
                        queryKey: queryKeys.adminStudents(),
                      })
                    } catch {
                      /* ignore */
                    }
                  })()
                }}
              >
                تحديث القائمة
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog
        open={!!selectedStudent}
        onOpenChange={(open) => {
          if (!open) setSelectedStudent(null)
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>تفاصيل الطالب</DialogTitle>
          </DialogHeader>
          {selectedStudent && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/80">
                  <span className="text-2xl font-bold text-primary-foreground">
                    {selectedStudent.name.charAt(0)}
                  </span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold">{selectedStudent.name}</h3>
                  <p className="text-sm text-muted-foreground">{selectedStudent.email}</p>
                </div>
              </div>

              <div className="grid gap-3">
                <div className="flex justify-between border-b border-border py-2">
                  <span className="text-muted-foreground">رقم الهاتف</span>
                  <span className="font-medium">{selectedStudent.phone || "غير محدد"}</span>
                </div>
                <div className="flex justify-between border-b border-border py-2">
                  <span className="text-muted-foreground">نوع الاشتراك</span>
                  <span className="font-medium">
                    {selectedStudent.subscriptionType === "premium"
                      ? "مميز"
                      : selectedStudent.subscriptionType === "monthly"
                        ? "شهري"
                        : selectedStudent.subscriptionType === "term"
                          ? "فصل دراسي"
                          : "لم يُفعَّل بعد"}
                  </span>
                </div>
                <div className="flex justify-between border-b border-border py-2">
                  <span className="text-muted-foreground">تاريخ الانتهاء</span>
                  <span className="font-medium">
                    {selectedStudent.subscriptionEndDate
                      ? new Date(selectedStudent.subscriptionEndDate).toLocaleDateString("ar-EG")
                      : "غير محدد"}
                  </span>
                </div>
                <div className="flex justify-between border-b border-border py-2">
                  <span className="text-muted-foreground">الجهاز المرتبط</span>
                  <span className="font-medium">
                    {selectedStudent.hasDeviceBinding ? "جهاز مسجّل" : "لم يُربط بعد"}
                  </span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-muted-foreground">تاريخ التسجيل</span>
                  <span className="font-medium">
                    {new Date(selectedStudent.createdAt).toLocaleDateString("ar-EG")}
                  </span>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-between">
            <Button
              type="button"
              variant="secondary"
              className="w-full sm:w-auto"
              onClick={() => {
                setSubscriptionStudent(selectedStudent)
                setSelectedStudent(null)
              }}
            >
              <CalendarClock className="ms-2 h-4 w-4" />
              تعديل الاشتراك
            </Button>
            <Button type="button" variant="outline" onClick={() => setSelectedStudent(null)}>
              إغلاق
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!subscriptionStudent}
        onOpenChange={(open) => {
          if (!open) setSubscriptionStudent(null)
        }}
      >
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>تعديل اشتراك الطالب</DialogTitle>
          </DialogHeader>
          {subscriptionStudent ?
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground leading-relaxed">
                {subscriptionStudent.subscriptionRecordId ?
                  "تحديث الخطة أو تواريخ البدء والانتهاء. يُعاد تفعيل الحالة إلى «نشط» بعد الحفظ."
                : "لا يوجد سجل اشتراك بعد — سيتم إنشاء اشتراك جديد لهذا الطالب."}
              </p>
              {subscriptionPlans.length === 0 ?
                <p className="rounded-lg border border-dashed bg-muted/40 px-3 py-3 text-sm text-muted-foreground">
                  لا توجد خطط اشتراك مفعّلة في قاعدة البيانات. أضف صفوفاً في جدول{" "}
                  <span dir="ltr" className="font-mono text-xs">
                    subscription_plans
                  </span>{" "}
                  ثم أعد تحميل الصفحة.
                </p>
              : (
                <>
                  <div className="space-y-2">
                    <Label>خطة الاشتراك</Label>
                    <Select
                      dir="rtl"
                      value={subPlanId}
                      onValueChange={setSubPlanId}
                      disabled={subSaving}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="اختر الخطة" />
                      </SelectTrigger>
                      <SelectContent>
                        {subscriptionPlans.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name} · {p.duration_days} يومًا · {p.price} ₪
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="sub-start">تاريخ البدء</Label>
                      <Input
                        id="sub-start"
                        type="date"
                        value={subStart}
                        onChange={(e) => setSubStart(e.target.value)}
                        disabled={subSaving}
                        dir="ltr"
                        className="font-mono"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sub-end">تاريخ الانتهاء</Label>
                      <Input
                        id="sub-end"
                        type="date"
                        value={subEnd}
                        onChange={(e) => setSubEnd(e.target.value)}
                        disabled={subSaving}
                        dir="ltr"
                        className="font-mono"
                      />
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full"
                    disabled={subSaving || !subPlanId || !subStart}
                    onClick={() => {
                      const plan = subscriptionPlans.find((p) => p.id === subPlanId)
                      if (!plan) return
                      setSubEnd(addDaysToIsoDate(subStart, plan.duration_days))
                    }}
                  >
                    تعبئة تاريخ الانتهاء من مدة الخطة
                  </Button>
                </>
              )}
            </div>
          : null}
          <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
            <div className="flex flex-col gap-2 sm:flex-row">
              {subscriptionStudent?.subscriptionRecordId ?
                <Button
                  type="button"
                  variant="destructive"
                  disabled={subSaving || subscriptionPlans.length === 0}
                  onClick={() => void handleDeactivateSubscription()}
                >
                  إلغاء الاشتراك
                </Button>
              : null}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                disabled={subSaving}
                onClick={() => setSubscriptionStudent(null)}
              >
                إغلاق
              </Button>
              <Button
                type="button"
                disabled={
                  subSaving || subscriptionPlans.length === 0 || !subPlanId || !subStart || !subEnd
                }
                onClick={() => void handleSaveSubscription()}
              >
                {subSaving ?
                  <>
                    <Spinner className="ms-2 h-4 w-4" />
                    جاري الحفظ…
                  </>
                : subscriptionStudent?.subscriptionRecordId ?
                  "حفظ التعديلات"
                : "تفعيل الاشتراك"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>إضافة طلاب</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground leading-relaxed">
            أنشئ حسابات الطلاب من لوحة Supabase (Authentication → Users) أو عبر رابط التسجيل عند تفعيله.
            بعد أول تسجيل دخول يظهر الطالب في جدول profiles وفي هذه القائمة.
          </p>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>
              إغلاق
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

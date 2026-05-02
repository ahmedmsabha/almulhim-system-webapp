"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import type { DemoStudent } from "@/types"
import { adminResetStudentDeviceBinding } from "@/actions/admin-device-binding"

export function AdminStudentsClient({
  initialStudents,
}: {
  initialStudents: DemoStudent[]
}) {
  const router = useRouter()
  const [students, setStudents] = useState<DemoStudent[]>(initialStudents)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterType, setFilterType] = useState<"all" | "active" | "inactive" | "premium">("all")
  const [selectedStudent, setSelectedStudent] = useState<DemoStudent | null>(null)
  const [showAddDialog, setShowAddDialog] = useState(false)

  useEffect(() => {
    setStudents(initialStudents)
  }, [initialStudents])

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
                            onClick={async () => {
                              if (
                                !window.confirm(
                                  "سيتمكن الطالب من ربط حسابه بجهاز جديد عند تسجيل الدخول التالي. المتابعة؟"
                                )
                              ) {
                                return
                              }
                              const res = await adminResetStudentDeviceBinding(student.id)
                              if (!res.success) {
                                toast.error(res.error)
                                return
                              }
                              toast.success("تم إعادة ضبط الجهاز")
                              router.refresh()
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
                            : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {student.subscriptionType === "premium"
                        ? "اشتراك مميز"
                        : student.subscriptionType === "monthly"
                          ? "اشتراك شهري"
                          : "مجاني"}
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
              <Button type="button" variant="link" className="mt-2" onClick={() => router.refresh()}>
                تحديث القائمة
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={!!selectedStudent} onOpenChange={() => setSelectedStudent(null)}>
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
                        : "مجاني"}
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
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => setSelectedStudent(null)}>
              إغلاق
            </Button>
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

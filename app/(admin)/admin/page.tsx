"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import {
  Users,
  Video,
  FileText,
  TrendingUp,
  Eye,
  Download,
  Plus,
  ArrowUpLeft,
  Clock,
  CheckCircle,
} from "lucide-react"
import { demoStudents, sampleLessons, samplePDFs } from "@/lib/sample-data"

export default function AdminDashboard() {
  const stats = [
    {
      title: "إجمالي الطلاب",
      value: demoStudents.length.toString(),
      change: "+12%",
      icon: Users,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "الدروس المنشورة",
      value: sampleLessons.length.toString(),
      change: "+5",
      icon: Video,
      color: "text-secondary",
      bgColor: "bg-secondary/10",
    },
    {
      title: "الملفات المرفوعة",
      value: samplePDFs.length.toString(),
      change: "+8",
      icon: FileText,
      color: "text-accent",
      bgColor: "bg-accent/10",
    },
    {
      title: "معدل المشاهدات",
      value: "1,234",
      change: "+23%",
      icon: TrendingUp,
      color: "text-chart-4",
      bgColor: "bg-chart-4/10",
    },
  ]

  const recentActivities = [
    { type: "view", text: "أحمد محمد شاهد درس الحركة الخطية", time: "منذ 5 دقائق" },
    { type: "download", text: "سارة علي حملت ملخص الفصل الأول", time: "منذ 15 دقيقة" },
    { type: "subscribe", text: "طالب جديد اشترك في الباقة الشهرية", time: "منذ ساعة" },
    { type: "view", text: "فاطمة أحمد شاهدت درس قوانين نيوتن", time: "منذ ساعتين" },
    { type: "download", text: "خالد عمر حمل حلول التمارين", time: "منذ 3 ساعات" },
  ]

  const pendingTasks = [
    { text: "مراجعة 5 رسائل جديدة من الطلاب", urgent: true },
    { text: "رفع درس جديد عن الطاقة الحركية", urgent: false },
    { text: "تحديث ملخص الفصل الثاني", urgent: false },
    { text: "الرد على استفسارات الطلاب", urgent: true },
  ]

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-l from-primary to-primary/80 rounded-2xl p-6 text-primary-foreground">
        <h1 className="text-2xl font-bold mb-2">مرحباً أستاذ محمد</h1>
        <p className="text-primary-foreground/80">
          لديك 5 رسائل جديدة و 3 طلاب في انتظار الموافقة
        </p>
        <div className="flex gap-3 mt-4">
          <Button asChild variant="secondary" size="sm">
            <Link href="/admin/messages">
              عرض الرسائل
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="bg-transparent border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10">
            <Link href="/admin/students">
              إدارة الطلاب
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.title} className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className={`p-2 rounded-xl ${stat.bgColor}`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
                <span className="text-xs text-chart-2 bg-chart-2/10 px-2 py-1 rounded-full font-medium">
                  {stat.change}
                </span>
              </div>
              <div className="mt-3">
                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.title}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Button asChild variant="outline" className="h-auto py-4 flex-col gap-2">
          <Link href="/admin/lessons/new">
            <Plus className="h-5 w-5 text-primary" />
            <span>إضافة درس</span>
          </Link>
        </Button>
        <Button asChild variant="outline" className="h-auto py-4 flex-col gap-2">
          <Link href="/admin/materials/new">
            <FileText className="h-5 w-5 text-secondary" />
            <span>رفع ملف</span>
          </Link>
        </Button>
        <Button asChild variant="outline" className="h-auto py-4 flex-col gap-2">
          <Link href="/admin/announcements/new">
            <Plus className="h-5 w-5 text-accent" />
            <span>إعلان جديد</span>
          </Link>
        </Button>
        <Button asChild variant="outline" className="h-auto py-4 flex-col gap-2">
          <Link href="/admin/students">
            <Users className="h-5 w-5 text-chart-4" />
            <span>إدارة الطلاب</span>
          </Link>
        </Button>
      </div>

      {/* Two Column Layout */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              النشاط الأخير
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentActivities.map((activity, index) => (
              <div
                key={index}
                className="flex items-start gap-3 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
              >
                <div className={`p-2 rounded-lg ${
                  activity.type === "view" ? "bg-primary/10" :
                  activity.type === "download" ? "bg-secondary/10" :
                  "bg-chart-2/10"
                }`}>
                  {activity.type === "view" ? (
                    <Eye className="h-4 w-4 text-primary" />
                  ) : activity.type === "download" ? (
                    <Download className="h-4 w-4 text-secondary" />
                  ) : (
                    <ArrowUpLeft className="h-4 w-4 text-chart-2" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground">{activity.text}</p>
                  <p className="text-xs text-muted-foreground mt-1">{activity.time}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Pending Tasks */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-secondary" />
              المهام المعلقة
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingTasks.map((task, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
              >
                <input
                  type="checkbox"
                  className="h-5 w-5 rounded-md border-2 border-muted-foreground/30 text-primary focus:ring-primary"
                />
                <span className="flex-1 text-sm text-foreground">{task.text}</span>
                {task.urgent && (
                  <span className="text-xs bg-destructive/10 text-destructive px-2 py-1 rounded-full">
                    عاجل
                  </span>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Recent Students */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            أحدث الطلاب المسجلين
          </CardTitle>
          <Button asChild variant="ghost" size="sm">
            <Link href="/admin/students">عرض الكل</Link>
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-right border-b border-border">
                  <th className="pb-3 text-sm font-medium text-muted-foreground">الاسم</th>
                  <th className="pb-3 text-sm font-medium text-muted-foreground">البريد</th>
                  <th className="pb-3 text-sm font-medium text-muted-foreground">الاشتراك</th>
                  <th className="pb-3 text-sm font-medium text-muted-foreground">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {demoStudents.slice(0, 5).map((student) => (
                  <tr key={student.id} className="hover:bg-muted/50">
                    <td className="py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-sm font-medium text-primary">
                            {student.name.charAt(0)}
                          </span>
                        </div>
                        <span className="text-sm font-medium text-foreground">{student.name}</span>
                      </div>
                    </td>
                    <td className="py-3 text-sm text-muted-foreground">{student.email}</td>
                    <td className="py-3">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        student.subscriptionType === "premium"
                          ? "bg-chart-4/10 text-chart-4"
                          : student.subscriptionType === "monthly"
                          ? "bg-primary/10 text-primary"
                          : student.subscriptionType === "term"
                          ? "bg-accent/15 text-accent-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}>
                        {student.subscriptionType === "premium"
                          ? "مميز"
                          : student.subscriptionType === "monthly"
                          ? "شهري"
                          : student.subscriptionType === "term"
                          ? "فصلي"
                          : "بانتظار التفعيل"}
                      </span>
                    </td>
                    <td className="py-3">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        student.isActive
                          ? "bg-chart-2/10 text-chart-2"
                          : "bg-muted text-muted-foreground"
                      }`}>
                        {student.isActive ? "نشط" : "غير نشط"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

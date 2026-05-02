"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  User,
  Mail,
  Phone,
  Lock,
  Bell,
  Palette,
  Globe,
  CreditCard,
  Shield,
  Save,
  Camera,
} from "lucide-react"
import { CURRENCY } from "@/lib/config"

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("profile")

  const tabs = [
    { id: "profile", label: "الملف الشخصي", icon: User },
    { id: "notifications", label: "الإشعارات", icon: Bell },
    { id: "appearance", label: "المظهر", icon: Palette },
    { id: "subscription", label: "الاشتراكات", icon: CreditCard },
    { id: "security", label: "الأمان", icon: Shield },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">الإعدادات</h1>
        <p className="text-muted-foreground">إدارة إعدادات حسابك والتطبيق</p>
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <Card className="border-0 shadow-sm lg:col-span-1 h-fit">
          <CardContent className="p-2">
            <nav className="space-y-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-right transition-colors ${
                    activeTab === tab.id
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <tab.icon className="h-5 w-5" />
                  <span className="font-medium">{tab.label}</span>
                </button>
              ))}
            </nav>
          </CardContent>
        </Card>

        {/* Content */}
        <div className="lg:col-span-3 space-y-6">
          {/* Profile Settings */}
          {activeTab === "profile" && (
            <>
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle>الملف الشخصي</CardTitle>
                  <CardDescription>تحديث معلوماتك الشخصية</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Avatar */}
                  <div className="flex items-center gap-6">
                    <div className="relative">
                      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
                        <span className="text-3xl font-bold text-primary-foreground">م</span>
                      </div>
                      <button className="absolute bottom-0 right-0 w-8 h-8 bg-background border border-border rounded-full flex items-center justify-center shadow-sm hover:bg-muted transition-colors">
                        <Camera className="h-4 w-4 text-muted-foreground" />
                      </button>
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">أ. محمد أحمد</h3>
                      <p className="text-sm text-muted-foreground">معلم الفيزياء</p>
                    </div>
                  </div>

                  {/* Form */}
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-foreground mb-1.5 block">
                        الاسم الكامل
                      </label>
                      <div className="relative">
                        <User className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input defaultValue="محمد أحمد" className="pr-10" />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground mb-1.5 block">
                        البريد الإلكتروني
                      </label>
                      <div className="relative">
                        <Mail className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input defaultValue="mohamed@physics.com" className="pr-10" />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground mb-1.5 block">
                        رقم الهاتف
                      </label>
                      <div className="relative">
                        <Phone className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input defaultValue="01234567890" className="pr-10" />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground mb-1.5 block">
                        المادة
                      </label>
                      <div className="relative">
                        <Globe className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input defaultValue="الفيزياء" className="pr-10" />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">
                      نبذة تعريفية
                    </label>
                    <Textarea
                      rows={4}
                      defaultValue="معلم فيزياء بخبرة أكثر من 10 سنوات في التدريس. متخصص في تبسيط المفاهيم الفيزيائية المعقدة."
                    />
                  </div>

                  <Button className="gap-2">
                    <Save className="h-4 w-4" />
                    حفظ التغييرات
                  </Button>
                </CardContent>
              </Card>
            </>
          )}

          {/* Notifications Settings */}
          {activeTab === "notifications" && (
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle>إعدادات الإشعارات</CardTitle>
                <CardDescription>التحكم في الإشعارات التي تصلك</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { id: "new_student", label: "طالب جديد", desc: "عند تسجيل طالب جديد" },
                  { id: "new_message", label: "رسالة جديدة", desc: "عند استلام رسالة من طالب" },
                  { id: "subscription", label: "الاشتراكات", desc: "عند اشتراك أو إلغاء اشتراك" },
                  { id: "report", label: "التقارير", desc: "تقارير أسبوعية عن النشاط" },
                ].map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-4 bg-muted/50 rounded-xl"
                  >
                    <div>
                      <p className="font-medium text-foreground">{item.label}</p>
                      <p className="text-sm text-muted-foreground">{item.desc}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" defaultChecked className="sr-only peer" />
                      <div className="w-11 h-6 bg-muted rounded-full peer peer-checked:after:translate-x-full peer-checked:after:-translate-x-full rtl:peer-checked:after:translate-x-full peer-checked:bg-primary after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                    </label>
                  </div>
                ))}

                <Button className="gap-2">
                  <Save className="h-4 w-4" />
                  حفظ التغييرات
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Appearance Settings */}
          {activeTab === "appearance" && (
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle>المظهر</CardTitle>
                <CardDescription>تخصيص مظهر التطبيق</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <label className="text-sm font-medium text-foreground mb-3 block">
                    السمة
                  </label>
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { id: "light", label: "فاتح" },
                      { id: "dark", label: "داكن" },
                      { id: "system", label: "النظام" },
                    ].map((theme) => (
                      <button
                        key={theme.id}
                        className="p-4 rounded-xl border-2 border-muted hover:border-primary/50 transition-colors text-center"
                      >
                        <div className={`w-full h-12 rounded-lg mb-2 ${
                          theme.id === "light" ? "bg-white border" :
                          theme.id === "dark" ? "bg-gray-900" :
                          "bg-gradient-to-r from-white to-gray-900"
                        }`} />
                        <span className="text-sm font-medium">{theme.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-3 block">
                    اللون الأساسي
                  </label>
                  <div className="flex gap-3">
                    {["#1E3A5F", "#2563eb", "#7c3aed", "#059669", "#dc2626"].map((color) => (
                      <button
                        key={color}
                        className="w-10 h-10 rounded-full border-2 border-transparent hover:border-foreground/20 transition-colors"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>

                <Button className="gap-2">
                  <Save className="h-4 w-4" />
                  حفظ التغييرات
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Subscription Settings */}
          {activeTab === "subscription" && (
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle>إعدادات الاشتراكات</CardTitle>
                <CardDescription>إدارة خطط الاشتراك وأسعارها</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {[
                  { name: "الاشتراك الشهري", price: "100", period: "شهر" },
                  { name: "الاشتراك السنوي", price: "900", period: "سنة" },
                  { name: "الاشتراك المميز", price: "150", period: "شهر" },
                ].map((plan, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 bg-muted/50 rounded-xl"
                  >
                    <div>
                      <p className="font-medium text-foreground">{plan.name}</p>
                      <p className="text-sm text-muted-foreground">{plan.price} {CURRENCY.labelAr} / {plan.period}</p>
                    </div>
                    <Button variant="outline" size="sm">
                      تعديل
                    </Button>
                  </div>
                ))}

                <Button className="gap-2">
                  <Save className="h-4 w-4" />
                  حفظ التغييرات
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Security Settings */}
          {activeTab === "security" && (
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle>الأمان</CardTitle>
                <CardDescription>إعدادات الأمان وكلمة المرور</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">
                    كلمة المرور الحالية
                  </label>
                  <div className="relative">
                    <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input type="password" placeholder="أدخل كلمة المرور الحالية" className="pr-10" />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">
                    كلمة المرور الجديدة
                  </label>
                  <div className="relative">
                    <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input type="password" placeholder="أدخل كلمة المرور الجديدة" className="pr-10" />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">
                    تأكيد كلمة المرور
                  </label>
                  <div className="relative">
                    <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input type="password" placeholder="أعد إدخال كلمة المرور الجديدة" className="pr-10" />
                  </div>
                </div>

                <Button className="gap-2">
                  <Save className="h-4 w-4" />
                  تحديث كلمة المرور
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

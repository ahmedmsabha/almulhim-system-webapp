"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Plus,
  MoreVertical,
  Edit,
  Trash2,
  Megaphone,
  Calendar,
  Pin,
  PinOff,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { sampleAnnouncements } from "@/lib/sample-data"
import type { Announcement } from "@/types"

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>(sampleAnnouncements)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null)

  const togglePin = (id: string) => {
    setAnnouncements((prev) =>
      prev.map((a) => (a.id === id ? { ...a, is_pinned: !a.is_pinned } : a))
    )
  }

  const deleteAnnouncement = (id: string) => {
    setAnnouncements((prev) => prev.filter((a) => a.id !== id))
  }

  // Sort by pinned first, then by date
  const sortedAnnouncements = [...announcements].sort((a, b) => {
    if (a.is_pinned && !b.is_pinned) return -1
    if (!a.is_pinned && b.is_pinned) return 1
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })

  const getPriorityColor = (priority: string | undefined) => {
    switch (priority) {
      case "urgent":
        return "bg-destructive/10 text-destructive"
      case "high":
        return "bg-chart-4/10 text-chart-4"
      case "medium":
        return "bg-primary/10 text-primary"
      case "normal":
        return "bg-primary/10 text-primary"
      case "low":
        return "bg-muted text-muted-foreground"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  const getPriorityLabel = (priority: string | undefined) => {
    switch (priority) {
      case "urgent":
        return "عاجل"
      case "high":
        return "مهم"
      case "medium":
        return "متوسط"
      case "normal":
        return "عادي"
      case "low":
        return "منخفض"
      default:
        return "منخفض"
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">الإعلانات</h1>
          <p className="text-muted-foreground">إجمالي {announcements.length} إعلان</p>
        </div>
        <Button onClick={() => setShowAddDialog(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          إضافة إعلان
        </Button>
      </div>

      {/* Announcements List */}
      <div className="grid gap-4">
        {sortedAnnouncements.map((announcement) => (
          <Card
            key={announcement.id}
            className={`border-0 shadow-sm hover:shadow-md transition-shadow ${
              announcement.is_pinned ? "ring-2 ring-primary/20" : ""
            }`}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div
                  className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${
                    announcement.priority === "urgent"
                      ? "bg-destructive/10"
                      : announcement.priority === "high"
                        ? "bg-chart-4/10"
                        : "bg-primary/10"
                  }`}
                >
                  <Megaphone
                    className={`h-5 w-5 ${
                      announcement.priority === "urgent"
                        ? "text-destructive"
                        : announcement.priority === "high"
                          ? "text-chart-4"
                          : "text-primary"
                    }`}
                  />
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="flex items-center gap-2 font-semibold text-foreground">
                        {announcement.is_pinned && <Pin className="h-4 w-4 text-primary" />}
                        {announcement.title}
                      </h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {announcement.body}
                      </p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        <DropdownMenuItem onClick={() => setEditingAnnouncement(announcement)}>
                          <Edit className="ml-2 h-4 w-4" />
                          تعديل
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => togglePin(announcement.id)}>
                          {announcement.is_pinned ? (
                            <>
                              <PinOff className="ml-2 h-4 w-4" />
                              إلغاء التثبيت
                            </>
                          ) : (
                            <>
                              <Pin className="ml-2 h-4 w-4" />
                              تثبيت
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => deleteAnnouncement(announcement.id)}
                        >
                          <Trash2 className="ml-2 h-4 w-4" />
                          حذف
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Meta Info */}
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span
                      className={`rounded-full px-2 py-1 ${getPriorityColor(announcement.priority)}`}
                    >
                      {getPriorityLabel(announcement.priority)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(announcement.created_at).toLocaleDateString("ar-EG")}
                    </span>
                    {announcement.targetAudience !== "all" && (
                      <span className="rounded-full bg-muted px-2 py-1">
                        {announcement.targetAudience === "premium" ? "المشتركين فقط" : "المجانيين فقط"}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {announcements.length === 0 && (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-8 text-center">
            <Megaphone className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">لا يوجد إعلانات حالياً</p>
          </CardContent>
        </Card>
      )}

      {/* Add/Edit Dialog */}
      <Dialog
        open={showAddDialog || !!editingAnnouncement}
        onOpenChange={() => {
          setShowAddDialog(false)
          setEditingAnnouncement(null)
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingAnnouncement ? "تعديل الإعلان" : "إضافة إعلان جديد"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">عنوان الإعلان</label>
              <Input placeholder="أدخل عنوان الإعلان" defaultValue={editingAnnouncement?.title} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">محتوى الإعلان</label>
              <Textarea
                placeholder="أدخل محتوى الإعلان"
                rows={4}
                defaultValue={editingAnnouncement?.content ?? editingAnnouncement?.body}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">الأولوية</label>
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  defaultValue={editingAnnouncement?.priority || "normal"}
                >
                  <option value="low">منخفض</option>
                  <option value="normal">عادي</option>
                  <option value="medium">متوسط</option>
                  <option value="high">مهم</option>
                  <option value="urgent">عاجل</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">الجمهور المستهدف</label>
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  defaultValue={editingAnnouncement?.targetAudience || "all"}
                >
                  <option value="all">جميع الطلاب</option>
                  <option value="premium">المشتركين فقط</option>
                  <option value="free">المجانيين فقط</option>
                </select>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="is_pinned"
                className="h-4 w-4 rounded border-gray-300"
                defaultChecked={editingAnnouncement?.is_pinned}
              />
              <label htmlFor="is_pinned" className="text-sm text-foreground">
                تثبيت الإعلان في الأعلى
              </label>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowAddDialog(false)
                setEditingAnnouncement(null)
              }}
            >
              إلغاء
            </Button>
            <Button
              onClick={() => {
                setShowAddDialog(false)
                setEditingAnnouncement(null)
              }}
            >
              {editingAnnouncement ? "حفظ التعديلات" : "نشر الإعلان"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

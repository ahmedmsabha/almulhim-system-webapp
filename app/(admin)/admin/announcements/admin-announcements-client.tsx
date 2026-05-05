"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  Calendar,
  Edit,
  Megaphone,
  MoreVertical,
  Pin,
  PinOff,
  Plus,
  Trash2,
} from "lucide-react"
import { toast } from "sonner"

import {
  createAnnouncement,
  deleteAnnouncementAction,
  getAnnouncementsAdmin,
  toggleAnnouncementPinAction,
  updateAnnouncementAction,
} from "@/actions/announcements"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { queryKeys } from "@/lib/query-keys"
import type { Announcement } from "@/types"

export function AdminAnnouncementsClient() {
  const queryClient = useQueryClient()

  const invalidateAnnouncements = useCallback(async () => {
    try {
      await queryClient.invalidateQueries({ queryKey: queryKeys.adminAnnouncements() })
    } catch {
      /* ignore */
    }
  }, [queryClient])

  const { data: announcements = [] } = useQuery({
    queryKey: queryKeys.adminAnnouncements(),
    queryFn: async () => {
      try {
        const res = await getAnnouncementsAdmin()
        if (!res.success) {
          throw new Error(res.error)
        }
        return res.data
      } catch (e) {
        throw e instanceof Error ? e : new Error("فشل تحميل الإعلانات")
      }
    },
  })

  const [showAddDialog, setShowAddDialog] = useState(false)
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null)
  const [formTitle, setFormTitle] = useState("")
  const [formBody, setFormBody] = useState("")
  const [formPinned, setFormPinned] = useState(false)
  const [formPublished, setFormPublished] = useState(true)

  useEffect(() => {
    if (editingAnnouncement) {
      setFormTitle(editingAnnouncement.title)
      setFormBody(editingAnnouncement.body)
      setFormPinned(editingAnnouncement.is_pinned)
      setFormPublished(editingAnnouncement.is_published)
      return
    }
    if (showAddDialog) {
      setFormTitle("")
      setFormBody("")
      setFormPinned(false)
      setFormPublished(true)
    }
  }, [editingAnnouncement, showAddDialog])

  const createMut = useMutation({
    mutationFn: async (input: {
      title: string
      body: string
      is_pinned: boolean
      is_published: boolean
    }) => {
      try {
        const res = await createAnnouncement(input)
        if (!res.success) {
          throw new Error(res.error)
        }
        return res.data
      } catch (e) {
        throw e instanceof Error ? e : new Error("فشل الإنشاء")
      }
    },
    onSuccess: () => {
      toast.success("تم نشر الإعلان")
      setShowAddDialog(false)
      setEditingAnnouncement(null)
    },
    onError: (err: Error) => {
      toast.error(err.message)
    },
    onSettled: invalidateAnnouncements,
  })

  const updateMut = useMutation({
    mutationFn: async (vars: {
      id: string
      patch: {
        title: string
        body: string
        is_pinned: boolean
        is_published: boolean
      }
    }) => {
      try {
        const res = await updateAnnouncementAction(vars.id, vars.patch)
        if (!res.success) {
          throw new Error(res.error)
        }
        return res.data
      } catch (e) {
        throw e instanceof Error ? e : new Error("فشل الحفظ")
      }
    },
    onSuccess: () => {
      toast.success("تم حفظ التعديلات")
      setShowAddDialog(false)
      setEditingAnnouncement(null)
    },
    onError: (err: Error) => {
      toast.error(err.message)
    },
    onSettled: invalidateAnnouncements,
  })

  const togglePinMut = useMutation({
    mutationFn: async (vars: { id: string; isPinned: boolean }) => {
      try {
        const res = await toggleAnnouncementPinAction(vars.id, vars.isPinned)
        if (!res.success) {
          throw new Error(res.error)
        }
        return res.data
      } catch (e) {
        throw e instanceof Error ? e : new Error("فشل تحديث التثبيت")
      }
    },
    onError: (err: Error) => {
      toast.error(err.message)
    },
    onSettled: invalidateAnnouncements,
  })

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      try {
        const res = await deleteAnnouncementAction(id)
        if (!res.success) {
          throw new Error(res.error)
        }
        return res.data
      } catch (e) {
        throw e instanceof Error ? e : new Error("فشل الحذف")
      }
    },
    onSuccess: () => {
      toast.success("تم حذف الإعلان")
    },
    onError: (err: Error) => {
      toast.error(err.message)
    },
    onSettled: invalidateAnnouncements,
  })

  const sortedAnnouncements = useMemo(() => {
    return [...announcements].sort((a, b) => {
      if (a.is_pinned && !b.is_pinned) return -1
      if (!a.is_pinned && b.is_pinned) return 1
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })
  }, [announcements])

  const dialogBusy = createMut.isPending || updateMut.isPending

  async function handleSave() {
    const title = formTitle.trim()
    const body = formBody.trim()
    if (!title || !body) {
      toast.error("أدخل العنوان والمحتوى")
      return
    }
    try {
      if (editingAnnouncement) {
        await updateMut.mutateAsync({
          id: editingAnnouncement.id,
          patch: {
            title,
            body,
            is_pinned: formPinned,
            is_published: formPublished,
          },
        })
      } else {
        await createMut.mutateAsync({
          title,
          body,
          is_pinned: formPinned,
          is_published: formPublished,
        })
      }
    } catch {
      /* toast من الـ mutation */
    }
  }

  function closeDialog() {
    setShowAddDialog(false)
    setEditingAnnouncement(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">الإعلانات</h1>
          <p className="text-muted-foreground">إجمالي {announcements.length} إعلان</p>
        </div>
        <Button
          type="button"
          onClick={() => {
            setEditingAnnouncement(null)
            setShowAddDialog(true)
          }}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          إضافة إعلان
        </Button>
      </div>

      <div className="grid gap-4">
        {sortedAnnouncements.map((announcement) => (
          <Card
            key={announcement.id}
            className={`border-0 shadow-sm transition-shadow hover:shadow-md ${
              announcement.is_pinned ? "ring-2 ring-primary/20" : ""
            }`}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10">
                  <Megaphone className="h-5 w-5 text-primary" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="flex items-center gap-2 font-semibold text-foreground">
                        {announcement.is_pinned && <Pin className="h-4 w-4 text-primary" />}
                        {announcement.title}
                      </h3>
                      <p className="mt-1 text-sm text-muted-foreground">{announcement.body}</p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        <DropdownMenuItem
                          onClick={() => {
                            setShowAddDialog(false)
                            setEditingAnnouncement(announcement)
                          }}
                        >
                          <Edit className="ml-2 h-4 w-4" />
                          تعديل
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            void (async () => {
                              try {
                                await togglePinMut.mutateAsync({
                                  id: announcement.id,
                                  isPinned: !announcement.is_pinned,
                                })
                              } catch {
                                /* toast من الـ mutation */
                              }
                            })()
                          }}
                        >
                          {announcement.is_pinned ?
                            <>
                              <PinOff className="ml-2 h-4 w-4" />
                              إلغاء التثبيت
                            </>
                          : <>
                              <Pin className="ml-2 h-4 w-4" />
                              تثبيت
                            </>
                          }
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => {
                            void (async () => {
                              try {
                                await deleteMut.mutateAsync(announcement.id)
                              } catch {
                                /* toast من الـ mutation */
                              }
                            })()
                          }}
                        >
                          <Trash2 className="ml-2 h-4 w-4" />
                          حذف
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    {!announcement.is_published && (
                      <span className="rounded-full bg-muted px-2 py-1">مسودة</span>
                    )}
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(announcement.created_at).toLocaleDateString("ar-EG")}
                    </span>
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

      <Dialog open={showAddDialog || !!editingAnnouncement} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingAnnouncement ? "تعديل الإعلان" : "إضافة إعلان جديد"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">عنوان الإعلان</label>
              <Input
                placeholder="أدخل عنوان الإعلان"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                dir="rtl"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">محتوى الإعلان</label>
              <Textarea
                placeholder="أدخل محتوى الإعلان"
                rows={4}
                value={formBody}
                onChange={(e) => setFormBody(e.target.value)}
                dir="rtl"
              />
            </div>
            <div className="flex flex-col gap-3">
              <label className="flex items-center gap-3 text-sm text-foreground">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300"
                  checked={formPinned}
                  onChange={(e) => setFormPinned(e.target.checked)}
                />
                تثبيت الإعلان في الأعلى
              </label>
              <label className="flex items-center gap-3 text-sm text-foreground">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300"
                  checked={formPublished}
                  onChange={(e) => setFormPublished(e.target.checked)}
                />
                نشر للطلاب
              </label>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={closeDialog} disabled={dialogBusy}>
              إلغاء
            </Button>
            <Button type="button" onClick={() => void handleSave()} disabled={dialogBusy}>
              {editingAnnouncement ? "حفظ التعديلات" : "نشر الإعلان"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

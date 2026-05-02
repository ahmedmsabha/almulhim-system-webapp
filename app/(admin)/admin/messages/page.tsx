"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Search,
  MoreVertical,
  Mail,
  MailOpen,
  Trash2,
  Reply,
  Clock,
  User,
  Send,
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
import { sampleMessages, sampleStudents } from "@/lib/sample-data"
import type { Message } from "@/types"

function messagePreviewTitle(m: Message): string {
  const t = m.content.trim().split("\n")[0] ?? ""
  return t.length <= 64 ? t : `${t.slice(0, 64)}…`
}

export default function MessagesPage() {
  const [messages, setMessages] = useState<Message[]>(sampleMessages)
  const [searchQuery, setSearchQuery] = useState("")
  const [filter, setFilter] = useState<"all" | "unread" | "read">("all")
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null)
  const [replyText, setReplyText] = useState("")

  const filteredMessages = messages.filter((message) => {
    const student = sampleStudents.find((s) => s.id === message.sender_id)
    const haystack =
      `${message.content} ${student?.full_name ?? ""}`.toLowerCase()
    const matchesSearch = haystack.includes(searchQuery.toLowerCase())

    const matchesFilter =
      filter === "all" ||
      (filter === "unread" && !message.is_read) ||
      (filter === "read" && message.is_read)

    return matchesSearch && matchesFilter
  })

  const markAsRead = (id: string) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, is_read: true } : m))
    )
  }

  const markAsUnread = (id: string) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, is_read: false } : m))
    )
  }

  const deleteMessage = (id: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== id))
    setSelectedMessage(null)
  }

  const getStudentName = (studentId: string) => {
    const student = sampleStudents.find((s) => s.id === studentId)
    return student?.full_name || "طالب غير معروف"
  }

  const handleOpenMessage = (message: Message) => {
    setSelectedMessage(message)
    if (!message.is_read) {
      markAsRead(message.id)
    }
  }

  const unreadCount = messages.filter((m) => !m.is_read).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">الرسائل</h1>
          <p className="text-muted-foreground">
            {unreadCount > 0 ? `${unreadCount} رسالة غير مقروءة` : "لا توجد رسائل جديدة"}
          </p>
        </div>
      </div>

      {/* Search and Filter */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="البحث في الرسائل..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10"
              />
            </div>
            <div className="flex gap-2">
              {[
                { value: "all", label: "الكل" },
                { value: "unread", label: "غير مقروء" },
                { value: "read", label: "مقروء" },
              ].map((f) => (
                <Button
                  key={f.value}
                  variant={filter === f.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilter(f.value as typeof filter)}
                >
                  {f.label}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Messages List */}
      <div className="grid gap-3">
        {filteredMessages.map((message) => (
          <Card
            key={message.id}
            className={`cursor-pointer border-0 shadow-sm transition-all hover:shadow-md ${
              !message.is_read ? "bg-primary/5 ring-1 ring-primary/20" : ""
            }`}
            onClick={() => handleOpenMessage(message)}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                <div
                  className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${
                    message.is_read ? "bg-muted" : "bg-primary/10"
                  }`}
                >
                  {message.is_read ? (
                    <MailOpen className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <Mail className="h-5 w-5 text-primary" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3
                        className={`font-semibold ${!message.is_read ? "text-foreground" : "text-muted-foreground"}`}
                      >
                        {messagePreviewTitle(message)}
                      </h3>
                      <p className="mt-0.5 flex items-center gap-1 text-sm text-muted-foreground">
                        <User className="h-3 w-3" />
                        {getStudentName(message.sender_id)}
                      </p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation()
                            handleOpenMessage(message)
                          }}
                        >
                          <Reply className="ml-2 h-4 w-4" />
                          الرد
                        </DropdownMenuItem>
                        {message.is_read ? (
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation()
                              markAsUnread(message.id)
                            }}
                          >
                            <Mail className="ml-2 h-4 w-4" />
                            تحديد كغير مقروء
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation()
                              markAsRead(message.id)
                            }}
                          >
                            <MailOpen className="ml-2 h-4 w-4" />
                            تحديد كمقروء
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={(e) => {
                            e.stopPropagation()
                            deleteMessage(message.id)
                          }}
                        >
                          <Trash2 className="ml-2 h-4 w-4" />
                          حذف
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{message.content}</p>

                  <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {new Date(message.created_at).toLocaleDateString("ar-EG", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredMessages.length === 0 && (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-8 text-center">
            <Mail className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">لا توجد رسائل</p>
          </CardContent>
        </Card>
      )}

      <Dialog
        open={!!selectedMessage}
        onOpenChange={() => {
          setSelectedMessage(null)
          setReplyText("")
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {selectedMessage ? messagePreviewTitle(selectedMessage) : ""}
            </DialogTitle>
          </DialogHeader>
          {selectedMessage && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 border-b border-border pb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{getStudentName(selectedMessage.sender_id)}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(selectedMessage.created_at).toLocaleDateString("ar-EG", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>

              <div className="rounded-xl bg-muted/50 p-4">
                <p className="whitespace-pre-wrap text-foreground">{selectedMessage.content}</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">الرد</label>
                <Textarea
                  placeholder="اكتب ردك هنا..."
                  rows={4}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setSelectedMessage(null)
                setReplyText("")
              }}
            >
              إغلاق
            </Button>
            <Button className="gap-2" disabled={!replyText.trim()}>
              <Send className="h-4 w-4" />
              إرسال الرد
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

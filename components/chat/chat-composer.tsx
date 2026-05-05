"use client"

import { useCallback, useRef, useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { FileImage, FileText, Loader2, Mic, Send, Square, X } from "lucide-react"

import { requestChatAttachmentUploads } from "@/actions/chat-upload"
import {
  MAX_CHAT_ATTACHMENTS_PER_MESSAGE,
  classifyFileForChat,
} from "@/lib/chat/attachment-rules"
import { uploadChatAttachmentViaSignedToken } from "@/lib/client/chat-upload-xhr"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import type { ChatAttachmentKind, Message, MessageAttachment } from "@/types"
import type { ActionResult } from "@/types/api"

type SendFn = (
  text: string,
  attachments: MessageAttachment[]
) => Promise<ActionResult<Message>>

export function ChatComposer({
  conversationId,
  viewerUserId,
  messagesQueryKey,
  senderRole,
  disabled,
  onSend,
}: {
  conversationId: string
  viewerUserId: string
  messagesQueryKey: readonly unknown[]
  senderRole: "student" | "admin"
  disabled?: boolean
  onSend: SendFn
}) {
  const queryClient = useQueryClient()
  const [text, setText] = useState("")
  const [preparing, setPreparing] = useState(false)
  const [pending, setPending] = useState<
    { file: File; kind: ChatAttachmentKind }[]
  >([])
  const [recording, setRecording] = useState(false)
  const recRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const imgInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const clearPending = () => setPending([])

  const sendMutation = useMutation({
    mutationFn: async (payload: { text: string; attachments: MessageAttachment[] }) => {
      try {
        const result = await onSend(payload.text, payload.attachments)
        if (!result.success) {
          throw new Error(result.error)
        }
        return result.data
      } catch (e) {
        throw e instanceof Error ? e : new Error("فشل الإرسال")
      }
    },
    onMutate: async (vars) => {
      try {
        await queryClient.cancelQueries({ queryKey: messagesQueryKey })
      } catch {
        /* ignore */
      }

      const previousMessages = queryClient.getQueryData<Message[]>(messagesQueryKey)

      const optimistic: Message = {
        id: `temp-${Date.now()}`,
        conversation_id: conversationId,
        sender_id: viewerUserId,
        sender_role: senderRole,
        content: vars.text,
        attachments: vars.attachments.map((a) => ({ ...a })),
        is_read: false,
        created_at: new Date().toISOString(),
      }

      queryClient.setQueryData<Message[]>(messagesQueryKey, (old) => [...(old ?? []), optimistic])

      return { previousMessages }
    },
    onError: (_err, _vars, context) => {
      try {
        if (context?.previousMessages !== undefined) {
          queryClient.setQueryData(messagesQueryKey, context.previousMessages)
        }
      } catch {
        /* ignore */
      }
      toast.error("تعذر الإرسال")
    },
    onSuccess: () => {
      try {
        setText("")
        clearPending()
      } catch {
        /* ignore */
      }
    },
    onSettled: async () => {
      try {
        await queryClient.invalidateQueries({ queryKey: messagesQueryKey })
      } catch {
        /* ignore */
      }
    },
  })

  const busy = preparing || sendMutation.isPending

  const addFiles = useCallback(
    (files: FileList | File[], mode: "image" | "file") => {
      const arr = [...files]
      if (!arr.length) return

      const classified = arr.map((f) => ({
        file: f,
        kind: classifyFileForChat(f),
      }))

      const invalid = classified.find(
        (c) => !c.kind || (mode === "image" && c.kind !== "image") || (mode === "file" && c.kind === "image")
      )
      if (invalid) {
        toast.error(
          mode === "image" ?
            "اختر صوراً فقط (حتى ٥)"
          : "اختر ملفات PDF أو صوتية فقط (حتى ٥)"
        )
        return
      }

      setPending((prev) => {
        const next = [...prev]
        for (const c of classified) {
          if (!c.kind) continue
          if (next.length >= MAX_CHAT_ATTACHMENTS_PER_MESSAGE) {
            toast.message("الحد الأقصى ٥ مرفقات في الرسالة")
            break
          }
          if (next.length) {
            const prevIsImg = next[0]!.kind === "image"
            const addIsImg = c.kind === "image"
            if (prevIsImg !== addIsImg) {
              toast.error("لا يمكن خلط الصور مع الملفات")
              return prev
            }
          }
          next.push({ file: c.file, kind: c.kind })
        }
        return next
      })
    },
    []
  )

  const stopRecording = useCallback(() => {
    const r = recRef.current
    if (r && r.state !== "inactive") {
      r.stop()
    }
    recRef.current = null
    setRecording(false)
  }, [])

  const startRecording = async () => {
    if (busy || disabled || pending.length) return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      chunksRef.current = []
      let mr: MediaRecorder
      try {
        mr = new MediaRecorder(stream, { mimeType: "audio/webm" })
      } catch {
        mr = new MediaRecorder(stream)
      }
      mr.ondataavailable = (ev) => {
        if (ev.data.size) chunksRef.current.push(ev.data)
      }
      mr.onstop = () => {
        stream.getTracks().forEach((t) => t.stop())
        const blob = new Blob(chunksRef.current, { type: "audio/webm" })
        if (blob.size < 1) return
        const file = new File([blob], `voice-${Date.now()}.webm`, {
          type: "audio/webm",
        })
        setPending([{ file, kind: "audio" }])
      }
      mr.start()
      recRef.current = mr
      setRecording(true)
    } catch {
      toast.error("تعذر الوصول للميكروفون")
    }
  }

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    const t = text.trim()
    if ((!t && !pending.length) || busy || disabled) return

    setPreparing(true)
    try {
      let attachments: MessageAttachment[] = []
      if (pending.length) {
        try {
          const sign = await requestChatAttachmentUploads({
            conversationId,
            items: pending.map((p) => ({
              fileName: p.file.name,
              mimeType: p.file.type || "application/octet-stream",
              kind: p.kind,
              sizeBytes: p.file.size,
            })),
          })
          if (!sign.success) {
            toast.error(sign.error)
            return
          }

          await Promise.all(
            sign.data.map((slot, i) =>
              uploadChatAttachmentViaSignedToken({
                storagePath: slot.path,
                token: slot.token,
                file: pending[i]!.file,
              })
            )
          )

          attachments = pending.map((p, i) => ({
            kind: p.kind,
            storage_path: sign.data[i]!.path,
            file_name: p.file.name,
            mime_type: p.file.type || "application/octet-stream",
            size_bytes: p.file.size,
          }))
        } catch {
          toast.error("تعذر تجهيز المرفقات")
          return
        }
      }

      try {
        sendMutation.mutate({ text: t, attachments })
      } catch {
        toast.error("تعذر الإرسال")
      }
    } finally {
      setPreparing(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-2 border-t p-3 sm:p-4">
      {pending.length > 0 && (
        <div className="flex flex-wrap gap-2 rounded-lg border bg-muted/40 p-2">
          {pending.map((p, i) => (
            <div
              key={`${p.file.name}-${i}`}
              className="flex items-center gap-1 rounded-md bg-background px-2 py-1 text-xs"
            >
              <span className="max-w-[140px] truncate">{p.file.name}</span>
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground"
                onClick={() => setPending((prev) => prev.filter((_, j) => j !== i))}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2">
        <input
          ref={imgInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            const f = e.target.files
            if (f?.length) addFiles(f, "image")
            e.target.value = ""
          }}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,audio/*,video/webm"
          multiple
          className="hidden"
          onChange={(e) => {
            const f = e.target.files
            if (f?.length) addFiles(f, "file")
            e.target.value = ""
          }}
        />

        <Button
          type="button"
          variant="outline"
          size="icon"
          className="shrink-0"
          disabled={busy || disabled || recording}
          onClick={() => imgInputRef.current?.click()}
          title="صور (حتى ٥)"
        >
          <FileImage className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="shrink-0"
          disabled={busy || disabled || recording}
          onClick={() => fileInputRef.current?.click()}
          title="PDF أو صوت"
        >
          <FileText className="h-4 w-4" />
        </Button>

        {recording ?
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="shrink-0"
            onClick={stopRecording}
            title="إيقاف التسجيل"
          >
            <Square className="h-4 w-4 fill-current" />
          </Button>
        : <Button
            type="button"
            variant="outline"
            size="icon"
            className="shrink-0"
            disabled={busy || disabled || !!pending.length}
            onClick={startRecording}
            title="تسجيل صوتي"
          >
            <Mic className="h-4 w-4" />
          </Button>
        }

        <Input
          placeholder="اكتب رسالتك..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="flex-1"
          disabled={busy || disabled}
          dir="rtl"
        />

        <Button
          type="submit"
          size="icon"
          disabled={
            busy || disabled || (!text.trim() && !pending.length) || recording
          }
          className={cn("shrink-0", busy && "relative")}
        >
          {busy ?
            <Loader2 className="h-4 w-4 animate-spin" />
          : <Send className="h-4 w-4" />}
        </Button>
      </div>
      {recording && (
        <p className="text-center text-xs text-destructive">جارٍ التسجيل… اضغط المربع للإيقاف</p>
      )}
    </form>
  )
}

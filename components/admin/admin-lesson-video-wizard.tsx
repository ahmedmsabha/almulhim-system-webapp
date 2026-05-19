"use client"

import { useRouter } from "next/navigation"

import { LessonVideoUploader } from "@/components/admin/lesson-video-uploader"

/**
 * معالج رفع درس بالخطوات — نفس مسار R2 + عامل التحويل الذي يستخدمه LessonVideoUploader.
 */
export function AdminLessonVideoWizard({
  lessonId,
  hlsUrl,
  disabled = false,
  transcoderWorkerQueueConfigured = true,
  onUploadComplete,
  onReady,
}: {
  lessonId: string
  hlsUrl: string | null
  disabled?: boolean
  transcoderWorkerQueueConfigured?: boolean
  onUploadComplete?: (payload: { sourceR2Key: string; relativePath: string }) => void
  /** بعد ظهور رابط HLS في قاعدة البيانات (بعد تحديث الصفحة / الملخّص) */
  onReady?: () => void
}) {
  const router = useRouter()

  return (
    <LessonVideoUploader
      lessonId={lessonId}
      currentHlsUrl={hlsUrl}
      disabled={disabled}
      transcoderWorkerQueueConfigured={transcoderWorkerQueueConfigured}
      onUploadComplete={onUploadComplete}
      onSuccess={() => {
        router.refresh()
        onReady?.()
      }}
    />
  )
}

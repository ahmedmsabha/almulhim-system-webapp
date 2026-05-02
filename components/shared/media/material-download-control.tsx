'use client'

import { DownloadButton, type DownloadButtonProps } from '@/components/shared/media/download-button'
import { useStudentPdfOffline } from '@/lib/client/use-student-pdf-offline'

type Props = Omit<DownloadButtonProps, 'onDownload' | 'status' | 'onRemove'> & {
  materialId: string
  /** حالة تجريبيّة من الخادم (غالباً غير مستخدم حالياً) */
  serverHint?: NonNullable<Parameters<typeof useStudentPdfOffline>[1]>
}

/**
 * تنزيل PDF للطالب عبر مسار الطلب المحمّي ثم IndexedDB؛ لا يفتح روابط عامة لتخزين.
 */
export function MaterialDownloadControl({ materialId, serverHint = 'not_downloaded', ...props }: Props) {
  const { displayStatus, download, remove } = useStudentPdfOffline(materialId, serverHint)

  return (
    <DownloadButton {...props} status={displayStatus} onDownload={download} onRemove={remove} />
  )
}

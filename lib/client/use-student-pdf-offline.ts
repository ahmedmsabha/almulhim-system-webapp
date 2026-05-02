"use client"

import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import {
  deletePdfOffline,
  dispatchPdfOfflineChanged,
  getPdfOffline,
  pdfOfflineExists,
  PDF_OFFLINE_CHANGED,
  putPdfOffline,
} from "@/lib/client/pdf-offline-db"
import type { DownloadStatus } from "@/types"

/**
 * تنزيل الملف إلى IndexedDB بعد جلب متحقق من مسار الطالب، وحالة الشارة المحلية.
 */
export function useStudentPdfOffline(materialId: string, serverHint?: DownloadStatus) {
  const [cached, setCached] = useState(false)
  const [busy, setBusy] = useState(false)

  const refresh = useCallback(async () => {
    setCached(await pdfOfflineExists(materialId))
  }, [materialId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    const h = (ev: Event) => {
      const ce = ev as CustomEvent<{ materialId?: string }>
      if (ce.detail?.materialId !== materialId) return
      void refresh()
    }
    window.addEventListener(PDF_OFFLINE_CHANGED, h)
    return () => window.removeEventListener(PDF_OFFLINE_CHANGED, h)
  }, [materialId, refresh])

  const displayStatus: DownloadStatus =
    busy ? "downloading" : cached ? "downloaded" : (serverHint ?? "not_downloaded")

  const download = useCallback(async () => {
    if (busy || cached) return
    setBusy(true)
    try {
      const res = await fetch(`/api/student/pdf/${materialId}`, {
        credentials: "include",
        cache: "no-store",
      })
      if (!res.ok) {
        const msg =
          res.status === 401 ? "سجّل الدخول أولاً."
          : res.status === 403 ? "الاشتراك غير فعّال أو انتهى."
          : "تعذّر جلب الملف."
        toast.error(msg)
        return
      }
      const blob = await res.blob()
      if (!blob || blob.size < 16) {
        toast.error("ملف فارغ أو تالف")
        return
      }
      await putPdfOffline(materialId, blob)
      dispatchPdfOfflineChanged(materialId)
      await refresh()
      toast.success("تم حفظ نسخة للقراءة من داخل المنصّة فقط")
    } catch {
      toast.error("فشل التحميل")
    } finally {
      setBusy(false)
    }
  }, [busy, cached, materialId, refresh])

  const remove = useCallback(async () => {
    await deletePdfOffline(materialId)
    dispatchPdfOfflineChanged(materialId)
    await refresh()
    toast.success("أُزيلت النسخة المحلية")
  }, [materialId, refresh])

  return {
    displayStatus,
    cached,
    download,
    remove,
    /** لفتح المعاينة من المخزن دون المرور بـ Supabase */
    async getOfflineBlob(): Promise<Blob | null> {
      const b = await getPdfOffline(materialId)
      return b ?? null
    },
  }
}

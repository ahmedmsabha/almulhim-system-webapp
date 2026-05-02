"use client"

import { useMemo, useState } from "react"

import { initiateDownloadAction } from "@/actions/downloadActions"
import { chunkDownloader } from "@/lib/download/chunkDownloader"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"

type DownloadUiState = "idle" | "downloading" | "done" | "error"

export type DownloadButtonProps = {
  videoId: string
  className?: string
}

export function DownloadButton({ videoId, className }: DownloadButtonProps) {
  const [state, setState] = useState<DownloadUiState>("idle")
  const [pct, setPct] = useState(0)
  const [errorText, setErrorText] = useState<string | null>(null)

  const label = useMemo(() => {
    if (state === "done") return "✓ متاح بدون إنترنت"
    if (state === "downloading") return "جاري التحميل..."
    if (state === "error") return "إعادة المحاولة"
    return "تحميل للعمل دون شبكة"
  }, [state])

  const run = async (): Promise<void> => {
    if (state === "downloading") return
    setState("downloading")
    setErrorText(null)
    setPct(0)

    try {
      const init = await initiateDownloadAction(videoId, 480)
      if (!init.success) {
        setErrorText(init.error ?? "لم يكتمل الطلب")
        setState("error")
        return
      }

      const { segments, encryptionKey, playlistTemplate } = init.data

      await chunkDownloader({
        videoId,
        segmentUrls: segments,
        encryptionKeyHex: encryptionKey ?? "",
        playlistTemplate,
        qualityLabel: "480p",
        onProgress: (p) => {
          setPct(p.percent)
        },
      })

      setState("done")
      setPct(100)
    } catch (e) {
      const msg =
        e instanceof Error && e.message ? e.message : "فشل التحميل؛ حاول مرة أخرى لاحقاً"
      console.error(e)
      setErrorText(msg)
      setState("error")
    }
  }

  return (
    <div className={cn("flex w-full max-w-xs flex-col gap-2", className)}>
      <Button
        type="button"
        variant={state === "error" ? "destructive" : "outline"}
        size="sm"
        className="w-full justify-center gap-2"
        disabled={state === "downloading"}
        onClick={() => void run()}
      >
        {label}
      </Button>

      {state === "downloading" ?
        <Progress value={pct} />
      : null}

      {errorText ?
        <p className="text-xs text-destructive" role="status">
          {errorText}
        </p>
      : null}
    </div>
  )
}

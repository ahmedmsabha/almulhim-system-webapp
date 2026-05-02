'use client'

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react'
import Hls, { type HlsConfig } from 'hls.js'
import { AlertCircle } from 'lucide-react'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import Link from 'next/link'
import { buildOfflineHlsBlobUrl } from '@/lib/offline/build-offline-hls-blob'
import { getOfflinePlaylistManifest } from '@/lib/offline/offline-manifest-idb'
import { cn } from '@/lib/utils'
import type { LessonWithProgress } from '@/types'

function labelFromHeight(height?: number): string {
  if (height !== undefined && height > 0) return `${Math.round(height)}p`
  return 'Auto'
}

export type LessonPlayerTarget = Pick<
  LessonWithProgress,
  'id' | 'is_preview' | 'hls_url' | 'youtube_id' | 'title'
>

export type VideoPlayerHandle = {
  getVideoElement: () => HTMLVideoElement | null
}

type VideoPlayerProps = {
  lesson: LessonPlayerTarget
  blockedBySubscription: boolean
  className?: string
}

const HLS_TUNING_CONFIG: Partial<HlsConfig> = {
  maxBufferLength: 60,
  maxMaxBufferLength: 120,
  maxBufferSize: 60 * 1000 * 1000,
  lowLatencyMode: false,
  abrEwmaFastLive: 3,
  abrEwmaSlowLive: 9,
}

const WEAK_BPS_THRESHOLD = 500 * 1000

function nearestLevelIndexForHeight(hls: Hls, targetHeight: number): number {
  const levels = hls.levels
  if (!levels.length) return -1

  let bestIdx = 0
  let bestDelta = Infinity
  levels.forEach((lvl, idx) => {
    if (typeof lvl.height !== 'number' || lvl.height <= 0) return
    const d = Math.abs(lvl.height - targetHeight)
    if (d < bestDelta) {
      bestDelta = d
      bestIdx = idx
    }
  })
  return bestIdx
}

export const VideoPlayer = forwardRef<VideoPlayerHandle, VideoPlayerProps>(
  function VideoPlayer({ lesson, blockedBySubscription, className }: VideoPlayerProps, ref) {
    const containerRef = useRef<HTMLDivElement>(null)
    const videoRef = useRef<HTMLVideoElement>(null)
    const hlsRef = useRef<Hls | null>(null)
    const bwTimerRef = useRef<number | null>(null)
    const offlineRevokeRef = useRef<(() => void) | null>(null)
    const streamInstRef = useRef<Hls | null>(null)

    const [offlineReady, setOfflineReady] = useState(false)
    const [playOfflineFirst, setPlayOfflineFirst] = useState(false)

    const [qualityBadge, setQualityBadge] = useState('Auto')
    const [selectedLevel, setSelectedLevel] = useState('-1')

    const [weakConnection, setWeakConnection] = useState(false)
    const [reconnecting, setReconnecting] = useState(false)
    const [fatalMessage, setFatalMessage] = useState<string | null>(null)

    const [manualLadderPx, setManualLadderPx] = useState<number | null>(null)
    const [hlsLevelsCount, setHlsLevelsCount] = useState(0)

    const networkRetriesRef = useRef(0)
    const manualHoldRef = useRef(false)

    useImperativeHandle(ref, () => ({
      getVideoElement: () => videoRef.current,
    }))

    const destroyHlsSource = useCallback(() => {
      if (bwTimerRef.current !== null) {
        window.clearInterval(bwTimerRef.current)
        bwTimerRef.current = null
      }
      networkRetriesRef.current = 0

      streamInstRef.current = null

      try {
        hlsRef.current?.destroy()
      } finally {
        hlsRef.current = null
      }

      offlineRevokeRef.current?.()
      offlineRevokeRef.current = null

      const v = videoRef.current
      if (v) {
        v.pause()
        v.removeAttribute('src')
        v.load()
      }

      setHlsLevelsCount(0)
    }, [])

    useEffect(() => {
      let cancelled = false
      void getOfflinePlaylistManifest(lesson.id)
        .then((m) => {
          if (!cancelled) setOfflineReady(Boolean(m?.segmentCount))
        })
        .catch(() => {
          if (!cancelled) setOfflineReady(false)
        })
      return () => {
        cancelled = true
      }
    }, [lesson.id])

    const ladderOrdered = useMemo(() => [360, 480, 720, 1080], [])

    useEffect(() => {
      if (lesson.is_preview || blockedBySubscription) {
        destroyHlsSource()
        setFatalMessage(null)
        return
      }

      const hasRemoteMaster = Boolean(lesson.hls_url?.trim())
      const useOfflinePlayback = playOfflineFirst && offlineReady

      if (!hasRemoteMaster && !useOfflinePlayback) {
        destroyHlsSource()
        setFatalMessage(null)
        return
      }

      const video = videoRef.current
      if (!video) return

      let cancelled = false

      destroyHlsSource()
      setFatalMessage(null)
      setWeakConnection(false)

      const subscribeBandwidthPoll = (hls: Hls): void => {
        if (bwTimerRef.current !== null) window.clearInterval(bwTimerRef.current)

        bwTimerRef.current = window.setInterval(() => {
          try {
            const bw = hls.bandwidthEstimate
            setWeakConnection(bw > 0 && bw < WEAK_BPS_THRESHOLD)
          } catch {
            /* ignore */
          }
        }, 2000)
      }

      const attachHls = (hls: Hls): void => {
        streamInstRef.current = hls

        subscribeBandwidthPoll(hls)
        networkRetriesRef.current = 0

        hls.currentLevel = -1
        setSelectedLevel('-1')
        setQualityBadge('Auto')

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          setHlsLevelsCount(hls.levels?.length ?? 0)
          if (!manualHoldRef.current && hls.autoLevelEnabled) {
            setQualityBadge('Auto')
          }
        })

        hls.on(Hls.Events.LEVEL_SWITCHED, (_evt, data) => {
          if (manualHoldRef.current) return
          if (typeof data.level !== 'number' || hls.currentLevel < 0) return
          const lh = hls.levels[data.level]?.height
          setQualityBadge(typeof lh === 'number' ? labelFromHeight(lh) : 'Auto')
        })

        hls.on(Hls.Events.ERROR, (_evt, data) => {
          if (!data?.fatal) return

          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
            const next = networkRetriesRef.current + 1
            networkRetriesRef.current = next
            const delayMs = Math.min(8000, 400 * Math.pow(2, next - 1))

            setReconnecting(true)

            if (next > 3) {
              setFatalMessage('تعذر الاتصال بالخادم. تحقّق من الشبكة.')
              setReconnecting(false)
              return
            }

            window.setTimeout(() => {
              try {
                if (cancelled || streamInstRef.current !== hls) return
                hls.startLoad()
              } catch (err) {
                console.error(err)
              } finally {
                setReconnecting(false)
              }
            }, delayMs)
            return
          }

          if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
            setReconnecting(true)
            try {
              hls.recoverMediaError()
            } catch (err) {
              console.error(err)
              setFatalMessage('خطأ وسائط أثناء التشغيل')
            } finally {
              setReconnecting(false)
            }
            return
          }

          setFatalMessage('خطأ تشغيل غير متوقع')
        })
      }

      void (async (): Promise<void> => {
        try {
          if (playOfflineFirst && offlineReady) {
            const m = await getOfflinePlaylistManifest(lesson.id)
            if (!m || cancelled) return

            const built = await buildOfflineHlsBlobUrl({
              videoId: lesson.id,
              playlistTemplate: m.playlistTemplate,
              segmentCount: m.segmentCount,
              encryptionKeyHex: m.encryptionKeyHex ?? '',
            })
            offlineRevokeRef.current = built.revoke

            if (cancelled) {
              built.revoke()
              return
            }

            if (!Hls.isSupported()) {
              video.src = built.objectUrl
              setQualityBadge('Auto')
              return
            }

            const hls = new Hls({ ...HLS_TUNING_CONFIG })
            hlsRef.current = hls
            hls.attachMedia(video)
            attachHls(hls)
            try {
              hls.loadSource(built.objectUrl)
            } catch (e) {
              console.error(e)
              destroyHlsSource()
            }

            return
          }

          const url = lesson.hls_url!.trim()

          if (Hls.isSupported()) {
            const hls = new Hls({ ...HLS_TUNING_CONFIG })
            hlsRef.current = hls
            hls.attachMedia(video)
            attachHls(hls)
            try {
              hls.loadSource(url)
            } catch (e) {
              console.error(e)
              destroyHlsSource()
            }

            return
          }

          if (video.canPlayType('application/vnd.apple.mpegurl')) {
            video.src = url
            setQualityBadge('Auto')
          } else {
            setFatalMessage('هذا المتصفح لا يدعم تشغيل HLS')
          }
        } catch (e) {
          console.error(e)
          if (!cancelled) setFatalMessage('تعذر تحضير الفيديو')
        }
      })()

      return () => {
        cancelled = true
        destroyHlsSource()
      }
    }, [
      lesson.id,
      lesson.hls_url,
      lesson.is_preview,
      blockedBySubscription,
      offlineReady,
      playOfflineFirst,
      destroyHlsSource,
    ])

    /* Apply persisted manual ladder preference after manifests / level lists load */
    useEffect(() => {
      const hls = hlsRef.current
      if (!hls?.levels?.length || lesson.is_preview || blockedBySubscription) return

      if (manualLadderPx === null) {
        manualHoldRef.current = false
        return
      }

      const ix = nearestLevelIndexForHeight(hls, manualLadderPx)
      if (ix >= 0) {
        try {
          manualHoldRef.current = true
          hls.currentLevel = ix
          setQualityBadge(`${manualLadderPx}p`)
          setSelectedLevel(`ladder:${String(manualLadderPx)}`)
        } catch {
          /* ignore */
        }
      }
    }, [
      blockedBySubscription,
      hlsLevelsCount,
      lesson.id,
      lesson.is_preview,
      manualLadderPx,
    ])
    const onQualityPick = useCallback((val: string): void => {
      setSelectedLevel(val)
      const hls = hlsRef.current
      if (!hls) return

      if (val === '-1') {
        manualHoldRef.current = false
        setManualLadderPx(null)
        hls.currentLevel = -1
        setQualityBadge('Auto')
        return
      }

      const m = /^ladder:(\d+)$/.exec(val)
      const targetPx = m ? Number(m[1]) : Number.NaN
      if (!Number.isFinite(targetPx)) return

      const idx = nearestLevelIndexForHeight(hls, targetPx)
      if (idx >= 0) {
        manualHoldRef.current = true
        setManualLadderPx(targetPx)
        hls.currentLevel = idx
        setQualityBadge(`${targetPx}p`)
      }
    }, [])

    if (lesson.is_preview) {
      const yid = lesson.youtube_id?.trim()

      return (
        <div
          ref={containerRef}
          className={cn('relative overflow-hidden rounded-lg bg-black shadow-sm', className)}
        >
          {yid ?
            <div className="relative aspect-video w-full">
              <iframe
                title={lesson.title}
                src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(yid)}?rel=0`}
                className="absolute inset-0 h-full w-full rounded-lg border-0"
                loading="lazy"
                allowFullScreen
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              />
            </div>

          : <div className="flex aspect-video w-full items-center justify-center rounded-lg bg-muted px-6 text-center text-muted-foreground">
              لا معرّف YouTube مخزَّن لهذه المعاينة.
            </div>
          }
        </div>
      )
    }

    if (blockedBySubscription) {
      return (
        <div
          ref={containerRef}
          className={cn(
            'flex aspect-video flex-col items-center justify-center gap-6 rounded-lg bg-muted px-8 py-12 text-center',
            className
          )}
        >
          <div className="space-y-2">
            <p className="text-lg font-semibold text-foreground">المحتوى للمشتركين فقط</p>
            <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
              جدّد اشتراكك أو تواصل مع المعلم، ثم ارجع من صفحة الملف الشخصي للمتابعة.
            </p>
          </div>
          <Link
            href="/student/profile"
            className="rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            الانتقال للملف الشخصي
          </Link>
        </div>
      )
    }

    const showQualityBar =
      Hls.isSupported() && hlsLevelsCount > 0 && Boolean(lesson.hls_url?.trim()) && fatalMessage === null

    return (
      <div
        ref={containerRef}
        className={cn('relative overflow-hidden rounded-lg bg-black shadow-sm', className)}
      >
        {weakConnection && (
          <div className="absolute start-3 top-28 z-[2] max-w-[min(100%-1.5rem,20rem)] rounded-md bg-amber-600/96 px-2 py-1 text-[11px] font-semibold text-amber-50 shadow-xl">
            اتصال ضعيف — قد تنخفض الجودة أو يزيد التحميل المؤقت
          </div>
        )}

        {(reconnecting || fatalMessage) && (
          <div className="absolute inset-x-3 top-[4.75rem] z-[2] flex justify-center">
            <div className="flex max-w-xl items-start gap-2 rounded-md bg-black/92 px-3 py-2 text-xs font-medium text-white shadow-xl">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <span>{fatalMessage ?? 'جاري إعادة الاتصال…'}</span>
            </div>
          </div>
        )}

        <div className="pointer-events-none absolute start-3 top-3 z-[2] flex flex-wrap gap-2">
          <span className="pointer-events-auto rounded-md bg-black/70 px-2 py-0.5 text-[11px] font-semibold text-white">
            {qualityBadge}
          </span>
          {playOfflineFirst && offlineReady ?
            <span className="pointer-events-auto rounded-md bg-emerald-900/90 px-2 py-0.5 text-[11px] font-medium text-emerald-100">
              📥 تشغيل من التخزين المحلي
            </span>
          : null}
        </div>

        {offlineReady ?
          <div className="absolute end-3 top-3 z-[2]">
            <button
              type="button"
              className="rounded-md bg-white/10 px-3 py-1 text-[11px] font-medium text-white backdrop-blur hover:bg-white/20"
              onClick={() => setPlayOfflineFirst((p) => !p)}
            >
              {playOfflineFirst ? 'بثّ من الرابط' : 'تشغيل محلّي'}
            </button>
          </div>
        : null}

        {showQualityBar ?
          <div className="absolute end-3 bottom-16 z-[2] w-44 max-w-[55%] rounded-md bg-black/75 px-2 py-1">
            <Select value={selectedLevel} onValueChange={onQualityPick}>
              <SelectTrigger className="h-9 border-0 bg-transparent text-[11px] text-white shadow-none [&_svg]:text-white focus:ring-0">
                <SelectValue placeholder="الجودة" />
              </SelectTrigger>
              <SelectContent dir="ltr">
                <SelectItem value="-1">Auto</SelectItem>
                {ladderOrdered.map((h) => (
                  <SelectItem key={h} value={`ladder:${String(h)}`}>
                    {h}p
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        : null}

        <video
          ref={videoRef}
          className="aspect-video h-full max-h-none w-full"
          playsInline
          controls
          muted={false}
        />
      </div>
    )
  }
)

VideoPlayer.displayName = 'VideoPlayer'

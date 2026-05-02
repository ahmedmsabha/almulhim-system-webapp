import type { PDFMaterial, VideoLesson, WatchProgress } from "./database"

export type DownloadStatus = "not_downloaded" | "downloading" | "downloaded" | "failed"

export type ConnectionStatus = "online" | "weak" | "offline"

export interface LessonWithProgress extends VideoLesson {
  watch_progress?: WatchProgress
  download_status?: DownloadStatus
}

export interface MaterialWithStatus extends PDFMaterial {
  download_status?: DownloadStatus
}

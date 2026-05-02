"use client"

import { OFFLINE_KEY_PLACEHOLDER, offlineSegmentPlaceholder } from "@/lib/offline/constants"

const OPFS_ROOT = "mulhim-videos"

async function opfsLessonDir(videoId: string): Promise<FileSystemDirectoryHandle> {
  const root = await navigator.storage.getDirectory()
  const scoped = await root.getDirectoryHandle(OPFS_ROOT, { create: false })
  return scoped.getDirectoryHandle(videoId, { create: false })
}

async function tryReadSegBlob(dir: FileSystemDirectoryHandle, name: string): Promise<Blob | null> {
  try {
    const fh = await dir.getFileHandle(name)
    return await fh.getFile()
  } catch {
    return null
  }
}

function hexToBlob(hex: string): Blob {
  const normalized = hex.trim()
  const bytes = new Uint8Array(normalized.length / 2)
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = Number.parseInt(normalized.slice(i * 2, i * 2 + 2), 16)
  }
  return new Blob([bytes], { type: "application/octet-stream" })
}

/**
 * Builds a temporary blob URL for an offline variant playlist that references OPFS segment blobs.
 * Caller must invoke `revoke()` when the Hls instance is destroyed.
 */
export async function buildOfflineHlsBlobUrl(input: {
  videoId: string
  playlistTemplate: string
  segmentCount: number
  encryptionKeyHex: string
}): Promise<{ objectUrl: string; revoke: () => void }> {
  const { videoId, playlistTemplate, segmentCount, encryptionKeyHex } = input
  const dir = await opfsLessonDir(videoId)
  const createdUrls: string[] = []

  const revokeAll = (): void => {
    for (const u of createdUrls) {
      try {
        URL.revokeObjectURL(u)
      } catch {
        /* ignore */
      }
    }
  }

  try {
    let text = playlistTemplate

    for (let i = 0; i < segmentCount; i++) {
      const ph = offlineSegmentPlaceholder(i)
      const label = `seg-${i}.ts`
      const blob =
        (await tryReadSegBlob(dir, label)) ??
        (() => {
          throw new Error(`Missing offline segment ${label}`)
        })()
      const u = URL.createObjectURL(blob)
      createdUrls.push(u)
      text = text.split(ph).join(u)
    }

    if (text.includes(OFFLINE_KEY_PLACEHOLDER)) {
      let keyBlob: Blob | null = await tryReadSegBlob(dir, "offline-aes-key")
      if (!keyBlob && encryptionKeyHex.trim().length >= 32) {
        try {
          keyBlob = hexToBlob(encryptionKeyHex)
        } catch {
          keyBlob = null
        }
      }
      if (keyBlob) {
        const u = URL.createObjectURL(keyBlob)
        createdUrls.push(u)
        text = text.split(OFFLINE_KEY_PLACEHOLDER).join(u)
      } else {
        text = text.split(OFFLINE_KEY_PLACEHOLDER).join("")
      }
    }

    const playlistBlob = new Blob([text], { type: "application/vnd.apple.mpegurl" })
    const objectUrl = URL.createObjectURL(playlistBlob)
    createdUrls.push(objectUrl)

    return {
      objectUrl,
      revoke: revokeAll,
    }
  } catch (e) {
    revokeAll()
    throw e instanceof Error ? e : new Error("Unable to assemble offline playlist")
  }
}

"use client"

import { saveOfflinePlaylistManifest } from "@/lib/offline/offline-manifest-idb"

export type ChunkDownloaderProgress = {
  downloaded: number
  total: number
  percent: number
}

const OPFS_ROOT = "mulhim-videos"

async function ensureOpfsLessonDir(videoId: string): Promise<FileSystemDirectoryHandle> {
  const root = await navigator.storage.getDirectory()
  const scoped = await root.getDirectoryHandle(OPFS_ROOT, { create: true })
  return scoped.getDirectoryHandle(videoId, { create: true })
}

async function fetchWithRetries(
  url: string,
  maxAttempts: number,
  signal?: AbortSignal
): Promise<ArrayBuffer> {
  let lastErr: unknown = null
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetch(url, {
        credentials: "omit",
        signal,
        cache: "no-store",
      })
      if (!res.ok) {
        throw new Error(`Segment fetch failed (${res.status})`)
      }
      return await res.arrayBuffer()
    } catch (e) {
      lastErr = e
      if (attempt >= maxAttempts) break
      await new Promise((r) => setTimeout(r, 300 * Math.pow(2, attempt - 1)))
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("Segment fetch failed")
}

async function writeFile(
  dir: FileSystemDirectoryHandle,
  name: string,
  data: ArrayBuffer | Uint8Array
): Promise<void> {
  const fh = await dir.getFileHandle(name, { create: true })
  const w = await fh.createWritable()
  await w.write(data instanceof Uint8Array ? data : new Uint8Array(data))
  await w.close()
}

function hexToUint8(hex: string): Uint8Array {
  const normalized = hex.trim()
  if (normalized.length === 0 || normalized.length % 2 !== 0) {
    throw new Error("Invalid hex key length")
  }
  const out = new Uint8Array(normalized.length / 2)
  for (let i = 0; i < out.length; i++) {
    const byte = Number.parseInt(normalized.slice(i * 2, i * 2 + 2), 16)
    if (Number.isNaN(byte)) throw new Error("Invalid hex key")
    out[i] = byte
  }
  return out
}

export interface ChunkDownloaderInput {
  videoId: string
  segmentUrls: readonly string[]
  encryptionKeyHex: string
  playlistTemplate: string
  qualityLabel: string
  onProgress?: (p: ChunkDownloaderProgress) => void
  signal?: AbortSignal
}

/**
 * Downloads HLS fragments in batches of five, persists to OPFS, then stores the offline playlist
 * descriptor in IndexedDB.
 */
export async function chunkDownloader(input: ChunkDownloaderInput): Promise<void> {
  try {
    const {
      videoId,
      segmentUrls,
      encryptionKeyHex,
      playlistTemplate,
      qualityLabel,
      signal,
      onProgress,
    } = input
    const dir = await ensureOpfsLessonDir(videoId)
    const total = segmentUrls.length

    const batchSize = 5
    let downloaded = 0

    for (let offset = 0; offset < segmentUrls.length; offset += batchSize) {
      const slice = segmentUrls.slice(offset, offset + batchSize)
      await Promise.all(
        slice.map(async (url, j) => {
          const seq = offset + j
          const buf = await fetchWithRetries(url, 3, signal)
          await writeFile(dir, `seg-${seq}.ts`, buf)
        })
      )

      downloaded = Math.min(offset + slice.length, total)
      onProgress?.({
        downloaded,
        total,
        percent: total > 0 ? Math.round((downloaded / total) * 100) : 0,
      })
    }

    if (encryptionKeyHex.trim().length >= 32) {
      try {
        const keyBytes = hexToUint8(encryptionKeyHex)
        await writeFile(dir, "offline-aes-key", keyBytes)
      } catch {
        /* ignore invalid AES key material */
      }
    }

    await saveOfflinePlaylistManifest({
      videoId,
      playlistTemplate,
      encryptionKeyHex,
      qualityLabel,
      segmentCount: total,
      updatedAt: Date.now(),
    })
  } catch (e) {
    console.error("chunkDownloader", e)
    throw e instanceof Error ? e : new Error("Download failed")
  }
}

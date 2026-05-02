"use client"

import { useCallback, useEffect, useMemo, useState } from "react"

import { CONTENT_TYPES } from "@/lib/constants"

const DB_NAME = "physics-app-downloads"
const STORE = "items"
const DB_VERSION = 1

type ContentType = (typeof CONTENT_TYPES)[keyof typeof CONTENT_TYPES]

export interface DownloadedItemRecord {
  key: string
  contentType: ContentType
  resourceId: string
  updatedAt: number
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onerror = () => reject(req.error)
    req.onsuccess = () => resolve(req.result)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "key" })
      }
    }
  })
}

function makeKey(contentType: ContentType, resourceId: string): string {
  return `${contentType}:${resourceId}`
}

export function useDownloadedItems() {
  const [downloadedIds, setDownloadedIds] = useState<string[]>([])

  const refresh = useCallback(async () => {
    if (typeof indexedDB === "undefined") return
    try {
      const db = await openDb()
      const tx = db.transaction(STORE, "readonly")
      const store = tx.objectStore(STORE)
      const all = await new Promise<DownloadedItemRecord[]>((resolve, reject) => {
        const r = store.getAll()
        r.onerror = () => reject(r.error)
        r.onsuccess = () => resolve((r.result as DownloadedItemRecord[]) ?? [])
      })
      setDownloadedIds(all.map((row) => row.resourceId))
    } catch {
      setDownloadedIds([])
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const isDownloaded = useCallback(
    (id: string) => downloadedIds.includes(id),
    [downloadedIds]
  )

  const addDownload = useCallback(
    async (id: string, contentType: ContentType = CONTENT_TYPES.video) => {
      if (typeof indexedDB === "undefined") return
      const db = await openDb()
      const tx = db.transaction(STORE, "readwrite")
      const store = tx.objectStore(STORE)
      store.put({
        key: makeKey(contentType, id),
        contentType,
        resourceId: id,
        updatedAt: Date.now(),
      } satisfies DownloadedItemRecord)
      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
        tx.onabort = () => reject(tx.error)
      })
      await refresh()
    },
    [refresh]
  )

  const removeDownload = useCallback(
    async (id: string, contentType: ContentType = CONTENT_TYPES.video) => {
      if (typeof indexedDB === "undefined") return
      const db = await openDb()
      const tx = db.transaction(STORE, "readwrite")
      tx.objectStore(STORE).delete(makeKey(contentType, id))
      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
        tx.onabort = () => reject(tx.error)
      })
      await refresh()
    },
    [refresh]
  )

  return useMemo(
    () => ({
      downloadedIds,
      isDownloaded,
      addDownload,
      removeDownload,
    }),
    [addDownload, downloadedIds, isDownloaded, removeDownload]
  )
}

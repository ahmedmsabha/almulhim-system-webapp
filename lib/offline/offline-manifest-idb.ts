export type StoredOfflinePlaylist = {
  videoId: string
  playlistTemplate: string
  encryptionKeyHex: string
  qualityLabel: string
  segmentCount: number
  updatedAt: number
}

const DB_NAME = "mulhim-offline-manifests-v1"
const STORE_NAME = "video-playlists"
const DB_VERSION = 1

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    try {
      const req = indexedDB.open(DB_NAME, DB_VERSION)
      req.onerror = () => reject(req.error ?? new Error("IDB open failed"))
      req.onupgradeneeded = () => {
        const db = req.result
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: "videoId" })
        }
      }
      req.onsuccess = () => resolve(req.result)
    } catch (e) {
      reject(e)
    }
  })
}

export async function saveOfflinePlaylistManifest(record: StoredOfflinePlaylist): Promise<void> {
  try {
    const db = await openDb()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite")
      tx.oncomplete = () => {
        db.close()
        resolve()
      }
      tx.onerror = () => reject(tx.error ?? new Error("IDB transaction failed"))
      const store = tx.objectStore(STORE_NAME)
      const r = store.put(record)
      r.onerror = () => reject(r.error ?? new Error("IDB put failed"))
    })
  } catch (e) {
    console.error("saveOfflinePlaylistManifest", e)
    throw e instanceof Error ? e : new Error("Failed to persist offline manifest")
  }
}

export async function getOfflinePlaylistManifest(videoId: string): Promise<StoredOfflinePlaylist | null> {
  try {
    const db = await openDb()
    return await new Promise<StoredOfflinePlaylist | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly")
      tx.oncomplete = () => db.close()
      tx.onerror = () => reject(tx.error ?? new Error("IDB transaction failed"))

      const store = tx.objectStore(STORE_NAME)
      const r = store.get(videoId)
      r.onerror = () => reject(r.error ?? new Error("IDB get failed"))
      r.onsuccess = () => resolve((r.result ?? null) as StoredOfflinePlaylist | null)
    })
  } catch {
    return null
  }
}

export async function removeOfflinePlaylistManifest(videoId: string): Promise<void> {
  try {
    const db = await openDb()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite")
      tx.oncomplete = () => db.close()
      tx.onerror = () => reject(tx.error ?? new Error("IDB transaction failed"))
      const store = tx.objectStore(STORE_NAME)
      const r = store.delete(videoId)
      r.onerror = () => reject(r.error ?? new Error("IDB delete failed"))
      r.onsuccess = () => resolve()
    })
  } catch {
    /* ignore */
  }
}

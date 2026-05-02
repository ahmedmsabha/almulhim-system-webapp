"use client"

const DB_NAME = "physics-app-material-pdf"
const STORE = "offline"
const DB_VERSION = 1

function openDb(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") return Promise.reject(new Error("IndexedDB غير متاح"))

  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onerror = () => reject(req.error ?? new Error("IndexedDB"))
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE)
    }
    req.onsuccess = () => resolve(req.result)
  })
}

export const PDF_OFFLINE_CHANGED = "physics-pdf-offline-changed"

export function dispatchPdfOfflineChanged(materialId: string) {
  if (typeof window === "undefined") return
  window.dispatchEvent(new CustomEvent(PDF_OFFLINE_CHANGED, { detail: { materialId } }))
}

export async function pdfOfflineExists(materialId: string): Promise<boolean> {
  const blob = await getPdfOffline(materialId)
  return !!blob && blob.size > 0
}

export async function putPdfOffline(materialId: string, blob: Blob): Promise<void> {
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite")
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.objectStore(STORE).put(blob, materialId)
  })
  db.close()
}

export async function getPdfOffline(materialId: string): Promise<Blob | undefined> {
  const db = await openDb()
  const blob = await new Promise<Blob | undefined>((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly")
    const req = tx.objectStore(STORE).get(materialId)
    tx.oncomplete = () => db.close()
    tx.onerror = () => reject(tx.error)
    req.onsuccess = () => resolve(req.result as Blob | undefined)
  })
  return blob
}

export async function deletePdfOffline(materialId: string): Promise<void> {
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite")
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.objectStore(STORE).delete(materialId)
  })
  db.close()
}

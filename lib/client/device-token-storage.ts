"use client"

const STORAGE_KEY = "physics_device_token_v1"

export function getOrCreateDeviceToken(): string {
  if (typeof window === "undefined") {
    return ""
  }
  let t = localStorage.getItem(STORAGE_KEY)
  if (!t || t.length < 16) {
    t = crypto.randomUUID()
    localStorage.setItem(STORAGE_KEY, t)
  }
  return t
}

/** Subscription lifecycle values (DB / domain). */
export const SUBSCRIPTION_STATUS = {
  active: "active",
  expiring_soon: "expiring_soon",
  expired: "expired",
  cancelled: "cancelled",
} as const

export type SubscriptionStatusValue =
  (typeof SUBSCRIPTION_STATUS)[keyof typeof SUBSCRIPTION_STATUS]

/** Client download UI state. */
export const DOWNLOAD_STATUS = {
  not_downloaded: "not_downloaded",
  downloading: "downloading",
  downloaded: "downloaded",
  failed: "failed",
} as const

export type DownloadStatusValue = (typeof DOWNLOAD_STATUS)[keyof typeof DOWNLOAD_STATUS]

/** Network quality bucket for UI. */
export const CONNECTION_STATUS = {
  online: "online",
  weak: "weak",
  offline: "offline",
} as const

export type ConnectionStatusValue =
  (typeof CONNECTION_STATUS)[keyof typeof CONNECTION_STATUS]

/** Downloadable resource kinds. */
export const CONTENT_TYPES = {
  video: "video",
  pdf: "pdf",
} as const

export type ContentTypeValue = (typeof CONTENT_TYPES)[keyof typeof CONTENT_TYPES]

/** Offline entitlement window (days). */
export const MAX_OFFLINE_DAYS = 7

/** Flag subscription as "expiring soon" when remaining days ≤ this threshold. */
export const EXPIRING_SOON_THRESHOLD_DAYS = 14

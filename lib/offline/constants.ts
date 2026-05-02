export function offlineSegmentPlaceholder(index: number): string {
  return `__OFFLINE_SEG_${index}__`
}

/** Must match presign template replacement for AES-128 keys in offline manifests. */
export const OFFLINE_KEY_PLACEHOLDER = "__OFFLINE_KEY__"

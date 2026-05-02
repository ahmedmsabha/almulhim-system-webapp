import "server-only"

import { createHash } from "node:crypto"

export function hashDeviceToken(plain: string): string {
  return createHash("sha256").update(plain, "utf8").digest("hex")
}

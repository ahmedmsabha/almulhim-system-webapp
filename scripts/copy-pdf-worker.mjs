#!/usr/bin/env node
/**
 * Copies PDF.js worker to /public so the client viewer loads it same-origin (PWA/offline-safe).
 */
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.join(__dirname, "..")
const src = path.join(repoRoot, "node_modules/pdfjs-dist/build/pdf.worker.min.mjs")
const dstDir = path.join(repoRoot, "public")
const dst = path.join(dstDir, "pdf.worker.min.mjs")

if (!fs.existsSync(src)) {
  console.warn("[copy-pdf-worker] skip: pdfjs-dist worker not found at", src)
  process.exit(0)
}

fs.mkdirSync(dstDir, { recursive: true })
fs.copyFileSync(src, dst)
console.log("[copy-pdf-worker] copied to public/pdf.worker.min.mjs")

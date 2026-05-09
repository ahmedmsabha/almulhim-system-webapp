export type ParsedMasterVariant = {
  streamInfLine: string
  uri: string
}

export type ParsedMasterPlaylist = {
  preambleLines: string[]
  variants: ParsedMasterVariant[]
}

function trimLine(s: string): string {
  return s.replace(/\r$/, "").trimEnd()
}

/**
 * Parse an HLS multivariant (master) playlist into preamble + (#EXT-X-STREAM-INF, uri) pairs.
 */
export function parseMasterPlaylist(text: string): ParsedMasterPlaylist {
  const lines = text.split("\n").map(trimLine)
  const preambleLines: string[] = []
  const variants: ParsedMasterVariant[] = []

  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    if (!line?.startsWith("#EXT-X-STREAM-INF")) {
      preambleLines.push(lines[i] ?? "")
      i += 1
      continue
    }

    const streamInfLine = line
    let j = i + 1
    while (j < lines.length) {
      const cand = lines[j]?.trim() ?? ""
      if (!cand || cand.startsWith("#")) {
        j += 1
        continue
      }
      if (!cand.startsWith("#EXT-X-STREAM-INF")) {
        variants.push({ streamInfLine, uri: cand })
        i = j + 1
        break
      }
      j += 1
    }
    if (j >= lines.length) {
      preambleLines.push(streamInfLine)
      i += 1
    }
  }

  return { preambleLines, variants }
}

export function isMultivariantMaster(text: string): boolean {
  return text.includes("#EXT-X-STREAM-INF")
}

export function variantDisplayLabel(streamInfLine: string, uri: string): string {
  const res = /RESOLUTION=(\d+)x(\d+)/i.exec(streamInfLine)
  if (res?.[2]) {
    const h = parseInt(res[2], 10)
    if (Number.isFinite(h) && h > 0) return `${h}p`
  }
  const bw = /BANDWIDTH=(\d+)/i.exec(streamInfLine)
  if (bw?.[1]) {
    const kb = Math.round(parseInt(bw[1], 10) / 1000)
    if (Number.isFinite(kb)) return `${kb} kbps`
  }
  return uri
}

/**
 * Rebuild master playlist: keep preamble, emit only selected variants in order.
 */
export function rebuildMasterPlaylist(
  parsed: ParsedMasterPlaylist,
  selectedOrdered: ParsedMasterVariant[]
): string {
  const nonEmptyPreamble = parsed.preambleLines.filter((l) => l.trim() !== "")
  const hasExtM3u = nonEmptyPreamble.some((l) => l.trim() === "#EXTM3U")
  const out: string[] = []
  if (!hasExtM3u) {
    out.push("#EXTM3U")
  }
  out.push(...nonEmptyPreamble)
  for (const v of selectedOrdered) {
    out.push(v.streamInfLine)
    out.push(v.uri)
  }
  return `${out.join("\n")}\n`
}

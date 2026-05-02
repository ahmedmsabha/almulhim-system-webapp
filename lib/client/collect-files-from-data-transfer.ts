/** جمع ملفات من الإفلات مع webkitRelativePath عند الدعم (مثل اختيار مجلد من المتصفح). */

function walkFile(entry: FileSystemFileEntry, pathPrefix: string, out: File[]): Promise<void> {
  return new Promise((resolve, reject) => {
    entry.file(
      (file) => {
        const rel = `${pathPrefix}${file.name}`
        Object.defineProperty(file, "webkitRelativePath", {
          value: rel,
          configurable: true,
          enumerable: true,
        })
        out.push(file)
        resolve()
      },
      reject
    )
  })
}

async function walkDirectory(entry: FileSystemDirectoryEntry, pathPrefix: string, out: File[]) {
  const base = `${pathPrefix}${entry.name}/`
  const reader = entry.createReader()
  const entries: FileSystemEntry[] = []
  for (;;) {
    const batch = await new Promise<FileSystemEntry[]>((resolve, reject) =>
      reader.readEntries(resolve, reject)
    )
    if (batch.length === 0) break
    entries.push(...batch)
  }
  await Promise.all(entries.map((e) => walkEntry(e, base, out)))
}

async function walkEntry(entry: FileSystemEntry, pathPrefix: string, out: File[]): Promise<void> {
  if (entry.isFile) await walkFile(entry as FileSystemFileEntry, pathPrefix, out)
  else if (entry.isDirectory) await walkDirectory(entry as FileSystemDirectoryEntry, pathPrefix, out)
}

/**
 * يعيد قائمة ملفات مع webkitRelativePath عند الإمكان.
 * المتصفّحات دون الدعم تعود إلى `dt.files`.
 */
export async function collectFilesWithRelativePathsFromDrop(dt: DataTransfer): Promise<File[]> {
  const out: File[] = []
  const items = dt.items

  if (items && items.length > 0) {
    const roots = Array.from(items)
      .map((it) => it.webkitGetAsEntry?.())
      .filter((e): e is FileSystemEntry => !!e)
    if (roots.length > 0) {
      await Promise.all(roots.map((e) => walkEntry(e, "", out)))
    }
  }

  if (out.length === 0 && dt.files?.length) {
    return Array.from(dt.files)
  }
  return out
}

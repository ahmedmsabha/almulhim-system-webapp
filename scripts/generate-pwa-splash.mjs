/**
 * يولّد صور شاشة الإقلاع (PWA / iOS) من الأيقونة والنصوص.
 * تشغيل: npm run generate:splash
 */
import { createCanvas, GlobalFonts, loadImage } from '@napi-rs/canvas'
import sharp from 'sharp'
import {
  existsSync,
  mkdirSync,
  createWriteStream,
  writeFileSync,
} from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { get } from 'https'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const PUBLIC = join(ROOT, 'public')
const SPLASH_DIR = join(PUBLIC, 'splash')
const FONT_DIR = join(__dirname, 'fonts')
const ICON_PATH = join(PUBLIC, 'mulhim-icon.png')

/** انسخ هذه القيم مع هوية المنتج عند التحديث (يتوافق مع lib/config.ts عند الإمكان) */
const COPY = {
  titleAr: 'المُلهم',
  taglineAr: 'اللهم قوة',
  teacherAr: 'أ. علي عبد الكريم جودة',
}

/** اسم مستعار لكل ملف خط — يُستخدم كما هو في ctx.font */
const FONT_FILES = [
  {
    file: 'IBMPlexSansArabic-Bold.ttf',
    url: 'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/ibmplexsansarabic/IBMPlexSansArabic-Bold.ttf',
    alias: 'MulhimSplash Bold',
  },
  {
    file: 'IBMPlexSansArabic-Medium.ttf',
    url: 'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/ibmplexsansarabic/IBMPlexSansArabic-Medium.ttf',
    alias: 'MulhimSplash',
  },
]

/** مقاسات شائعة + اسم الملف + استعلام وسائط iOS Safari */
const VARIANTS = [
  {
    name: 'iphone-1290x2796.png',
    w: 1290,
    h: 2796,
    media:
      'screen and (device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3)',
  },
  {
    name: 'iphone-1179x2556.png',
    w: 1179,
    h: 2556,
    media:
      'screen and (device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3)',
  },
  {
    name: 'iphone-1284x2778.png',
    w: 1284,
    h: 2778,
    media:
      'screen and (device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3)',
  },
  {
    name: 'iphone-828x1792.png',
    w: 828,
    h: 1792,
    media:
      'screen and (device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2)',
  },
]

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = createWriteStream(dest)
    get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode} ${url}`))
        return
      }
      res.pipe(file)
      file.on('finish', () => file.close(resolve))
    }).on('error', reject)
  })
}

async function ensureFonts() {
  mkdirSync(FONT_DIR, { recursive: true })
  for (const { file, url } of FONT_FILES) {
    const dest = join(FONT_DIR, file)
    if (!existsSync(dest)) {
      console.info(`تنزيل الخط: ${file}`)
      await download(url, dest)
    }
  }
  for (const { file, alias } of FONT_FILES) {
    const key = GlobalFonts.registerFromPath(join(FONT_DIR, file), alias)
    if (!key) console.warn(`تعذّر تسجيل الخط ${file}`)
  }
}

function drawRoundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

/**
 * @param {import('@napi-rs/canvas').CanvasRenderingContext2D} ctx
 */
async function renderSplash(ctx, width, height, iconImage) {
  const cx = width / 2
  const ref = Math.min(width, height)

  const bg = ctx.createLinearGradient(0, 0, width, height)
  bg.addColorStop(0, '#020617')
  bg.addColorStop(0.45, '#0f172a')
  bg.addColorStop(1, '#082f49')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, width, height)

  const glow = ctx.createRadialGradient(cx, height * 0.22, 0, cx, height * 0.22, ref * 0.55)
  glow.addColorStop(0, 'rgba(56, 189, 248, 0.22)')
  glow.addColorStop(0.45, 'rgba(14, 165, 233, 0.06)')
  glow.addColorStop(1, 'rgba(15, 23, 42, 0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, width, height)

  ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)'
  ctx.lineWidth = Math.max(2, ref * 0.004)
  ctx.beginPath()
  ctx.arc(cx, height * 0.26, ref * 0.38, Math.PI * 1.05, Math.PI * 1.95)
  ctx.stroke()

  const iconMax = ref * 0.42
  const iw = iconImage.width
  const ih = iconImage.height
  const scale = iconMax / Math.max(iw, ih)
  const dw = iw * scale
  const dh = ih * scale
  const ix = cx - dw / 2
  const iy = height * 0.14

  const corner = ref * 0.055
  ctx.save()
  ctx.shadowColor = 'rgba(56, 189, 248, 0.45)'
  ctx.shadowBlur = ref * 0.03
  ctx.shadowOffsetY = ref * 0.008
  ctx.beginPath()
  drawRoundedRect(ctx, ix, iy, dw, dh, corner)
  ctx.clip()
  ctx.drawImage(iconImage, ix, iy, dw, dh)
  ctx.restore()

  ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)'
  ctx.lineWidth = Math.max(1.5, ref * 0.002)
  ctx.beginPath()
  drawRoundedRect(ctx, ix, iy, dw, dh, corner)
  ctx.stroke()

  ctx.textAlign = 'center'
  ctx.direction = 'rtl'

  const titleSize = ref * 0.074
  let y = iy + dh + ref * 0.065
  ctx.font = `${titleSize}px "MulhimSplash Bold"`
  ctx.fillStyle = '#f8fafc'
  ctx.shadowColor = 'rgba(15, 23, 42, 0.85)'
  ctx.shadowBlur = ref * 0.025
  ctx.shadowOffsetY = ref * 0.006
  ctx.fillText(COPY.titleAr, cx, y)

  ctx.shadowBlur = 0
  ctx.shadowOffsetY = 0

  const gold = '#e8c547'
  const lineW = ref * 0.28
  const lineY = y + ref * 0.045
  ctx.strokeStyle = `rgba(232, 197, 71, 0.65)`
  ctx.lineWidth = Math.max(1, ref * 0.002)
  ctx.beginPath()
  ctx.moveTo(cx - lineW / 2, lineY)
  ctx.lineTo(cx + lineW / 2, lineY)
  ctx.stroke()

  y = lineY + ref * 0.052
  const tagSize = ref * 0.036
  ctx.font = `${tagSize}px "MulhimSplash"`
  ctx.fillStyle = gold
  ctx.fillText(COPY.taglineAr, cx, y)

  const lineY2 = y + ref * 0.038
  ctx.beginPath()
  ctx.moveTo(cx - lineW / 2, lineY2)
  ctx.lineTo(cx + lineW / 2, lineY2)
  ctx.stroke()

  y = lineY2 + ref * 0.065
  const teacherSize = ref * 0.032
  ctx.font = `${teacherSize}px "MulhimSplash"`
  ctx.fillStyle = '#cbd5e1'
  ctx.fillText(COPY.teacherAr, cx, y)

  ctx.font = `${teacherSize * 0.78}px "MulhimSplash"`
  ctx.fillStyle = '#64748b'
  ctx.fillText('منصة الفيزياء — التوجيهي', cx, y + ref * 0.055)
}

async function main() {
  if (!existsSync(ICON_PATH)) {
    console.error(`لم يُعثر على الأيقونة: ${ICON_PATH}`)
    process.exit(1)
  }

  await ensureFonts()
  mkdirSync(SPLASH_DIR, { recursive: true })

  const iconBuf = await sharp(ICON_PATH).ensureAlpha().png().toBuffer()
  const iconImage = await loadImage(iconBuf)

  for (const { name, w, h } of VARIANTS) {
    const canvas = createCanvas(w, h)
    const ctx = canvas.getContext('2d')
    await renderSplash(ctx, w, h, iconImage)
    const out = join(SPLASH_DIR, name)
    writeFileSync(out, canvas.toBuffer('image/png'))
    console.info(`✓ ${out}`)
  }

  const manifestLines = VARIANTS.map(({ name, media }) => {
    return `  {\n    href: '/splash/${name}',\n    media:\n      '${media}',\n  },`
  }).join('\n')

  const snippet = `// أُنشئ تلقائياً بواسطة npm run generate:splash — لا يُحرَّر يدوياً
export const APPLE_SPLASH_LINKS = [
${manifestLines}
] as const
`

  const genPath = join(ROOT, 'lib/apple-splash-links.generated.ts')
  writeFileSync(genPath, snippet)
  console.info(`✓ ${genPath}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

/** Storage bucket keys (R2 / Supabase Storage) — align with deployment. */
export const STORAGE_BUCKETS = {
  videos: 'videos',
  pdfs: 'pdfs',
  thumbnails: 'thumbnails',
  announcements: 'announcements',
  /** مرفقات الدردشة (خاص — قراءة عبر روابط موقّعة من الخادم). */
  chatAttachments: 'chat_attachments',
} as const;

/** Public CDN origin for static assets (optional). */
export const CDN_BASE_URL =
  process.env.NEXT_PUBLIC_CDN_BASE_URL?.replace(
    /\/$/,
    '',
  ) ?? '';

/** هوية التطبيق — اسم العلامة، الشعار النصي، والمعلم. */
export const BRAND = {
  nameAr: 'المُلهم',
  taglineAr: 'المُلهم في الفيزياء',
  /** يُستخدم في شاشة الإقلاع والهوية البصرية مع الشعار */
  splashTaglineAr: 'اللهم قوة',
  teacherAr: 'أ. علي عبد الكريم جودة',
  /** مسار الأيقونة المولَّدة للعلامة (PNG في public). */
  iconPath: '/mulhim-icon.png' as const,
} as const;

/** منتج واحد حالياً — قابل للتوسعة لاحقاً عبر نفس الحقول. */
export const PROGRAM = {
  id: 'ps-tawjihi-12',
  /** قيمة افتراضية لحقل الصف في الملف الشخصي (متوافقة مع منهاج فلسطين — التوجيهي). */
  defaultGradeCode: '12',
  labelAr: 'التوجيهي — الصف الثاني عشر (فلسطين)',
  shortLabelAr: 'التوجيهي (فلسطين)',
} as const;

export const CURRENCY = {
  code: 'ILS' as const,
  labelAr: 'شيكل',
  symbol: '₪',
} as const;

export const APP_METADATA = {
  name: BRAND.taglineAr,
  description: `منصة تعليمية لتعلم الفيزياء وفق منهاج فلسطين (التوجيهي / الصف الثاني عشر) مع ${BRAND.teacherAr}: دروس مصورة، ملخصات، وتمارين.`,
} as const;

export const SUPPORTED_FILE_TYPES = {
  video: ['.mp4', '.webm', '.m4v'],
  pdf: ['.pdf'],
  image: ['.jpg', '.jpeg', '.png', '.webp'],
} as const;

/** Absolute site origin for Supabase redirects (Email confirm / OTP). */
export function getPublicSiteUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_BASE_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel.replace(/\/$/, '')}`;
  return 'http://localhost:3000';
}

/** روابط تواصل الطلاب مع المعلِّم — اضبطها في الإنتاج عبر المتغيرات العامة. */
export const TEACHER_CONTACT = {
  telegramUrl:
    process.env.NEXT_PUBLIC_TEACHER_TELEGRAM_URL?.trim().replace(
      /\/$/,
      '',
    ) || undefined,
  whatsappUrl:
    process.env.NEXT_PUBLIC_TEACHER_WHATSAPP_URL?.trim().replace(
      /\/$/,
      '',
    ) || undefined,
} as const;

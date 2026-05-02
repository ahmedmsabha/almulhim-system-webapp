import type {
  Profile,
  VideoLesson,
  PDFMaterial,
  Announcement,
  Message,
  Conversation,
  Subscription,
  SubscriptionPlan,
  DownloadedItem,
  WatchProgress,
  AdminStats,
  LessonWithProgress,
  MaterialWithStatus,
  Lesson,
  PDF,
  DemoStudent,
} from './types'

function buildDemoStudentRows(
  studentsList: (Profile & { subscription?: Subscription })[]
): DemoStudent[] {
  return studentsList.map((s) => {
    const status = s.subscription?.status
    const isActive = status === "active" || status === "expiring_soon"
    const plan = s.subscription?.plan_name ?? ""
    const subscriptionType =
      plan.includes("سنو") ? "premium"
        : plan.includes("شهر") ? "monthly"
        : "term"

    return {
      id: s.id,
      name: s.full_name,
      email: s.email,
      phone: s.phone,
      isActive,
      subscriptionType,
      subscriptionEndDate: s.subscription?.end_date ?? null,
      createdAt: s.created_at,
    }
  })
}
// Sample Student Profile
export const sampleStudent: Profile = {
  id: 'student-1',
  email: 'ahmed@example.com',
  full_name: 'أحمد محمد علي',
  phone: '01012345678',
  grade: 'الصف الثالث الثانوي',
  avatar_url: null,
  role: 'student',
  created_at: '2024-09-01T10:00:00Z',
  updated_at: '2024-09-01T10:00:00Z',
}

// Sample Admin Profile
export const sampleAdmin: Profile = {
  id: 'admin-1',
  email: 'teacher@physics.com',
  full_name: 'أ. علي عبد الكريم جودة',
  phone: '01098765432',
  grade: '',
  avatar_url: null,
  role: 'admin',
  created_at: '2024-01-01T10:00:00Z',
  updated_at: '2024-01-01T10:00:00Z',
}

// Sample Video Lessons
export const sampleLessons: VideoLesson[] = [
  {
    id: 'lesson-1',
    title: 'مقدمة في الميكانيكا الكلاسيكية',
    description: 'نتعرف في هذا الدرس على أساسيات الميكانيكا الكلاسيكية وقوانين نيوتن للحركة',
    unit: 'الوحدة الأولى: الميكانيكا',
    duration: 2400, // 40 minutes
    thumbnail_url: '/placeholder.svg',
    hls_url: null,
    youtube_id: null,
    is_preview: false,
    is_published: true,
    order: 1,
    created_at: '2024-09-01T10:00:00Z',
    updated_at: '2024-09-01T10:00:00Z',
  },
  {
    id: 'lesson-2',
    title: 'قوانين نيوتن للحركة',
    description: 'شرح مفصل لقوانين نيوتن الثلاثة مع أمثلة تطبيقية',
    unit: 'الوحدة الأولى: الميكانيكا',
    duration: 3000, // 50 minutes
    thumbnail_url: '/placeholder.svg',
    hls_url: null,
    youtube_id: null,
    is_preview: false,
    is_published: true,
    order: 2,
    created_at: '2024-09-02T10:00:00Z',
    updated_at: '2024-09-02T10:00:00Z',
  },
  {
    id: 'lesson-3',
    title: 'الطاقة والشغل',
    description: 'مفهوم الطاقة والشغل وقانون حفظ الطاقة',
    unit: 'الوحدة الثانية: الطاقة',
    duration: 2700, // 45 minutes
    thumbnail_url: '/placeholder.svg',
    hls_url: null,
    youtube_id: null,
    is_preview: false,
    is_published: true,
    order: 3,
    created_at: '2024-09-05T10:00:00Z',
    updated_at: '2024-09-05T10:00:00Z',
  },
  {
    id: 'lesson-4',
    title: 'درس تجريبي: مقدمة في الفيزياء',
    description: 'درس مجاني للتعرف على المنصة وأسلوب الشرح',
    unit: 'دروس تجريبية',
    duration: 1200, // 20 minutes
    thumbnail_url: '/placeholder.svg',
    hls_url: null,
    youtube_id: 'dQw4w9WgXcQ',
    is_preview: true,
    is_published: true,
    order: 0,
    created_at: '2024-08-01T10:00:00Z',
    updated_at: '2024-08-01T10:00:00Z',
  },
  {
    id: 'lesson-5',
    title: 'الحركة الدائرية',
    description: 'شرح الحركة الدائرية والقوة الجاذبة المركزية',
    unit: 'الوحدة الأولى: الميكانيكا',
    duration: 2100, // 35 minutes
    thumbnail_url: '/placeholder.svg',
    hls_url: null,
    youtube_id: null,
    is_preview: false,
    is_published: true,
    order: 4,
    created_at: '2024-09-08T10:00:00Z',
    updated_at: '2024-09-08T10:00:00Z',
  },
  {
    id: 'lesson-6',
    title: 'الموجات الميكانيكية',
    description: 'خصائص الموجات الميكانيكية وأنواعها',
    unit: 'الوحدة الثالثة: الموجات',
    duration: 2800, // ~47 minutes
    thumbnail_url: '/placeholder.svg',
    hls_url: null,
    youtube_id: null,
    is_preview: false,
    is_published: true,
    order: 5,
    created_at: '2024-09-10T10:00:00Z',
    updated_at: '2024-09-10T10:00:00Z',
  },
]

// Sample PDF Materials
export const sampleMaterials: PDFMaterial[] = [
  {
    id: 'pdf-1',
    title: 'ملخص الوحدة الأولى - الميكانيكا',
    description: 'ملخص شامل لجميع قوانين ومفاهيم الميكانيكا',
    category: 'ملخصات',
    file_url: null,
    file_size: 2500000, // 2.5 MB
    page_count: 15,
    is_published: true,
    created_at: '2024-09-05T10:00:00Z',
    updated_at: '2024-09-05T10:00:00Z',
  },
  {
    id: 'pdf-2',
    title: 'تمارين قوانين نيوتن',
    description: 'مجموعة تمارين محلولة على قوانين نيوتن',
    category: 'تمارين',
    file_url: null,
    file_size: 1800000, // 1.8 MB
    page_count: 20,
    is_published: true,
    created_at: '2024-09-06T10:00:00Z',
    updated_at: '2024-09-06T10:00:00Z',
  },
  {
    id: 'pdf-3',
    title: 'شرح تفصيلي - الطاقة والشغل',
    description: 'شرح مفصل لمفاهيم الطاقة والشغل مع رسومات توضيحية',
    category: 'شرح',
    file_url: null,
    file_size: 3200000, // 3.2 MB
    page_count: 25,
    is_published: true,
    created_at: '2024-09-07T10:00:00Z',
    updated_at: '2024-09-07T10:00:00Z',
  },
  {
    id: 'pdf-4',
    title: 'امتحان تجريبي - الوحدة الأولى',
    description: 'امتحان تجريبي شامل على الوحدة الأولى',
    category: 'امتحانات',
    file_url: null,
    file_size: 900000, // 900 KB
    page_count: 8,
    is_published: true,
    created_at: '2024-09-10T10:00:00Z',
    updated_at: '2024-09-10T10:00:00Z',
  },
  {
    id: 'pdf-5',
    title: 'حلول الامتحان التجريبي',
    description: 'الحلول النموذجية للامتحان التجريبي',
    category: 'حلول',
    file_url: null,
    file_size: 1200000, // 1.2 MB
    page_count: 12,
    is_published: true,
    created_at: '2024-09-11T10:00:00Z',
    updated_at: '2024-09-11T10:00:00Z',
  },
]

// Sample Announcements
export const sampleAnnouncements: Announcement[] = [
  {
    id: 'ann-1',
    title: 'موعد المراجعة النهائية',
    body: 'سيتم عقد جلسة مراجعة نهائية يوم السبت القادم الساعة 7 مساءً. الجلسة ستكون بث مباشر على المنصة. يرجى التأكد من استقرار اتصال الإنترنت.',
    content:
      'سيتم عقد جلسة مراجعة نهائية يوم السبت القادم الساعة 7 مساءً. الجلسة ستكون بث مباشر على المنصة. يرجى التأكد من استقرار اتصال الإنترنت.',
    image_url: null,
    is_pinned: true,
    is_published: true,
    published_at: '2024-09-15T10:00:00Z',
    created_at: '2024-09-15T10:00:00Z',
    updated_at: '2024-09-15T10:00:00Z',
    priority: 'high',
    targetAudience: 'premium',
  },
  {
    id: 'ann-2',
    title: 'إضافة دروس جديدة',
    body: 'تم إضافة 3 دروس جديدة في وحدة الموجات. يمكنكم مشاهدتها الآن من قسم الدروس.',
    content: 'تم إضافة 3 دروس جديدة في وحدة الموجات. يمكنكم مشاهدتها الآن من قسم الدروس.',
    image_url: '/images/announcements/new-lessons.jpg',
    is_pinned: false,
    is_published: true,
    published_at: '2024-09-12T10:00:00Z',
    created_at: '2024-09-12T10:00:00Z',
    updated_at: '2024-09-12T10:00:00Z',
    priority: 'medium',
    targetAudience: 'all',
  },
  {
    id: 'ann-3',
    title: 'نصائح للمذاكرة',
    body: 'مع اقتراب الامتحانات، إليكم بعض النصائح المهمة: ابدأوا بالمراجعة مبكراً، ركزوا على فهم المفاهيم قبل الحفظ، وحلوا أكبر عدد ممكن من التمارين.',
    content:
      'مع اقتراب الامتحانات، إليكم بعض النصائح المهمة: ابدأوا بالمراجعة مبكراً، ركزوا على فهم المفاهيم قبل الحفظ، وحلوا أكبر عدد ممكن من التمارين.',
    image_url: null,
    is_pinned: false,
    is_published: true,
    published_at: '2024-09-10T10:00:00Z',
    created_at: '2024-09-10T10:00:00Z',
    updated_at: '2024-09-10T10:00:00Z',
    priority: 'low',
    targetAudience: 'free',
  },
]

// Sample Messages
export const sampleMessages: Message[] = [
  {
    id: 'msg-1',
    conversation_id: 'conv-1',
    sender_id: 'student-1',
    sender_role: 'student',
    content: 'السلام عليكم أستاذ، عندي سؤال بخصوص درس قوانين نيوتن',
    is_read: true,
    created_at: '2024-09-14T14:30:00Z',
  },
  {
    id: 'msg-2',
    conversation_id: 'conv-1',
    sender_id: 'admin-1',
    sender_role: 'admin',
    content: 'وعليكم السلام أحمد، تفضل اسأل',
    is_read: true,
    created_at: '2024-09-14T14:35:00Z',
  },
  {
    id: 'msg-3',
    conversation_id: 'conv-1',
    sender_id: 'student-1',
    sender_role: 'student',
    content: 'في مسألة الجسم على المستوى المائل، كيف أحدد اتجاه القوة العمودية؟',
    is_read: true,
    created_at: '2024-09-14T14:40:00Z',
  },
  {
    id: 'msg-4',
    conversation_id: 'conv-1',
    sender_id: 'admin-1',
    sender_role: 'admin',
    content: 'القوة العمودية دائماً تكون عمودية على السطح الذي يرتكز عليه الجسم. في حالة المستوى المائل، تكون القوة عمودية على سطح المستوى وليس على الأرض.',
    is_read: false,
    created_at: '2024-09-14T14:45:00Z',
  },
]

// Sample Conversations
export const sampleConversations: Conversation[] = [
  {
    id: 'conv-1',
    student_id: 'student-1',
    student_name: 'أحمد محمد علي',
    student_avatar: null,
    last_message: 'القوة العمودية دائماً تكون عمودية على السطح...',
    last_message_at: '2024-09-14T14:45:00Z',
    unread_count: 1,
    created_at: '2024-09-14T14:30:00Z',
  },
  {
    id: 'conv-2',
    student_id: 'student-2',
    student_name: 'سارة أحمد',
    student_avatar: null,
    last_message: 'شكراً جزيلاً أستاذ',
    last_message_at: '2024-09-13T18:20:00Z',
    unread_count: 0,
    created_at: '2024-09-13T16:00:00Z',
  },
  {
    id: 'conv-3',
    student_id: 'student-3',
    student_name: 'محمد خالد',
    student_avatar: null,
    last_message: 'أستاذ متى ستنزل دروس الكهربية؟',
    last_message_at: '2024-09-12T10:15:00Z',
    unread_count: 1,
    created_at: '2024-09-12T10:10:00Z',
  },
]

// Sample Subscription Plans
export const samplePlans: SubscriptionPlan[] = [
  {
    id: 'plan-1',
    name: 'الباقة الشهرية',
    description: 'اشتراك لمدة شهر واحد',
    duration_days: 30,
    price: 200,
    is_active: true,
    created_at: '2024-01-01T10:00:00Z',
    updated_at: '2024-01-01T10:00:00Z',
  },
  {
    id: 'plan-2',
    name: 'باقة الترم',
    description: 'اشتراك لمدة 4 أشهر (ترم دراسي كامل)',
    duration_days: 120,
    price: 700,
    is_active: true,
    created_at: '2024-01-01T10:00:00Z',
    updated_at: '2024-01-01T10:00:00Z',
  },
  {
    id: 'plan-3',
    name: 'الباقة السنوية',
    description: 'اشتراك لمدة سنة كاملة مع خصم خاص',
    duration_days: 365,
    price: 1500,
    is_active: true,
    created_at: '2024-01-01T10:00:00Z',
    updated_at: '2024-01-01T10:00:00Z',
  },
]

// Sample Student Subscription
export const sampleSubscription: Subscription = {
  id: 'sub-1',
  student_id: 'student-1',
  plan_id: 'plan-2',
  plan_name: 'باقة الترم',
  status: 'active',
  start_date: '2024-09-01T00:00:00Z',
  end_date: '2024-12-31T23:59:59Z',
  created_at: '2024-09-01T10:00:00Z',
  updated_at: '2024-09-01T10:00:00Z',
}

// Sample Watch Progress
export const sampleWatchProgress: WatchProgress[] = [
  {
    id: 'wp-1',
    student_id: 'student-1',
    lesson_id: 'lesson-1',
    progress: 100,
    last_position: 2400,
    completed: true,
    last_watched_at: '2024-09-10T15:30:00Z',
  },
  {
    id: 'wp-2',
    student_id: 'student-1',
    lesson_id: 'lesson-2',
    progress: 65,
    last_position: 1950,
    completed: false,
    last_watched_at: '2024-09-14T20:00:00Z',
  },
  {
    id: 'wp-3',
    student_id: 'student-1',
    lesson_id: 'lesson-3',
    progress: 30,
    last_position: 810,
    completed: false,
    last_watched_at: '2024-09-12T18:00:00Z',
  },
]

// Sample Downloaded Items
export const sampleDownloads: DownloadedItem[] = [
  {
    id: 'dl-1',
    item_type: 'video',
    item_id: 'lesson-1',
    title: 'مقدمة في الميكانيكا الكلاسيكية',
    file_size: 450000000, // 450 MB
    downloaded_at: '2024-09-10T10:00:00Z',
    local_path: '/offline/videos/lesson-1',
  },
  {
    id: 'dl-2',
    item_type: 'pdf',
    item_id: 'pdf-1',
    title: 'ملخص الوحدة الأولى - الميكانيكا',
    file_size: 2500000, // 2.5 MB
    downloaded_at: '2024-09-11T10:00:00Z',
    local_path: '/offline/pdfs/pdf-1',
  },
]

// Sample Admin Stats
export const sampleAdminStats: AdminStats = {
  active_students: 156,
  expiring_subscriptions: 12,
  total_lessons: 45,
  total_pdfs: 32,
  unread_messages: 5,
  recent_announcements: 3,
}

// Combined lessons with progress for student view
export const sampleLessonsWithProgress: LessonWithProgress[] = sampleLessons.map((lesson) => ({
  ...lesson,
  watch_progress: sampleWatchProgress.find((wp) => wp.lesson_id === lesson.id),
  download_status: sampleDownloads.find((d) => d.item_id === lesson.id && d.item_type === 'video')
    ? 'downloaded'
    : 'not_downloaded',
}))

// Combined materials with status for student view
export const sampleMaterialsWithStatus: MaterialWithStatus[] = sampleMaterials.map((material) => ({
  ...material,
  download_status: sampleDownloads.find((d) => d.item_id === material.id && d.item_type === 'pdf')
    ? 'downloaded'
    : 'not_downloaded',
}))

// Sample Students List for Admin
export const sampleStudentsList: (Profile & { subscription?: Subscription })[] = [
  {
    ...sampleStudent,
    subscription: sampleSubscription,
  },
  {
    id: 'student-2',
    email: 'sara@example.com',
    full_name: 'سارة أحمد',
    phone: '01123456789',
    grade: 'الصف الثالث الثانوي',
    avatar_url: null,
    role: 'student',
    created_at: '2024-08-15T10:00:00Z',
    updated_at: '2024-08-15T10:00:00Z',
    subscription: {
      id: 'sub-2',
      student_id: 'student-2',
      plan_id: 'plan-1',
      plan_name: 'الباقة الشهرية',
      status: 'expiring_soon',
      start_date: '2024-09-01T00:00:00Z',
      end_date: '2024-09-30T23:59:59Z',
      created_at: '2024-09-01T10:00:00Z',
      updated_at: '2024-09-01T10:00:00Z',
    },
  },
  {
    id: 'student-3',
    email: 'mohamed@example.com',
    full_name: 'محمد خالد',
    phone: '01234567890',
    grade: 'الصف الثاني الثانوي',
    avatar_url: null,
    role: 'student',
    created_at: '2024-07-01T10:00:00Z',
    updated_at: '2024-07-01T10:00:00Z',
    subscription: {
      id: 'sub-3',
      student_id: 'student-3',
      plan_id: 'plan-3',
      plan_name: 'الباقة السنوية',
      status: 'active',
      start_date: '2024-07-01T00:00:00Z',
      end_date: '2025-06-30T23:59:59Z',
      created_at: '2024-07-01T10:00:00Z',
      updated_at: '2024-07-01T10:00:00Z',
    },
  },
  {
    id: 'student-4',
    email: 'fatima@example.com',
    full_name: 'فاطمة محمود',
    phone: '01087654321',
    grade: 'الصف الثالث الثانوي',
    avatar_url: null,
    role: 'student',
    created_at: '2024-06-01T10:00:00Z',
    updated_at: '2024-06-01T10:00:00Z',
    subscription: {
      id: 'sub-4',
      student_id: 'student-4',
      plan_id: 'plan-2',
      plan_name: 'باقة الترم',
      status: 'expired',
      start_date: '2024-05-01T00:00:00Z',
      end_date: '2024-08-31T23:59:59Z',
      created_at: '2024-05-01T10:00:00Z',
      updated_at: '2024-05-01T10:00:00Z',
    },
  },
]

/** Chips لصفحة إدارة الدروس التجريبية */
export const lessonFilterCategories = Array.from(new Set(sampleLessons.map((l) => l.unit))).map(
  (name, idx) => ({ id: `lcat-${idx}`, name })
)

export function videoLessonToAdminLesson(l: VideoLesson): Lesson {
  const cat =
    lessonFilterCategories.find((c) => c.name === l.unit) ?? lessonFilterCategories[0]!
  return {
    id: l.id,
    title: l.title,
    description: l.description,
    duration: Math.max(1, Math.ceil(l.duration / 60)),
    categoryId: cat.id,
    isFree: l.is_preview,
    videoUrl: l.hls_url,
    viewCount: 0,
  }
}

/** بيانات شاشة تجريبية لمطابق نموذج واجهة الإدارة */
export const adminDemoLessons: Lesson[] = sampleLessons.map(videoLessonToAdminLesson)

/** Chips لصفحة إدارة PDF */
export const pdfFilterCategories = Array.from(new Set(sampleMaterials.map((m) => m.category))).map(
  (name, idx) => ({ id: `pcat-${idx}`, name })
)

export function pdfMaterialToAdminPdf(m: PDFMaterial): PDF {
  const cat =
    pdfFilterCategories.find((c) => c.name === m.category) ?? pdfFilterCategories[0]!
  return {
    id: m.id,
    title: m.title,
    description: m.description ?? "",
    categoryId: cat.id,
    isFree: false,
    fileSize: m.file_size,
    downloadCount: 0,
  }
}

export const adminDemoPdfRows: PDF[] = sampleMaterials.map(pdfMaterialToAdminPdf)

export const samplePDFs = adminDemoPdfRows

export const demoStudents: DemoStudent[] = buildDemoStudentRows(sampleStudentsList)

export const sampleStudents = sampleStudentsList

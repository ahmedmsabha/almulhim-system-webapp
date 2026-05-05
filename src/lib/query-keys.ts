export const queryKeys = {
  studentLessons: () => ["student", "lessons"] as const,
  studentLesson: (id: string) => ["student", "lesson", id] as const,
  studentMaterials: () => ["student", "materials"] as const,
  studentMaterial: (id: string) => ["student", "material", id] as const,
  studentAnnouncements: () => ["student", "announcements"] as const,
  studentMessages: (conversationId: string) =>
    ["student", "messages", conversationId] as const,

  adminLessons: () => ["admin", "lessons"] as const,
  adminMaterials: () => ["admin", "materials"] as const,
  adminStudents: () => ["admin", "students"] as const,
  adminConversation: (id: string) => ["admin", "conversation", id] as const,
  adminMessages: () => ["admin", "messages"] as const,
  adminAnnouncements: () => ["admin", "announcements"] as const,
  adminSettings: () => ["admin", "settings"] as const,
}

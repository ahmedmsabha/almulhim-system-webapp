# المُلهم في الفيزياء — Architecture Reference

> **Stack**: Next.js 16.2 · Supabase · Drizzle ORM · Tailwind v4 · Vercel  
> **Market**: Palestine / Tawjihi / Grade 12 · Currency: ILS  
> **Config**: `lib/config.ts`

---

## Table of Contents

1. [Tech Stack](#1-tech-stack)
2. [Directory Structure](#2-directory-structure)
3. [Route Groups & Guards](#3-route-groups--guards)
4. [Proxy (Next.js 16)](#4-proxy-nextjs-16)
5. [Auth & Profile Flow](#5-auth--profile-flow)
6. [Database Connections](#6-database-connections)
7. [Single-Device Binding](#7-single-device-binding)
8. [Database Schema](#8-database-schema)
9. [RLS Policies](#9-rls-policies)
10. [Video Strategy](#10-video-strategy)
11. [Subscription Lifecycle](#11-subscription-lifecycle)
12. [Messaging Strategy](#12-messaging-strategy)
13. [SQL Scripts](#13-sql-scripts)
14. [Validation — Known Gap](#14-validation--known-gap)
15. [Naming Conventions](#15-naming-conventions)

---

## 1. Tech Stack

| Responsibility        | Technology                                      |
|-----------------------|-------------------------------------------------|
| Frontend / SSR        | Next.js 16.2 (App Router) + TypeScript strict   |
| UI                    | React 19 · Tailwind v4 · shadcn/ui · TanStack Query |
| Auth                  | Supabase Auth via `@supabase/ssr` (JWT + Cookies) |
| ORM                   | Drizzle ORM — single schema file, push via `db:push` |
| Database              | Supabase PostgreSQL                             |
| Video Storage         | Cloudflare R2 (HLS segments, no egress fees)    |
| File Storage          | Supabase Storage (PDFs · thumbnails · avatars)  |
| Video Playback        | HLS.js + Web Crypto API                         |
| PDF Viewer            | PDF.js                                          |
| Offline / PWA         | Service Worker + OPFS + IndexedDB + Workbox     |
| Edge Functions        | Supabase (encryption keys · expiry cron)        |
| Deploy                | Vercel                                          |

---

## 2. Directory Structure

```
/
├── app/
│   ├── (public)/           # No auth — landing, /login, /subscribe
│   ├── (student)/          # requireStudentLayoutContext
│   └── (admin)/            # requireAdminLayoutContext
│
├── lib/
│   ├── db/
│   │   ├── schema.ts       # ← single file for ALL Drizzle table definitions
│   │   └── queries/        # All DB queries — never inline in components
│   ├── config.ts           # App-wide constants (currency, grade, etc.)
│   ├── env.ts              # Zod-validated environment variables
│   └── supabase/           # Client + server Supabase helpers
│
├── actions/                # Server Actions
├── components/             # Shared UI (PascalCase)
├── scripts/                # SQL — run manually in Supabase SQL Editor
└── proxy.ts              # Session refresh ONLY — zero role logic (was `middleware.ts` in Next < 16)
```

---

## 3. Route Groups & Guards

| Group       | Paths              | Guard                                          |
|-------------|--------------------|------------------------------------------------|
| `(public)`  | `/` `/login` `/subscribe` | None                                  |
| `(student)` | `/student/*`       | `role = student` + subscription fetched for **UI state** |
| `(admin)`   | `/admin/*`         | `role = admin`                                 |

**Redirect rules**

| Scenario                        | Destination   |
|---------------------------------|---------------|
| Unauthenticated user            | `/login`      |
| Student accesses `/admin`       | `/student`    |
| Admin accesses `/student`       | `/admin`      |

> ⚠️ **Expired subscription does NOT redirect.**  
> The UI shows an `expired` badge. Content access is blocked at the **RLS level**, not the route guard.

---

## 4. Proxy (Next.js 16)

`proxy.ts` (اسم الملف الجاري في Next.js 16؛ وظيفة **Middleware** السابقة) مسؤول عن **تحديث ومزامنة جلسة Supabase** (استدعاء `getUser()` وتحديث الكوكيز عند الحاجة).

```
Request → proxy → refresh JWT cookies → continue
```

**لا تضف** منطق أدوار هنا. كل بوابات الصلاحيات في تخطيطات المسارات.

> **Turbopack**: في `next.config.mjs` يُضبَط `turbopack.root` على مجلد المشروع لتفادي تحذير «multiple lockfiles» عند وجود `pnpm-lock.yaml` في مجلد أب.

## 5. Auth & Profile Flow

```
Client: signInWithPassword()
        ↓
DB Trigger (003-auth-profile-trigger.sql)
  → INSERT INTO profiles ON auth.users INSERT
  → default: grade = 12, role from metadata if provided
        ↓
ensureProfileRow()   ← fallback only, ON CONFLICT (id) DO NOTHING
        ↓
resolvePostLoginDestination()
  → role = 'student'  →  /student
  → role = 'admin'    →  /admin
```

---

## 6. Database Connections

```ts
// Admin operations — bypasses RLS
adminDb           // SERVICE_ROLE key — server only, never in client bundles

// Student operations — RLS enforced
withUserDb(jwt)   // Passes user JWT through Supabase Pooler
```

| Rule | Detail |
|------|--------|
| `adminDb` scope | Admin Server Actions **only** |
| `withUserDb` requirement | Pooler must be in **Session mode** — not Transaction mode |
| Why Session mode | Transaction mode does not persist `SET LOCAL` JWT claims between queries → RLS breaks |

> 🔴 **NEVER** use `adminDb` in student-facing code.  
> 🔴 **NEVER** expose `SUPABASE_SERVICE_ROLE_KEY` in any client bundle.

---

## 7. Single-Device Binding

```
1. getOrCreateDeviceToken()
   └─ creates or reads token from localStorage

2. syncStudentDeviceBinding()  [Server Action]
   └─ hashes token with SHA-256
   └─ stores hash in student_device_bindings
   └─ if hash mismatch → reject (different device)

3. StudentDeviceGate  [Client Component]
   └─ UX-only pre-check — NOT the security boundary
   └─ on failure: sign out → redirect to /login

4. Server Action  ← actual trust anchor
   └─ re-verifies SHA-256 hash server-side on sensitive operations

5. Admin: adminResetStudentDeviceBinding()
   └─ clears binding to allow new device
```

SQL: `scripts/005-student-device-bindings.sql`

---

## 8. Database Schema

| Table | Key Columns | Notes |
|-------|-------------|-------|
| `profiles` | `id` · `full_name` · `phone` · `role` · `avatar_url` | Mirrors `auth.users`, created by trigger |
| `videos` | `hls_url` · `youtube_id` · `is_preview` · `is_published` · `order_index` | `youtube_id` only for free previews |
| `pdfs` | `file_path` · `is_published` · `order_index` | Path in Supabase Storage |
| `subscription_plans` | `name` · `duration_days` · `price` · `is_active` | Defined by admin |
| `subscriptions` | `user_id` · `plan_id` · `start_date` · `end_date` · `is_active` · `activated_by` | No JWT stored — auth uses session |
| `watch_logs` | `user_id` · `video_id` · `watched_seconds` · `completed` | Unique index on (user_id, video_id) |
| `announcements` | `title` · `content` · `image_url` · `is_pinned` | Real-time via Supabase channel |
| `conversations` | `student_id` · `last_message_at` · `unread_count` | Phase 2 |
| `messages` | `conversation_id` · `sender_id` · `content` · `is_read` | Phase 2 |
| `coupons` | `code` · `discount_days` · `max_uses` · `used_count` · `expires_at` | |
| `student_device_bindings` | `user_id` · `device_hash` | SHA-256 hash only — never raw token |

> ⚠️ Resolve naming conflict: codebase uses both `video_lessons` and `videos`.  
> Pick one in `lib/db/schema.ts` and update all queries + this document.

---

## 9. RLS Policies

| Table | Read Condition |
|-------|---------------|
| `videos` | `is_published = true` AND (`is_preview = true` OR active subscription) |
| `pdfs` | `is_published = true` AND active subscription |
| `announcements` | Active subscription (`is_active = true AND end_date >= CURRENT_DATE`) |
| `messages` | Own conversation only; admin: `auth.jwt() ->> 'role' = 'admin'` |
| `student_device_bindings` | Own row only via RLS — admin via `adminDb` |

**Active subscription definition** (used in all policies):
```sql
EXISTS (
  SELECT 1 FROM subscriptions
  WHERE user_id = auth.uid()
    AND is_active = true
    AND end_date >= CURRENT_DATE
)
```

---

## 10. Video Strategy

| Content | Storage | Reasoning |
|---------|---------|-----------|
| Free previews / landing page | YouTube Unlisted | Zero cost — visibility is acceptable |
| Paid full lessons | Cloudflare R2 + HLS | URL hidden · encrypted · OPFS offline support |

> 🔴 YouTube Video IDs are **always** visible in DevTools Network tab.  
> Never use YouTube for paid content — this is the original reason the platform was built.

---

## 11. Subscription Lifecycle

```
1. Student contacts teacher (WhatsApp / Telegram)
2. Teacher opens admin panel → enters email/phone → selects plan → clicks Activate
   └─ Creates Supabase Auth account + subscriptions row
   └─ Student receives invite email from Supabase Auth
3. Student logs in → access granted
4. [Cron — daily at 09:00] Edge Function checks subscriptions expiring in 3 days
   └─ Sends reminder email + Push Notification
5. After end_date: RLS blocks content access automatically
   └─ Route guard shows 'expired' state — does not redirect
```

---

## 12. Messaging Strategy

| Phase | Approach | Effort |
|-------|---------|--------|
| Phase 1 ✅ now | Telegram Deep Link (`t.me/teacher_username`) | ~1 hour |
| Phase 2 — later | Internal chat: `conversations` + `messages` + Supabase Realtime | Weeks |

---

## 13. SQL Scripts

Run in this order in **Supabase SQL Editor**:

```
scripts/
├── 001-create-tables.sql
├── 002-seed-data.sql
├── 003-auth-profile-trigger.sql        ← profile row on auth.users insert
├── 004-verify-critical-indexes.sql
└── 005-student-device-bindings.sql     ← RLS + device hash table
```

---

## 14. Validation — Known Gap

| Location | Status |
|----------|--------|
| `lib/env.ts` | ✅ Zod-validated |
| Server Actions (DB writes) | ❌ No systematic Zod validation yet |

**Goal**: add schemas in `lib/validators/` and call them before every DB write in Server Actions.

---

## 15. Naming Conventions

| Type | Convention | Example |
|------|-----------|---------|
| Components | PascalCase | `StudentDeviceGate` |
| Hooks | camelCase + `use` prefix | `useSubscriptionStatus` |
| Server Actions | camelCase (no strict suffix — mixed in codebase) | `signOutAction` · `adminResetStudentDeviceBinding` |
| DB Tables | snake_case | `student_device_bindings` |
| Constants | SCREAMING_SNAKE_CASE | `MAX_DEVICE_COUNT` |
| Imports | `@/` alias — never relative paths | `@/lib/db/queries/subscriptions` |

import 'server-only';
import { and, asc, eq, inArray, ne } from 'drizzle-orm';
import { jwtDecode, type JwtPayload } from 'jwt-decode';

import { adminDb, withUserDb } from '@/lib/db/client';
import {
  videoLessons,
  watchProgress,
} from '@/lib/db/schema';
import { subscriptionIsActive } from '@/lib/db/subscription';
import {
  ResourceNotFoundError,
  SubscriptionExpiredError,
  UnauthorizedError,
} from '@/lib/db/errors';
import { applyStreamSignedPlaybackToVideoLesson } from '@/lib/stream/cloudflare-stream';
import type {
  LessonWithProgress,
  VideoLesson,
  WatchProgress,
} from '@/types';

export function rowToVideoLesson(
  row: typeof videoLessons.$inferSelect,
): VideoLesson {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? '',
    unit: row.unit,
    duration: row.duration,
    thumbnail_url: row.thumbnail_url ?? null,
    hls_url: row.hls_url ?? null,
    youtube_id: row.youtube_id ?? null,
    is_preview: row.is_preview,
    is_published: row.is_published,
    order: row.order,
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
  };
}

export function wpRow(
  row: typeof watchProgress.$inferSelect,
): WatchProgress {
  return {
    id: row.id,
    student_id: row.student_id,
    lesson_id: row.lesson_id,
    progress: row.progress,
    last_position: row.last_position,
    completed: row.completed,
    last_watched_at: row.last_watched_at.toISOString(),
  };
}

/** All published lessons (admin/service client). Sorted by lesson order ascending. */
export async function getPublishedVideos(): Promise<
  VideoLesson[]
> {
  const rows = await adminDb
    .select()
    .from(videoLessons)
    .where(eq(videoLessons.is_published, true))
    .orderBy(
      asc(videoLessons.order),
      asc(videoLessons.created_at),
    );

  return rows.map(rowToVideoLesson);
}

/** Same filters as legacy `getLessons(options)`. */
export async function listVideoLessonsForAdmin(opts?: {
  is_published?: boolean;
  is_preview?: boolean;
  unit?: string;
}): Promise<VideoLesson[]> {
  const predicates = [];
  if (opts?.is_published !== undefined) {
    predicates.push(
      eq(videoLessons.is_published, opts.is_published),
    );
  }
  if (opts?.is_preview !== undefined) {
    predicates.push(
      eq(videoLessons.is_preview, opts.is_preview),
    );
  }
  if (opts?.unit) {
    predicates.push(eq(videoLessons.unit, opts.unit));
  }

  const rows =
    predicates.length > 0
      ? await adminDb
          .select()
          .from(videoLessons)
          .where(and(...predicates))
          .orderBy(
            asc(videoLessons.order),
            asc(videoLessons.created_at),
          )
      : await adminDb
          .select()
          .from(videoLessons)
          .orderBy(
            asc(videoLessons.order),
            asc(videoLessons.created_at),
          );

  return rows.map(rowToVideoLesson);
}

export async function getVideoById(
  id: string,
): Promise<VideoLesson | null> {
  const rows = await adminDb
    .select()
    .from(videoLessons)
    .where(eq(videoLessons.id, id))
    .limit(1);

  const row = rows[0];
  return row ? rowToVideoLesson(row) : null;
}

export async function getVideoWithAccess(
  id: string,
  accessToken: string,
): Promise<VideoLesson> {
  const subClaim = jwtDecode<JwtPayload>(accessToken).sub;
  if (!subClaim) {
    throw new UnauthorizedError();
  }

  return withUserDb(accessToken, async (tx) => {
    const rows = await tx
      .select()
      .from(videoLessons)
      .where(
        and(
          eq(videoLessons.id, id),
          eq(videoLessons.is_published, true),
        ),
      )
      .limit(1);

    const row = rows[0];
    if (!row) {
      throw new ResourceNotFoundError('Lesson not found');
    }

    if (row.is_preview) {
      return rowToVideoLesson(row);
    }

    const ok = await subscriptionIsActive(tx, subClaim);
    if (!ok) {
      throw new SubscriptionExpiredError();
    }

    return applyStreamSignedPlaybackToVideoLesson(rowToVideoLesson(row));
  });
}

/** Subscriber-visible published lessons — previews only without subscription; full catalog with active subscription. */
export async function getSubscriberVideos(
  accessToken: string,
): Promise<VideoLesson[]> {
  const subClaim = jwtDecode<JwtPayload>(accessToken).sub;
  if (!subClaim) {
    throw new UnauthorizedError();
  }

  return withUserDb(accessToken, async (tx) => {
    const active = await subscriptionIsActive(tx, subClaim);

    const rows = active
      ? await tx
          .select()
          .from(videoLessons)
          .where(eq(videoLessons.is_published, true))
          .orderBy(
            asc(videoLessons.order),
            asc(videoLessons.created_at),
          )
      : await tx
          .select()
          .from(videoLessons)
          .where(
            and(
              eq(videoLessons.is_published, true),
              eq(videoLessons.is_preview, true),
            ),
          )
          .orderBy(
            asc(videoLessons.order),
            asc(videoLessons.created_at),
          );

    return rows.map(rowToVideoLesson);
  });
}

/** One DB session for list + progress (avoids two `withUserDb` round-trips). */
export async function getSubscriberVideosWithProgress(
  accessToken: string,
): Promise<{
  lessons: VideoLesson[];
  progress: WatchProgress[];
}> {
  const subClaim = jwtDecode<JwtPayload>(accessToken).sub;
  if (!subClaim) {
    throw new UnauthorizedError();
  }

  return withUserDb(accessToken, async (tx) => {
    const active = await subscriptionIsActive(tx, subClaim);

    const lessonRows = active
      ? await tx
          .select()
          .from(videoLessons)
          .where(eq(videoLessons.is_published, true))
          .orderBy(
            asc(videoLessons.order),
            asc(videoLessons.created_at),
          )
      : await tx
          .select()
          .from(videoLessons)
          .where(
            and(
              eq(videoLessons.is_published, true),
              eq(videoLessons.is_preview, true),
            ),
          )
          .orderBy(
            asc(videoLessons.order),
            asc(videoLessons.created_at),
          );

    const progressRows = await tx
      .select()
      .from(watchProgress)
      .where(eq(watchProgress.student_id, subClaim));

    return {
      lessons: lessonRows.map(rowToVideoLesson),
      progress: progressRows.map(wpRow),
    };
  });
}

/** Lesson detail without loading the full catalog (critical on slow links). */
export async function getSubscriberLessonDetailPage(
  accessToken: string,
  lessonId: string,
): Promise<{
  lesson: LessonWithProgress;
  related: LessonWithProgress[];
} | null> {
  const subClaim = jwtDecode<JwtPayload>(accessToken).sub;
  if (!subClaim) {
    throw new UnauthorizedError();
  }

  return withUserDb(accessToken, async (tx) => {
    const active = await subscriptionIsActive(tx, subClaim);

    const [lessonRow] = await tx
      .select()
      .from(videoLessons)
      .where(
        and(
          eq(videoLessons.id, lessonId),
          eq(videoLessons.is_published, true),
        ),
      )
      .limit(1);

    if (!lessonRow) {
      return null;
    }

    if (!lessonRow.is_preview && !active) {
      return null;
    }

    const [wpMain] = await tx
      .select()
      .from(watchProgress)
      .where(
        and(
          eq(watchProgress.student_id, subClaim),
          eq(watchProgress.lesson_id, lessonId),
        ),
      )
      .limit(1);

    const relatedPredicates = [
      eq(videoLessons.is_published, true),
      eq(videoLessons.unit, lessonRow.unit),
      ne(videoLessons.id, lessonId),
    ] as const;

    const relatedRows = active
      ? await tx
          .select()
          .from(videoLessons)
          .where(and(...relatedPredicates))
          .orderBy(
            asc(videoLessons.order),
            asc(videoLessons.created_at),
          )
          .limit(8)
      : await tx
          .select()
          .from(videoLessons)
          .where(
            and(
              ...relatedPredicates,
              eq(videoLessons.is_preview, true),
            ),
          )
          .orderBy(
            asc(videoLessons.order),
            asc(videoLessons.created_at),
          )
          .limit(8);

    const relatedIds = relatedRows.map((r) => r.id);
    const relatedProgress =
      relatedIds.length === 0
        ? []
        : await tx
            .select()
            .from(watchProgress)
            .where(
              and(
                eq(watchProgress.student_id, subClaim),
                inArray(
                  watchProgress.lesson_id,
                  relatedIds,
                ),
              ),
            );

    const byLesson = new Map(
      relatedProgress.map((p) => [p.lesson_id, p]),
    );

    const signedLesson = await applyStreamSignedPlaybackToVideoLesson(
      rowToVideoLesson(lessonRow),
    );

    const lesson: LessonWithProgress = {
      ...signedLesson,
      watch_progress: wpMain ? wpRow(wpMain) : undefined,
      download_status: 'not_downloaded',
    };

    const related: LessonWithProgress[] = relatedRows.map(
      (r) => ({
        ...rowToVideoLesson(r),
        watch_progress: byLesson.get(r.id)
          ? wpRow(byLesson.get(r.id)!)
          : undefined,
        download_status: 'not_downloaded',
      }),
    );

    return { lesson, related };
  });
}

export async function upsertWatchProgress(
  userId: string,
  lessonId: string,
  secondsWatchedOrLastPosition: number,
  progressPercent: number,
  completedExplicit: boolean,
  accessToken: string,
): Promise<void> {
  const subClaim = jwtDecode<JwtPayload>(accessToken).sub;
  if (!subClaim || subClaim !== userId) {
    throw new UnauthorizedError();
  }

  const completedFlag =
    completedExplicit || progressPercent >= 95;

  await withUserDb(accessToken, async (tx) => {
    await tx
      .insert(watchProgress)
      .values({
        student_id: userId,
        lesson_id: lessonId,
        progress: Math.min(
          100,
          Math.round(progressPercent),
        ),
        last_position: Math.round(
          secondsWatchedOrLastPosition,
        ),
        completed: completedFlag,
        last_watched_at: new Date(),
      })
      .onConflictDoUpdate({
        target: [
          watchProgress.student_id,
          watchProgress.lesson_id,
        ],
        set: {
          progress: Math.min(
            100,
            Math.round(progressPercent),
          ),
          last_position: Math.round(
            secondsWatchedOrLastPosition,
          ),
          completed: completedFlag,
          last_watched_at: new Date(),
        },
      });
  });
}

/** Watch progress for the JWT subject (student). Optional filter by lesson. */
export async function watchProgressForUser(
  accessToken: string,
  lessonId?: string,
): Promise<WatchProgress[]> {
  return withUserDb(accessToken, async (tx) => {
    const subClaim = jwtDecode<JwtPayload>(accessToken).sub;
    if (!subClaim) throw new UnauthorizedError();

    const rows = lessonId
      ? await tx
          .select()
          .from(watchProgress)
          .where(
            and(
              eq(watchProgress.student_id, subClaim),
              eq(watchProgress.lesson_id, lessonId),
            ),
          )
      : await tx
          .select()
          .from(watchProgress)
          .where(eq(watchProgress.student_id, subClaim));

    return rows.map(wpRow);
  });
}

export async function adminCreateVideoLesson(input: {
  title: string;
  description?: string;
  unit: string;
  duration: number;
  thumbnail_url?: string | null;
  hls_url?: string | null;
  youtube_id?: string | null;
  is_preview?: boolean;
  is_published?: boolean;
  order?: number;
}): Promise<VideoLesson> {
  const [row] = await adminDb
    .insert(videoLessons)
    .values({
      title: input.title,
      description: input.description ?? '',
      unit: input.unit,
      duration: input.duration,
      thumbnail_url: input.thumbnail_url ?? null,
      hls_url: input.hls_url ?? null,
      youtube_id: input.youtube_id ?? null,
      is_preview: input.is_preview ?? false,
      is_published: input.is_published ?? true,
      order: input.order ?? 0,
    })
    .returning();

  if (!row) throw new Error('insert failed');
  return rowToVideoLesson(row);
}

export async function adminUpdateVideoLesson(
  id: string,
  input: Partial<{
    title: string;
    description: string;
    unit: string;
    duration: number;
    thumbnail_url: string | null;
    hls_url: string | null;
    youtube_id: string | null;
    is_preview: boolean;
    is_published: boolean;
    order: number;
  }>,
): Promise<VideoLesson | null> {
  const updatePayload: Record<string, unknown> = {
    updated_at: new Date(),
  };
  for (const [k, v] of Object.entries(input)) {
    if (v !== undefined) updatePayload[k] = v;
  }
  const [row] = await adminDb
    .update(videoLessons)
    .set(
      updatePayload as Partial<
        typeof videoLessons.$inferInsert
      >,
    )
    .where(eq(videoLessons.id, id))
    .returning();

  return row ? rowToVideoLesson(row) : null;
}

export async function adminDeleteVideoLesson(
  id: string,
): Promise<void> {
  await adminDb
    .delete(videoLessons)
    .where(eq(videoLessons.id, id));
}

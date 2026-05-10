'use server';

import {
  actionFailure,
  actionSuccess,
  mapCaughtErrorToAction,
} from '@/lib/action-utils';
import { requireStudent } from '@/actions/auth';
import { subscriptionIsActiveAdmin } from '@/lib/db/subscription';
import { getVideoById } from '@/lib/db/queries/videos';
import { isCloudflareStreamLessonManifestUrl } from '@/lib/stream/cloudflare-stream';
import { presignHlsOfflineBundle } from '@/lib/storage/r2-hls-presign';
import type { ActionResult } from '@/types/api';

export type InitiateDownloadPayload = {
  segments: string[];
  encryptionKey: string;
  /** Playlist with `__OFFLINE_SEG_n__` and optional `__OFFLINE_KEY__` placeholders for OPFS replay. */
  playlistTemplate: string;
};

/** Default ladder rung for offline bundles (matches `videos/{id}/480p/` layout). */
const DEFAULT_QUALITY_PX = 480;

export async function initiateDownloadAction(
  videoId: string,
  qualityPixels?: number,
): Promise<ActionResult<InitiateDownloadPayload>> {
  try {
    const gate = await requireStudent();
    if (!gate.success) {
      return actionFailure(gate.error, gate.code);
    }

    const active = await subscriptionIsActiveAdmin(
      gate.data.id,
    );
    if (!active) {
      return actionFailure(
        'الاشتراك غير نشط لتنزيل هذا الدرس',
        'SUBSCRIPTION_EXPIRED',
      );
    }

    const lesson = await getVideoById(videoId);
    if (!lesson || !lesson.is_published) {
      return actionFailure('الدرس غير موجود', 'NOT_FOUND');
    }
    if (
      lesson.is_preview ||
      !lesson.hls_url?.trim()
    ) {
      return actionFailure(
        'هذا المحتوى غير متاح للتحميل',
        'FORBIDDEN',
      );
    }

    if (isCloudflareStreamLessonManifestUrl(lesson.hls_url)) {
      return actionFailure(
        'تنزيل الحصة لدون اتصال غير مدعوم لهذا الدرس (فيديو Stream).',
        'FORBIDDEN',
      );
    }

    const q = qualityPixels ?? DEFAULT_QUALITY_PX;
    const bundle = await presignHlsOfflineBundle(
      lesson.hls_url,
      q,
    );

    return actionSuccess({
      segments: bundle.segmentUrls,
      encryptionKey: bundle.encryptionKeyHex,
      playlistTemplate: bundle.playlistTemplate,
    });
  } catch (e) {
    console.error('initiateDownloadAction', e);
    return mapCaughtErrorToAction(e);
  }
}

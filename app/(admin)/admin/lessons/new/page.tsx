import { AdminLessonsClient } from '@/components/admin/admin-lessons-client';
import { listVideoLessonsForAdmin } from '@/lib/db/queries/videos';
import { isTranscoderWorkerQueueConfigured } from '@/lib/server/transcoder-worker-config';
import {
  isR2BrowserUploadConfigured,
  isR2Configured,
} from '@/lib/storage/r2-hls-presign';
import { isCloudflareStreamUploadConfigured } from '@/lib/stream/cloudflare-stream';
import { isLessonVideoTranscodeAvailable } from '@/lib/video/transcode-lesson-hls';

export default async function AdminLessonNewPage() {
  const lessons = await listVideoLessonsForAdmin();
  return (
    <AdminLessonsClient
      initialLessons={lessons}
      autoOpenCreate
      enableR2LessonUpload={isR2Configured()}
      r2PublicPlaybackReady={isR2BrowserUploadConfigured()}
      enableR2ServerMedia={isR2Configured()}
      enableServerVideoTranscode={isLessonVideoTranscodeAvailable()}
      enableTranscoderWorkerQueue={isTranscoderWorkerQueueConfigured()}
      enableCloudflareStreamUpload={isCloudflareStreamUploadConfigured()}
    />
  );
}

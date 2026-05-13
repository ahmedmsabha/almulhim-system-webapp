import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { presignR2PutObject } from '@/lib/storage/r2-hls-presign';

export async function POST(req: Request) {
  const { fileName, fileSize, contentType } =
    (await req.json()) as {
      fileName: string;
      fileSize: number;
      contentType: string;
    };
  const lessonId = randomUUID();
  const relativePath = `_source/${fileName.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
  const sourceKey = `hls/${lessonId}/${relativePath}`;
  const signedUrl = await presignR2PutObject(
    sourceKey,
    contentType || 'video/mp4',
  );
  return NextResponse.json({
    signedUrl,
    sourceKey,
    lessonId,
  });
}

import { NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'node:crypto';

import { z } from 'zod';

import {
  adminUpdateVideoLesson,
  getVideoById,
} from '@/lib/db/queries/videos';
import { buildR2PublicUrlForObjectKey } from '@/lib/storage/r2-hls-presign';

export const runtime = 'nodejs';

const SIGNATURE_HEADER = 'X-Webhook-Signature';

const webhookBodySchema = z.object({
  lessonId: z.string().uuid(),
  masterKey: z.string().min(1).max(2048),
});

function verifyTranscodeWebhookHmacSha256(
  rawBody: string,
  headerValue: string | null,
  secret: string,
): boolean {
  if (!headerValue || !secret) return false;
  const v = headerValue.trim();
  const hex = v.toLowerCase().startsWith('sha256=')
    ? v.slice('sha256='.length).trim()
    : v.trim();

  let expectedHex: string;
  try {
    expectedHex = createHmac('sha256', secret)
      .update(rawBody, 'utf8')
      .digest('hex');
  } catch {
    return false;
  }

  try {
    const a = Buffer.from(hex, 'hex');
    const b = Buffer.from(expectedHex, 'hex');
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/** POST payload from transcoder worker (after HMAC-SHA256 of raw JSON body verified). */
export async function POST(
  request: Request,
): Promise<NextResponse> {
  const secret =
    process.env.TRANSCODER_WEBHOOK_SECRET?.trim();
  if (!secret) {
    return NextResponse.json(
      { ok: false, error: 'webhook_disabled' },
      { status: 503 },
    );
  }

  const rawBody = await request.text();
  const sig = request.headers.get(SIGNATURE_HEADER);

  if (
    !verifyTranscodeWebhookHmacSha256(rawBody, sig, secret)
  ) {
    return NextResponse.json(
      { ok: false, error: 'invalid_signature' },
      { status: 401 },
    );
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(rawBody) as unknown;
  } catch {
    return NextResponse.json(
      { ok: false, error: 'invalid_json' },
      { status: 400 },
    );
  }

  const body = webhookBodySchema.safeParse(parsedJson);
  if (!body.success) {
    return NextResponse.json(
      { ok: false, error: 'validation' },
      { status: 400 },
    );
  }

  const { lessonId, masterKey } = body.data;
  const lessonPrefix = `hls/${lessonId}/`;
  if (
    !masterKey.startsWith(lessonPrefix) ||
    masterKey.includes('..')
  ) {
    return NextResponse.json(
      { ok: false, error: 'bad_master_key' },
      { status: 400 },
    );
  }
  if (!masterKey.endsWith('/master.m3u8')) {
    return NextResponse.json(
      { ok: false, error: 'master_suffix' },
      { status: 400 },
    );
  }

  const lesson = await getVideoById(lessonId);
  if (!lesson) {
    return NextResponse.json(
      { ok: false, error: 'lesson_not_found' },
      { status: 404 },
    );
  }

  const hlsUrl = buildR2PublicUrlForObjectKey(masterKey);
  if (!hlsUrl) {
    return NextResponse.json(
      { ok: false, error: 'missing_public_base' },
      { status: 500 },
    );
  }

  await adminUpdateVideoLesson(lessonId, {
    hls_url: hlsUrl,
    is_published: true,
  });

  return NextResponse.json({ ok: true });
}

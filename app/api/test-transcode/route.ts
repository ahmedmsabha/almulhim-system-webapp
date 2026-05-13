import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const { lessonId, sourceKey } = (await req.json()) as {
    lessonId: string;
    sourceKey: string;
  };
  const workerUrl = `${process.env.TRANSCODER_WORKER_URL}/transcode`;
  const res = await fetch(workerUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      lessonId,
      sourceKey,
      webhookUrl:
        'https://webhook.site/33dbfe49-9d82-458a-86d9-67b0e88a9785',
    }),
  });
  return NextResponse.json({
    ok: res.ok,
    status: res.status,
  });
}

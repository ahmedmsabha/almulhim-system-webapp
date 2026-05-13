// هذه الصفحة مؤقتة للاختبار فقط — احذفها بعد التأكد
'use client';
import { useState, useRef } from 'react';

export default function TestUploadPage() {
  const [log, setLog] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const addLog = (msg: string) =>
    setLog((p) => [
      ...p,
      `${new Date().toLocaleTimeString()} — ${msg}`,
    ]);

  async function handleUpload() {
    const file = inputRef.current?.files?.[0];
    if (!file) return;

    addLog(
      `بدء الرفع: ${file.name} (${(file.size / 1024 / 1024).toFixed(1)} MB)`,
    );

    // 1. اطلب presigned URL
    const res = await fetch('/api/test-presign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName: file.name,
        fileSize: file.size,
        contentType: file.type,
      }),
    });
    const { signedUrl, sourceKey, lessonId } =
      (await res.json()) as {
        signedUrl: string;
        sourceKey: string;
        lessonId: string;
      };
    addLog(`✓ presigned URL جاهز — lessonId: ${lessonId}`);

    // 2. ارفع لـ R2
    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.upload.onprogress = (e) =>
        setProgress(Math.round((e.loaded / e.total) * 100));
      xhr.onload = () => {
        addLog(`✓ تم الرفع لـ R2 (${xhr.status})`);
        resolve();
      };
      xhr.onerror = () => reject(new Error('فشل الرفع'));
      xhr.open('PUT', signedUrl);
      xhr.setRequestHeader(
        'Content-Type',
        file.type || 'video/mp4',
      );
      xhr.send(file);
    });

    // 3. أرسل للـ Worker
    addLog('إرسال طلب التحويل للـ Worker...');
    const workerRes = await fetch('/api/test-transcode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lessonId, sourceKey }),
    });
    const workerData = (await workerRes.json()) as {
      ok: boolean;
    };
    addLog(
      workerData.ok
        ? '✓ Worker قبل الطلب — التحويل جارٍ في الخلفية'
        : '✗ Worker رفض الطلب',
    );
  }

  return (
    <div
      className="max-w-xl mx-auto p-8 space-y-4"
      dir="rtl"
    >
      <h1 className="text-2xl font-bold">
        اختبار رفع الفيديو
      </h1>
      <input
        ref={inputRef}
        type="file"
        accept="video/mp4"
        className="block w-full border p-2 rounded"
      />
      <button
        onClick={handleUpload}
        className="bg-blue-600 text-white px-6 py-2 rounded w-full"
      >
        ارفع وحوّل
      </button>
      {progress > 0 && (
        <div className="w-full bg-gray-200 rounded h-3">
          <div
            className="bg-blue-600 h-3 rounded transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
      <div className="bg-gray-900 text-green-400 p-4 rounded font-mono text-sm space-y-1 min-h-32">
        {log.map((l, i) => (
          <div key={i}>{l}</div>
        ))}
      </div>
    </div>
  );
}

/**
 * 이미지를 cafe24 FTP 영구 URL 로 올리는 공용 유틸.
 *
 * Vercel 4.5MB 함수 페이로드 한도 우회 흐름:
 *   1) blob/data: URL 을 Blob 으로 받아오기
 *   2) shrinkToBudget — 4MB 초과면 JPEG 재인코딩 + 점진 해상도 축소로 3MB 이하 목표
 *   3) 4MB 미만이면 multipart/form-data 로 /api/ftp 직접 전송 (base64 부풀기 없음)
 *   4) 극단 케이스(압축해도 4MB+) 만 Vercel Blob → /api/ftp 폴백 (BLOB_READ_WRITE_TOKEN 필요)
 *
 * 호출 측은 그냥 persistImageToFtp(blob, filename) 하면 cafe24 영구 URL 이 돌아옴.
 */

const TARGET_BYTES = 3 * 1024 * 1024;
const MULTIPART_LIMIT_BYTES = 4 * 1024 * 1024;

/**
 * 4MB 초과 이미지를 JPEG 재인코딩 + 필요 시 해상도 축소.
 * 가능한 한 빠르게 3MB 이하로 떨어뜨리고, 최후 시도까지 못 맞추면 가장 작은 결과 반환.
 */
async function shrinkToBudget(blob: Blob, filenameIn: string): Promise<{ blob: Blob; filename: string }> {
  if (blob.size < TARGET_BYTES) return { blob, filename: filenameIn };

  let img: ImageBitmap;
  try { img = await createImageBitmap(blob); }
  catch { return { blob, filename: filenameIn }; }

  const tryEncode = async (scale: number, quality: number): Promise<Blob | null> => {
    const w = Math.max(1, Math.round(img.width * scale));
    const h = Math.max(1, Math.round(img.height * scale));
    const cvs = document.createElement('canvas');
    cvs.width = w; cvs.height = h;
    const ctx = cvs.getContext('2d');
    if (!ctx) return null;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    return new Promise<Blob | null>((resolve) => cvs.toBlob((b) => resolve(b), 'image/jpeg', quality));
  };

  const attempts: Array<{ scale: number; quality: number }> = [
    { scale: 1.0,  quality: 0.85 },
    { scale: 1.0,  quality: 0.7  },
    { scale: 0.85, quality: 0.8  },
    { scale: 0.75, quality: 0.8  },
    { scale: 0.6,  quality: 0.75 },
    { scale: 0.5,  quality: 0.7  },
    { scale: 0.4,  quality: 0.65 },
    { scale: 0.3,  quality: 0.6  },
    { scale: 0.25, quality: 0.55 },
  ];

  const jpgName = filenameIn.replace(/\.(png|jpe?g|webp|gif)$/i, '.jpg');
  let smallest: Blob | null = null;
  for (const a of attempts) {
    const out = await tryEncode(a.scale, a.quality);
    if (!out) continue;
    if (!smallest || out.size < smallest.size) smallest = out;
    if (out.size < TARGET_BYTES) return { blob: out, filename: jpgName };
  }
  if (smallest && smallest.size < blob.size) return { blob: smallest, filename: jpgName };
  return { blob, filename: filenameIn };
}

/**
 * Blob 또는 dataURL/blob: URL 을 cafe24 FTP 에 영구 업로드하고 https URL 을 반환.
 * 이미 https URL 이면 그대로 통과.
 */
export async function persistImageToFtp(rawUrlOrBlob: string | Blob | undefined, filenameIn: string): Promise<string> {
  if (!rawUrlOrBlob) return '';

  // 문자열 URL 처리
  if (typeof rawUrlOrBlob === 'string') {
    if (/^https?:\/\//.test(rawUrlOrBlob)) return rawUrlOrBlob;
    const r = await fetch(rawUrlOrBlob);
    rawUrlOrBlob = await r.blob();
  }

  let blob: Blob = rawUrlOrBlob;
  let filename = filenameIn;

  // 4MB 이상은 JPEG 재인코딩 + 점진 축소로 한도 안에 들어오게 만듦
  ({ blob, filename } = await shrinkToBudget(blob, filename));

  if (blob.size < MULTIPART_LIMIT_BYTES) {
    // multipart/form-data — base64 와 달리 33% 부풀기 없음
    const form = new FormData();
    form.append('file', new File([blob], filename, { type: blob.type || 'image/jpeg' }));
    const res = await fetch('/api/ftp', { method: 'POST', body: form });
    const json = await res.json();
    if (!json.success) throw new Error(json.message || 'FTP 실패');
    return json.imageUrl as string;
  }

  // 압축해도 4MB 이상인 극단 케이스 — Vercel Blob 경유 (BLOB_READ_WRITE_TOKEN 필요)
  const { upload } = await import('@vercel/blob/client');
  const { url: blobUrl } = await upload(filename, blob, {
    access: 'public',
    handleUploadUrl: '/api/upload',
    contentType: blob.type || undefined,
  });
  const res = await fetch('/api/ftp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ blobUrl, filename }),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.message || 'FTP 실패');
  return json.imageUrl as string;
}

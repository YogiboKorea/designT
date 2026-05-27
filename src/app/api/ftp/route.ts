import { NextResponse } from 'next/server';
import { Readable } from 'stream';
// basic-ftp 는 CommonJS — default import 가 webpack 번들 환경에서 undefined 가 되는 경우가 있어
// named import 로 명시적으로 가져옴 (serverExternalPackages 와 함께).
import { Client as FtpClient } from 'basic-ftp';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const FTP_REMOTE_DIR = '/web/img/design';
const PUBLIC_URL_BASE = 'https://yogibo.openhost.cafe24.com/web/img/design';

// cafe24 nginx 가 비-ASCII 파일명을 EUC-KR 로 디코드해서 매칭 실패(403) 가 남.
// 한글/특수문자가 들어온 파일명은 ASCII-safe 로 강제 변환해서 FTP 에 올린다.
function sanitizeFilename(raw: string): string {
  const lastDot = raw.lastIndexOf('.');
  const base = lastDot > 0 ? raw.slice(0, lastDot) : raw;
  const ext = lastDot > 0 ? raw.slice(lastDot + 1) : '';
  const safeBase = base.replace(/[^a-zA-Z0-9_\-]/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '');
  const safeExt = ext.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  const final = (safeBase || `upload_${Date.now()}`) + (safeExt ? `.${safeExt}` : '');
  return final;
}

export const maxDuration = 60;

const FTP_TIMEOUT_MS = 30_000;

// 디버그 — 라우트 모듈 로드 여부 + 환경변수 존재 여부 즉시 확인용.
// 브라우저로 GET /api/ftp 호출하면 응답.
export async function GET() {
  return NextResponse.json({
    ok: true,
    runtime: 'nodejs',
    env: {
      hasFtpHost: !!process.env.FTP_HOST,
      hasFtpUser: !!process.env.FTP_USER,
      hasFtpPass: !!process.env.FTP_PASS,
      ftpHost: process.env.FTP_HOST || null,
      ftpPort: process.env.FTP_PORT || null,
    },
  });
}

export async function POST(req: Request) {
  // 단계별 에러를 명확히 구분해서 빈 body 500 응답이 절대 안 나오게.
  // basic-ftp 모듈 자체 로딩 실패가 try 밖에서 throw 하던 케이스 차단 — 전체를 try 안에.
  let client: FtpClient | null = null;
  let stage = 'handler-entry';
  try {
    console.log(`[FTP] >>> handler entry, content-type=${req.headers.get('content-type')}`);

    stage = 'create-ftp-client';
    client = new FtpClient(FTP_TIMEOUT_MS);
    if (client && client.ftp) client.ftp.verbose = false;
    const contentType = req.headers.get('content-type') || '';
    let uploadSource: Readable;
    let filename: string;
    let blobUrlToCleanup: string | null = null;
    let inputSize = 0;

    stage = 'parse-body';
    if (contentType.includes('application/json')) {
      const body = await req.json();

      if (body.blobUrl && body.filename) {
        stage = 'fetch-blob';
        const blobRes = await fetch(body.blobUrl);
        if (!blobRes.ok || !blobRes.body) {
          return NextResponse.json(
            { success: false, message: `Failed to fetch staged blob (${blobRes.status})` },
            { status: 502 },
          );
        }
        uploadSource = Readable.fromWeb(blobRes.body as Parameters<typeof Readable.fromWeb>[0]);
        filename = body.filename;
        blobUrlToCleanup = body.blobUrl;
        inputSize = Number(blobRes.headers.get('content-length') || 0);
      } else if (body.imageBase64 && body.filename) {
        const base64Data = body.imageBase64.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        uploadSource = Readable.from(buffer);
        filename = body.filename;
        inputSize = buffer.length;
      } else {
        return NextResponse.json(
          { success: false, message: 'Provide either { blobUrl, filename } or { imageBase64, filename }' },
          { status: 400 },
        );
      }
    } else if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File;
      if (!file) {
        return NextResponse.json({ success: false, message: 'File is required (multipart "file" field)' }, { status: 400 });
      }
      const buffer = Buffer.from(await file.arrayBuffer());
      uploadSource = Readable.from(buffer);
      filename = file.name || `upload_${Date.now()}.bin`;
      inputSize = buffer.length;
    } else {
      return NextResponse.json({ success: false, message: `Unsupported content type: ${contentType}` }, { status: 400 });
    }

    stage = 'ftp-connect';
    if (!client) throw new Error('ftp client init failed');
    await client.access({
      host: process.env.FTP_HOST || 'yogibo.ftp.cafe24.com',
      port: process.env.FTP_PORT ? Number(process.env.FTP_PORT) : 21,
      user: process.env.FTP_USER || '',
      password: process.env.FTP_PASS || '',
      secure: false,
    });

    stage = 'ftp-upload';
    if (!client) throw new Error('ftp client missing before upload');
    const safeFilename = sanitizeFilename(filename);
    console.log(`[FTP] upload start: ${safeFilename} (${inputSize} bytes)`);
    await client.uploadFrom(uploadSource, `${FTP_REMOTE_DIR}/${safeFilename}`);
    console.log(`[FTP] upload done: ${safeFilename}`);

    const imageUrl = `${PUBLIC_URL_BASE}/${safeFilename}`;

    if (blobUrlToCleanup) {
      stage = 'blob-cleanup';
      try {
        // 동적 import — 사용 안 할 때 webpack chunk 로드 회피
        const { del } = await import('@vercel/blob');
        await del(blobUrlToCleanup);
      } catch (cleanupErr) {
        console.warn('Blob cleanup failed:', cleanupErr);
      }
    }

    return NextResponse.json({ success: true, imageUrl }, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[FTP] error at stage="${stage}":`, message, error);
    return NextResponse.json(
      { success: false, message: `${stage} 실패: ${message}`, stage },
      { status: 500 },
    );
  } finally {
    try { client?.close(); } catch (_) { /* ignore */ }
  }
}

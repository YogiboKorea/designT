import { NextResponse } from 'next/server';
import { Readable } from 'stream';
import ftp from 'basic-ftp';
import { del } from '@vercel/blob';

export const dynamic = 'force-dynamic';

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

export async function POST(req: Request) {
  const client = new ftp.Client();
  client.ftp.verbose = true;

  try {
    const contentType = req.headers.get('content-type') || '';
    let uploadSource: Readable;
    let filename: string;
    let blobUrlToCleanup: string | null = null;

    if (contentType.includes('application/json')) {
      const body = await req.json();

      if (body.blobUrl && body.filename) {
        // Vercel Blob 에 스테이징된 파일을 스트리밍으로 Cafe24 FTP 로 옮긴다.
        // 큰 원본 이미지(>4.5MB)는 이 경로로 들어와야 Vercel 서버리스 페이로드 한도를 회피한다.
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
      } else if (body.imageBase64 && body.filename) {
        // 기존 base64 경로 — <4.5MB 소형 이미지에만 안전.
        const base64Data = body.imageBase64.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        uploadSource = Readable.from(buffer);
        filename = body.filename;
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
        return NextResponse.json({ success: false, message: 'File is required' }, { status: 400 });
      }
      const buffer = Buffer.from(await file.arrayBuffer());
      uploadSource = Readable.from(buffer);
      filename = file.name;
    } else {
      return NextResponse.json({ success: false, message: 'Unsupported content type' }, { status: 400 });
    }

    await client.access({
      host: process.env.FTP_HOST || 'yogibo.ftp.cafe24.com',
      port: process.env.FTP_PORT ? Number(process.env.FTP_PORT) : 21,
      user: process.env.FTP_USER || '',
      password: process.env.FTP_PASS || '',
      secure: false,
    });

    // 한글/특수문자 sanitize — cafe24 nginx 호환 (EUC-KR 디코드 이슈 회피)
    const safeFilename = sanitizeFilename(filename);

    // Vercel(Linux) 환경에서 ensureDir(/) 명령이 Cafe24 가상 루트 구조와 충돌해 550 에러를 낼 수 있어
    // 폴더가 이미 있다는 전제로 cd/mkd 없이 절대 경로로 다이렉트 업로드한다.
    await client.uploadFrom(uploadSource, `${FTP_REMOTE_DIR}/${safeFilename}`);

    const imageUrl = `${PUBLIC_URL_BASE}/${safeFilename}`;

    if (blobUrlToCleanup) {
      // FTP 가 성공했으니 스테이징용 Blob 은 즉시 삭제 (요금/저장공간 절약).
      // 실패해도 본업은 끝났으므로 swallow.
      try {
        await del(blobUrlToCleanup);
      } catch (cleanupErr) {
        console.warn('Blob cleanup failed:', cleanupErr);
      }
    }

    return NextResponse.json({ success: true, imageUrl }, { status: 200 });
  } catch (error: unknown) {
    console.error('FTP Error:', error);
    const message = error instanceof Error ? error.message : 'FTP upload failed';
    return NextResponse.json({ success: false, message }, { status: 500 });
  } finally {
    client.close();
  }
}

import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// 진단 전용 — basic-ftp 안 쓰고 multipart 파싱만 확인.
// /api/ftp-test 가 정상 동작하면 Next.js 라우트 + multipart 는 정상, FTP 모듈 자체가 문제.
export async function POST(req: Request) {
  console.log('[FTP-TEST] >>> entry');
  try {
    const contentType = req.headers.get('content-type') || '';
    console.log('[FTP-TEST] content-type =', contentType);

    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json({ ok: false, message: 'multipart 아님', contentType });
    }

    const formData = await req.formData();
    console.log('[FTP-TEST] formData parsed');
    const file = formData.get('file') as File | null;
    console.log('[FTP-TEST] file =', file ? `${file.name} (${file.size} bytes, ${file.type})` : 'null');

    if (!file) {
      return NextResponse.json({ ok: false, message: 'file field 없음' });
    }

    const buf = await file.arrayBuffer();
    console.log('[FTP-TEST] arrayBuffer size =', buf.byteLength);

    return NextResponse.json({
      ok: true,
      filename: file.name,
      size: buf.byteLength,
      type: file.type,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[FTP-TEST] error:', msg, e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, hint: 'POST multipart/form-data with field "file" to test' });
}

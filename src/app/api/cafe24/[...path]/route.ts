import { NextRequest, NextResponse } from 'next/server';

/**
 * Cafe24 (ychat) 백엔드 프록시
 * ─────────────────────────────────────────────────────────────────
 * ychat 백엔드의 CORS 가 망가져 있어 (preflight 500, Allow-Origin: * +
 * Allow-Credentials: true 동시 사용) 브라우저에서 직접 호출이 막힌다.
 * 이 라우트가 서버에서 대신 ychat 을 호출해 같은 origin 으로 응답한다.
 *
 * 매핑:
 *   /api/cafe24/api/yogibo/products?offset=0&limit=10
 *      → ${YCHAT}/api/yogibo/products?offset=0&limit=10
 *
 * 사용:
 *   cafe24Api.get('/api/yogibo/products', { params: ... })  // baseURL '/api/cafe24'
 *   fetch('/api/cafe24/api/yogibo/products?...')
 *
 * GET 만 지원 (현재 코드베이스가 GET 만 사용). POST/PUT/DELETE 가 필요해지면 확장.
 * ─────────────────────────────────────────────────────────────────
 */

export const runtime = 'nodejs';
export const maxDuration = 30;

const YCHAT_HOST =
  process.env.NEXT_PUBLIC_CAFE24_API_HOST ||
  'https://port-0-ychat-lzgmwhc4d9883c97.sel4.cloudtype.app';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const subPath = (path || []).join('/');
  const search = req.nextUrl.search;
  const target = `${YCHAT_HOST}/${subPath}${search}`;

  const mallId = req.headers.get('x-mall-id') || '';
  const userId = req.headers.get('x-user-id') || '';

  try {
    const upstream = await fetch(target, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        ...(mallId ? { 'X-Mall-Id': mallId } : {}),
        ...(userId ? { 'X-User-Id': userId } : {}),
      },
      signal: AbortSignal.timeout(28000),
    });

    const body = await upstream.arrayBuffer();
    const contentType = upstream.headers.get('content-type') ?? 'application/json';

    return new NextResponse(body, {
      status: upstream.status,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'upstream fetch failed', message: err?.message ?? String(err) },
      { status: 502 },
    );
  }
}

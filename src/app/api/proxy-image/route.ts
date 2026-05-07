import { NextRequest, NextResponse } from 'next/server';

/**
 * 이미지 프록시 API
 * ─────────────────────────────────────────────────────────────────
 * cafe24 FTP 서버 (yogibo.openhost.cafe24.com) 가 CORS 헤더를 주지 않아
 * Vercel 도메인에서 직접 fetch / canvas drawImage 가 막힌다.
 *
 * 이 라우트가 서버에서 대신 이미지를 받아와 CORS 헤더를 붙여 반환한다.
 *
 * 사용:
 *   <img src="/api/proxy-image?url=https%3A%2F%2Fyogibo.openhost.cafe24.com%2F..." />
 *
 * 이미지 URL helper (UI 측):
 *   import { proxyImageUrl } from '@/lib/proxy-image-url';
 *   const safeUrl = proxyImageUrl(originalUrl);
 *
 * 보안:
 *   - 화이트리스트된 도메인만 허용 (오픈 프록시 방지)
 *   - 응답 크기 / 시간 제한
 *   - 캐시 헤더로 반복 요청 최소화
 * ─────────────────────────────────────────────────────────────────
 */

export const runtime = 'nodejs';
export const maxDuration = 30;

// 허용할 외부 도메인 (필요한 만큼 추가)
const ALLOWED_HOSTS = [
  'yogibo.openhost.cafe24.com',
  'yogibo.kr',
  'www.yogibo.kr',
  'yogibo.cafe24.com',
];

// 허용할 응답 컨텐츠 타입
const ALLOWED_MIME = /^image\/(png|jpe?g|webp|gif|svg\+xml|avif)$/i;

const MAX_BYTES = 25 * 1024 * 1024; // 25MB

export async function GET(req: NextRequest) {
  const target = req.nextUrl.searchParams.get('url');

  if (!target) {
    return new NextResponse('missing url', { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(target);
  } catch {
    return new NextResponse('invalid url', { status: 400 });
  }

  if (!ALLOWED_HOSTS.includes(parsed.hostname)) {
    return new NextResponse(`host not allowed: ${parsed.hostname}`, {
      status: 403,
    });
  }

  // 외부 fetch
  let upstream: Response;
  try {
    upstream = await fetch(parsed.toString(), {
      // 일부 cafe24 환경은 User-Agent 가 없으면 거부함
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; YogiboBuilderProxy/1.0; +https://design-t-omega.vercel.app)',
        Accept: 'image/*,*/*;q=0.8',
      },
      // 30초 타임아웃 (next.js가 maxDuration 으로 강제됨)
      signal: AbortSignal.timeout(28000),
    });
  } catch (err: any) {
    return new NextResponse(`upstream fetch failed: ${err?.message ?? err}`, {
      status: 502,
    });
  }

  if (!upstream.ok) {
    return new NextResponse(`upstream ${upstream.status}`, {
      status: upstream.status,
    });
  }

  const contentType = upstream.headers.get('content-type') ?? '';
  if (!ALLOWED_MIME.test(contentType)) {
    return new NextResponse(`unsupported content-type: ${contentType}`, {
      status: 415,
    });
  }

  const contentLength = Number(upstream.headers.get('content-length') ?? 0);
  if (contentLength && contentLength > MAX_BYTES) {
    return new NextResponse('image too large', { status: 413 });
  }

  // 응답을 그대로 스트리밍 (메모리 효율)
  const buffer = await upstream.arrayBuffer();

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Content-Length': String(buffer.byteLength),
      // ⭐ 핵심: CORS 헤더 부여
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Cross-Origin-Resource-Policy': 'cross-origin',
      // 1시간 캐시 (CDN 7일)
      'Cache-Control':
        'public, max-age=3600, s-maxage=604800, stale-while-revalidate=86400',
    },
  });
}

// HEAD 요청도 같이 처리 (일부 미리보기 도구가 사용)
export async function HEAD(req: NextRequest) {
  const res = await GET(req);
  return new NextResponse(null, {
    status: res.status,
    headers: res.headers,
  });
}

/**
 * 이미지 URL → 프록시 URL 변환 헬퍼
 * ─────────────────────────────────────────────────────────────────
 * cafe24 같은 외부 도메인 이미지를 자체 프록시 (/api/proxy-image) 로 감싸서
 * canvas / fetch 에서 CORS 에러가 안 나도록 한다.
 *
 * 사용:
 *   import { proxyImageUrl } from '@/lib/proxy-image-url';
 *   const safe = proxyImageUrl(originalUrl);
 *   <img src={safe} crossOrigin="anonymous" />
 * ─────────────────────────────────────────────────────────────────
 */

// 프록시를 거쳐야 하는 외부 도메인 (CORS 막혀 있는 호스트)
const PROXY_HOSTS = [
  'yogibo.openhost.cafe24.com',
  'yogibo.kr',
  'www.yogibo.kr',
  'yogibo.cafe24.com',
];

/**
 * 주어진 URL 이 외부 CORS 막힘 호스트면 프록시 URL 로 감싼 것을 반환.
 * 그 외 (이미 자체 도메인 / blob: / data: / 빈 값 등) 는 그대로 반환.
 */
export function proxyImageUrl(rawUrl: string | null | undefined): string {
  if (!rawUrl) return '';

  const url = String(rawUrl).trim();
  if (!url) return '';

  // blob: / data: / 상대 경로 / 자체 API → 변환 X
  if (url.startsWith('blob:')) return url;
  if (url.startsWith('data:')) return url;
  if (url.startsWith('/')) return url;

  // 절대 URL 만 처리
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return url; // URL 로 파싱 실패 → 원본 그대로
  }

  // 프록시 대상 호스트면 감싸기
  if (PROXY_HOSTS.includes(parsed.hostname)) {
    return `/api/proxy-image?url=${encodeURIComponent(url)}`;
  }

  // 그 외 외부 도메인은 그대로 (Unsplash 등 CORS 허용 도메인)
  return url;
}

/**
 * 이미 프록시로 감싸진 URL 에서 원본 URL 을 추출.
 * (예: 다운로드 링크에 원본 URL 그대로 보여주고 싶을 때)
 */
export function unwrapProxyUrl(maybeProxied: string): string {
  if (!maybeProxied) return '';
  if (!maybeProxied.startsWith('/api/proxy-image?url=')) return maybeProxied;
  try {
    const u = new URL(maybeProxied, 'http://x');
    return decodeURIComponent(u.searchParams.get('url') ?? '');
  } catch {
    return maybeProxied;
  }
}

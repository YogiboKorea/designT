/**
 * 이미지 로드 헬퍼 — canvas / drawImage / html2canvas 안전
 * ─────────────────────────────────────────────────────────────────
 * new Image() 로 직접 로드하는 코드를 안전하게 만드는 헬퍼.
 *
 * 사용:
 *   import { loadSafeImage, loadSafeImageAsync } from '@/lib/load-safe-image';
 *
 *   // 콜백 방식
 *   const img = loadSafeImage(url, () => ctx.drawImage(img, 0, 0));
 *
 *   // async/await 방식
 *   const img = await loadSafeImageAsync(url);
 *   ctx.drawImage(img, 0, 0);
 * ─────────────────────────────────────────────────────────────────
 */

import { proxyImageUrl } from './proxy-image-url';

/**
 * 콜백 방식으로 이미지 로드.
 * 자동으로 proxy 통과 + crossOrigin 설정.
 */
export function loadSafeImage(
  rawUrl: string,
  onLoad?: (img: HTMLImageElement) => void,
  onError?: (err: ErrorEvent | Error) => void,
): HTMLImageElement {
  const img = new Image();
  img.crossOrigin = 'anonymous';

  if (onLoad) {
    img.onload = () => onLoad(img);
  }
  if (onError) {
    img.onerror = (e) => {
      if (e instanceof ErrorEvent) onError(e);
      else onError(new Error(`Image load failed: ${rawUrl}`));
    };
  }

  img.src = proxyImageUrl(rawUrl);
  return img;
}

/**
 * Promise 방식으로 이미지 로드.
 * 자동으로 proxy 통과 + crossOrigin 설정.
 */
export function loadSafeImageAsync(rawUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    if (!rawUrl) {
      reject(new Error('empty URL'));
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => resolve(img);
    img.onerror = () =>
      reject(new Error(`Image load failed: ${rawUrl}`));

    img.src = proxyImageUrl(rawUrl);
  });
}

/**
 * 캔버스에 이미지 안전하게 그리기 (간편 버전).
 *
 * 사용:
 *   await drawSafeImage(ctx, url, 0, 0, 800, 600);
 */
export async function drawSafeImage(
  ctx: CanvasRenderingContext2D,
  rawUrl: string,
  dx: number,
  dy: number,
  dw?: number,
  dh?: number,
): Promise<void> {
  const img = await loadSafeImageAsync(rawUrl);
  if (dw !== undefined && dh !== undefined) {
    ctx.drawImage(img, dx, dy, dw, dh);
  } else {
    ctx.drawImage(img, dx, dy);
  }
}

'use client';
/**
 * AI 이미지 처리 헬퍼 — /main-visual 의 인라인 로직을 추출.
 *  - sampleEdgeColor   : 이미지 가장자리 평균 색 추출 (배너 배경 자동 매칭용)
 *  - runBackgroundRemoval : @imgly/background-removal 동적 import 로 누끼 제거
 *
 * 클라이언트 전용 (canvas + dynamic import 의존).
 */

export interface SampleEdgeOpts {
  /** 어느 변을 샘플링할지 — 기본 'left' (좌측 20%). 'top' 시 상단 20% 평균. */
  edge?: 'left' | 'top';
  /** 흰색 블렌딩 비율 (0~1). 기본 0.3 — 너무 진한 색 방지. */
  mixWhite?: number;
}

/**
 * 이미지의 지정 가장자리 영역에서 평균 색을 샘플링해 hex 반환.
 * 투명 픽셀은 제외. 흰색 블렌딩으로 부드럽게.
 */
export function sampleEdgeColor(img: HTMLImageElement, opts: SampleEdgeOpts = {}): string | null {
  const { edge = 'left', mixWhite = 0.3 } = opts;
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  if (!w || !h) return null;

  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  if (!ctx) return null;

  try {
    ctx.drawImage(img, 0, 0);
    let data: Uint8ClampedArray;
    if (edge === 'top') {
      const sampleH = Math.max(1, Math.floor(h * 0.2));
      data = ctx.getImageData(0, 0, w, sampleH).data;
    } else {
      const sampleW = Math.max(1, Math.floor(w * 0.2));
      data = ctx.getImageData(0, 0, sampleW, h).data;
    }

    let r = 0, g = 0, b = 0, n = 0;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] < 128) continue; // 반투명 픽셀 제외
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
      n++;
    }
    if (n === 0) return null;
    r = r / n;
    g = g / n;
    b = b / n;

    // 흰색 블렌딩 — 너무 진하면 안 어울리므로 톤다운
    const mix = Math.max(0, Math.min(1, mixWhite));
    r = r * (1 - mix) + 255 * mix;
    g = g * (1 - mix) + 255 * mix;
    b = b * (1 - mix) + 255 * mix;

    const toHex = (v: number) => Math.round(v).toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  } catch (err) {
    console.warn('[sampleEdgeColor] 실패', err);
    return null;
  }
}

/**
 * @imgly/background-removal 동적 import 후 누끼 제거. 결과는 blob URL.
 * 최초 1회 모델 다운로드(~30MB), 이후 브라우저 캐시.
 */
export async function runBackgroundRemoval(
  url: string,
  onProgress?: (label: string, pct: number) => void,
): Promise<string> {
  // @ts-ignore — 로컬 vs Vercel 빌드 타입 차이로 인한 에러 방지
  const mod = await import('@imgly/background-removal');
  const removeBackground = mod.removeBackground as (
    input: string | Blob,
    config?: Record<string, unknown>,
  ) => Promise<Blob>;

  const blob = await removeBackground(url, {
    model: 'isnet_fp16',
    proxyToWorker: false,
    progress: (key: string, current: number, total: number) => {
      if (!onProgress) return;
      const pct = total > 0 ? Math.round((current / total) * 100) : 0;
      const label = key.includes('fetch')
        ? '모델 다운로드'
        : key.includes('compute')
          ? '추론 중'
          : '처리 중';
      onProgress(label, pct);
    },
  });
  return URL.createObjectURL(blob);
}

/**
 * 색상 문자열(`#abc` / `#aabbcc` / `linear-gradient(...)`)에서 첫 hex 색을 추출.
 * 그라데이션이면 첫 stop 색을 사용.
 */
export function extractFirstHex(color: string): string | null {
  const m = color.match(/#[0-9a-fA-F]{3,6}\b/);
  return m ? m[0] : null;
}

/** sRGB 상대 휘도 (0~1). WCAG 기준. */
export function getRelativeLuminance(hex: string): number {
  const m = hex.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!m) return 0.5;
  let r = 0, g = 0, b = 0;
  const v = m[1];
  if (v.length === 3) {
    r = parseInt(v[0] + v[0], 16);
    g = parseInt(v[1] + v[1], 16);
    b = parseInt(v[2] + v[2], 16);
  } else {
    r = parseInt(v.slice(0, 2), 16);
    g = parseInt(v.slice(2, 4), 16);
    b = parseInt(v.slice(4, 6), 16);
  }
  const lin = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
}

/** 배경색(단색 또는 그라데이션)에 대비되는 텍스트 색 반환 — 흰색 또는 진회색. */
export function getContrastTextColor(bgColor: string): '#FFFFFF' | '#1F1F1F' {
  const hex = extractFirstHex(bgColor);
  if (!hex) return '#1F1F1F';
  return getRelativeLuminance(hex) < 0.45 ? '#FFFFFF' : '#1F1F1F';
}

/**
 * hex 색이 무채색(흰/검/회색) 계열인지 — R,G,B 편차가 작으면 true.
 * 액센트 색(노랑/주황/빨강/파랑 등)은 보존해야 하므로 이 함수로 구분.
 */
export function isNeutralColor(hex: string): boolean {
  const m = hex.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!m) return false;
  let r = 0, g = 0, b = 0;
  const v = m[1];
  if (v.length === 3) {
    r = parseInt(v[0] + v[0], 16);
    g = parseInt(v[1] + v[1], 16);
    b = parseInt(v[2] + v[2], 16);
  } else {
    r = parseInt(v.slice(0, 2), 16);
    g = parseInt(v.slice(2, 4), 16);
    b = parseInt(v.slice(4, 6), 16);
  }
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return max - min < 40; // 채도 낮음 (회색 계열)
}

/** URL 로부터 HTMLImageElement 로딩 — Promise 래퍼 */
export function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = url;
  });
}

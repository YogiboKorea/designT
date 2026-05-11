import { TextItem } from '../builder/types';

/**
 * 스마트스토어 비주얼 뷰포트 사이즈 정의.
 *  - 웹   : 1920 x 860
 *  - 모바일: 750 x 1350
 */
export const MAIN_VISUAL_SIZES = {
  web:    { width: 1920, height: 860,  label: '웹 (1920×860)' },
  mobile: { width: 750,  height: 1350, label: '모바일 (750×1350)' },
};

export type MainVisualDevice = keyof typeof MAIN_VISUAL_SIZES;

// ============================================================================
// 그라데이션
// ============================================================================

/** 선형 그라데이션 한 스톱. color=hex, opacity=0~1, offset=0~100(%) */
export interface GradientStop {
  color: string;
  opacity: number;
  offset: number;
}

/** 캔버스 배경 그라데이션. bgImage 없고 useGradient=true 일 때 적용. */
export interface CanvasGradient {
  angle: number;
  stops: GradientStop[];
}

export function gradientStopsToCss(g: CanvasGradient): string {
  const stopsCss = g.stops
    .map((s) => `${hexToRgba(s.color, s.opacity)} ${s.offset}%`)
    .join(', ');
  return `linear-gradient(${g.angle}deg, ${stopsCss})`;
}

export function hexToRgba(hex: string, opacity: number): string {
  const clean = (hex || '#000000').replace('#', '');
  const full =
    clean.length === 3
      ? clean.split('').map((c) => c + c).join('')
      : clean.padEnd(6, '0').slice(0, 6);
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  const a = Math.max(0, Math.min(1, opacity));
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

// ============================================================================
// 캔버스 / 상태
// ============================================================================

export interface ImageTransform {
  x: number;
  y: number;
  width: number;
  aspect: number;
  blur?: number;
  blurMask?: string;
}

export interface MainVisualCanvas {
  bgImage: string;
  bgImageOriginal?: string;
  bgColor: string;
  useGradient?: boolean;
  gradient?: CanvasGradient;
  bgGraphicType?: 'A' | 'B' | 'C' | 'D' | 'E' | null;
  imageMode?: 'cover' | 'free';
  imageTransform?: ImageTransform;
  texts: TextItem[];
  showDateBar?: boolean;
  eventDate?: string;
  showButton?: boolean;
  buttonLabel?: string;
  showLogo?: boolean;
  logoColor?: 'white' | 'color';
}

export interface MainVisualState {
  web: MainVisualCanvas;
  mobile: MainVisualCanvas;
}

// ============================================================================
// 기본 가이드 — 스마트스토어 비주얼 (자사몰과 동일 컨셉, 사이즈만 다름)
// ============================================================================

const PRETENDARD_STACK =
  "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, sans-serif";

const BUTTON_BG = '#45B3C2';

const DEFAULT_GRADIENT_WEB: CanvasGradient = {
  angle: 90,
  stops: [
    { color: '#F2E2CB', opacity: 1, offset: 0   },
    { color: '#F2E2CB', opacity: 0, offset: 50  },
  ],
};

const DEFAULT_GRADIENT_MOBILE: CanvasGradient = {
  angle: 180,
  stops: [
    { color: '#F2E2CB', opacity: 1, offset: 0   },
    { color: '#F2E2CB', opacity: 0, offset: 50  },
  ],
};

export function createEmptyMainVisualState(): MainVisualState {
  const t = Date.now().toString();
  return {
    web: {
      bgImage: '',
      bgColor: '#ffffff',
      useGradient: true,
      gradient: {
        angle: DEFAULT_GRADIENT_WEB.angle,
        stops: DEFAULT_GRADIENT_WEB.stops.map((s) => ({ ...s })),
      },
      texts: [
        {
          id: t + 'w1',
          text: '글로벌 NO.1 베스트 셀러',
          position: { x: 388, y: 260 },
          style: {
            color: '#252525',
            fontSize: 45,
            fontWeight: 700,
            textAlign: 'left',
            lineHeight: 1,
            letterSpacing: -0.9,
            fontFamily: PRETENDARD_STACK,
          },
        },
        {
          id: t + 'w2',
          text: 'YOGIBO MAX',
          position: { x: 388, y: 329 },
          style: {
            color: '#FFFFFF',
            fontSize: 90,
            fontWeight: 800,
            textAlign: 'left',
            lineHeight: 1,
            letterSpacing: -1.8,
            fontFamily: PRETENDARD_STACK,
            textShadow: '0 2px 10px #BCB29B',
          },
        },
        {
          id: t + 'w3',
          text: '5초에 1개씩 판매되는 빈백 소파',
          position: { x: 388, y: 443 },
          style: {
            color: '#252525',
            fontSize: 28,
            fontWeight: 400,
            textAlign: 'left',
            lineHeight: 40,
            letterSpacing: -0.84,
            fontFamily: PRETENDARD_STACK,
          },
        },
        {
          id: t + 'w4',
          text: '요기보 맥스 →',
          position: { x: 388, y: 524 },
          style: {
            color: '#FFFFFF',
            backgroundColor: BUTTON_BG,
            fontSize: 28,
            fontWeight: 600,
            textAlign: 'center',
            lineHeight: 1,
            letterSpacing: -0.56,
            fontFamily: PRETENDARD_STACK,
            isPill: true,
          },
        },
      ],
    },
    mobile: {
      bgImage: '',
      bgColor: '#ffffff',
      useGradient: true,
      gradient: {
        angle: DEFAULT_GRADIENT_MOBILE.angle,
        stops: DEFAULT_GRADIENT_MOBILE.stops.map((s) => ({ ...s })),
      },
      texts: [
        {
          id: t + 'm1',
          text: '글로벌 NO.1 베스트 셀러',
          position: { x: 135, y: 160 },
          style: {
            color: '#252525',
            fontSize: 38,
            fontWeight: 700,
            textAlign: 'center',
            lineHeight: 1,
            letterSpacing: -0.76,
            fontFamily: PRETENDARD_STACK,
            width: 480,
          },
        },
        {
          id: t + 'm2',
          text: 'YOGIBO MAX',
          position: { x: 135, y: 222 },
          style: {
            color: '#FFFFFF',
            fontSize: 76,
            fontWeight: 800,
            textAlign: 'center',
            lineHeight: 1,
            letterSpacing: -1.52,
            fontFamily: PRETENDARD_STACK,
            textShadow: '0 2px 10px #BCB29B',
            width: 480,
          },
        },
        {
          id: t + 'm3',
          text: '5초에 1개씩 판매되는 빈백 소파',
          position: { x: 135, y: 322 },
          style: {
            color: '#252525',
            fontSize: 26,
            fontWeight: 400,
            textAlign: 'center',
            lineHeight: 40,
            letterSpacing: -0.78,
            fontFamily: PRETENDARD_STACK,
            width: 480,
          },
        },
        {
          id: t + 'm4',
          text: '요기보 맥스 →',
          position: { x: 265, y: 1207 },
          style: {
            color: '#FFFFFF',
            backgroundColor: BUTTON_BG,
            fontSize: 26,
            fontWeight: 600,
            textAlign: 'center',
            lineHeight: 1,
            letterSpacing: -0.52,
            fontFamily: PRETENDARD_STACK,
            isPill: true,
          },
        },
      ],
    },
  };
}

export function createDefaultText(device: MainVisualDevice): TextItem {
  const { width, height } = MAIN_VISUAL_SIZES[device];
  return {
    id: Date.now().toString() + Math.random().toString(36).slice(2, 6),
    text: '새 텍스트',
    position: { x: Math.round(width / 2 - 100), y: Math.round(height / 2 - 30) },
    style: {
      color: '#111111',
      fontSize: device === 'web' ? 64 : 48,
      fontWeight: 800,
      textAlign: 'center',
      lineHeight: 1.2,
      fontFamily: PRETENDARD_STACK,
    },
  };
}

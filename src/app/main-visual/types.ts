import { TextItem } from '../builder/types';

/**
 * 자사몰 비주얼(구 메인비주얼) 뷰포트 사이즈 정의.
 *  - 웹   : 1920 x 680
 *  - 모바일: 800 x 907
 */
export const MAIN_VISUAL_SIZES = {
  web:    { width: 1920, height: 680, label: '웹 (1920×680)' },
  mobile: { width: 800,  height: 907, label: '모바일 (800×907)' },
} as const;

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

/**
 * 이미지 자유 배치 — 위치와 크기를 직접 지정.
 *  - x, y     : 캔버스 좌상단 기준 (px)
 *  - width    : 렌더링 가로폭 (px). 높이는 aspect 로 계산됨
 *  - aspect   : 원본 가로/세로 비율 (naturalWidth / naturalHeight)
 *  - blur     : CSS filter: blur(${blur}px). 기본 0.
 *  - blurMask : 블러 브러시로 칠한 영역(PNG dataURL, 고정 1024×1024).
 *               값이 있으면 `blur` 는 칠한 영역에만 적용됨.
 *               값이 없으면 `blur` 가 이미지 전체에 적용됨 (구 동작 호환).
 */
export interface ImageTransform {
  x: number;
  y: number;
  width: number;
  aspect: number;
  blur?: number;
  blurMask?: string;
}

export interface MainVisualCanvas {
  bgImage: string;          // blob: URL 또는 dataURL (현재 화면에 표시되는 이미지)
  /**
   * AI 배경 제거 전 원본 이미지 URL.
   *  · 배경 제거 AI 적용 시 bgImage 는 투명 PNG 로 교체되고 여기에 원본 보관.
   *  · "원본으로" 버튼 → bgImage = bgImageOriginal 로 복구.
   */
  bgImageOriginal?: string;
  bgColor: string;          // 배경 이미지/그라데이션 없을 때 사용
  /** true 이면 bgImage 없을 때 그라데이션을 배경으로 사용 */
  useGradient?: boolean;
  gradient?: CanvasGradient;
  /**
   * 이미지 배치 모드.
   *  - 'free' (기본) : 드래그/리사이즈로 원하는 곳에 배치 (원본 크기 시작)
   *  - 'cover'       : 캔버스 꽉 채우도록 자동 크롭
   */
  imageMode?: 'cover' | 'free';
  /** 'free' 모드 전용 — 이미지 업로드 시 자동 세팅되고 사용자가 조정 */
  imageTransform?: ImageTransform;
  texts: TextItem[];
  showDateBar?: boolean;
  eventDate?: string;
  showButton?: boolean;
  buttonLabel?: string;
}

export interface MainVisualState {
  web: MainVisualCanvas;
  mobile: MainVisualCanvas;
}

// ============================================================================
// 기본 가이드 — 자사몰 비주얼
//   배경   : #F2E2CB 단일 톤 선형 그라데이션 (웹=수평, 모바일=수직 = Figma -90° 재현)
//   텍스트 : 글로벌 NO.1 베스트 셀러 / YOGIBO MAX / 5초에 1개씩 판매되는 빈백 소파
//            + 요기보 맥스 → (pill 버튼)
//   폰트   : Pretendard 전체 적용
//   이미지 : 사용자가 직접 업로드 (가이드 단계에서는 비어있음)
//   간격   : 텍스트 간 margin-top ≈ 24px
// ============================================================================

const PRETENDARD_STACK =
  "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, sans-serif";

// 버튼 컬러 (요구 스펙)
const BUTTON_BG = '#45B3C2';

// 배경 그라데이션 = "한쪽은 선택색이 진하게, 반대쪽은 투명"
//   웹  : 왼쪽 → 오른쪽 페이드 (angle 90°)
//   모바일: 위쪽 → 아래쪽 페이드 (angle 180°)
//   → 이미지가 업로드되면 텍스트 영역(페이드 진한 쪽)은 베이지 톤으로 덮여
//     가독성 확보, 이미지 영역(페이드 투명 쪽)은 그대로 노출.
//   → 이미지가 없을 때는 베이지 → 캔버스 기본색(흰색)으로 그라데이션 보임.
//   UI 는 색상 피커 1개만 노출 — 각도/오프셋/투명도는 고정.
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
      bgColor: '#ffffff',   // 캔버스 기본 바탕은 흰색 — 그라데이션이 효과를 보이도록
      useGradient: true,
      gradient: {
        angle: DEFAULT_GRADIENT_WEB.angle,
        stops: DEFAULT_GRADIENT_WEB.stops.map((s) => ({ ...s })),
      },
      texts: [
        // ① 글로벌 NO.1 베스트 셀러 — Pretendard Bold 45px / lh 100px / ls -2%
        {
          id: t + 'w1',
          text: '글로벌 NO.1 베스트 셀러',
          position: { x: 388, y: 170 },
          style: {
            color: '#252525',
            fontSize: 45,
            fontWeight: 700,
            textAlign: 'left',
            lineHeight: 1,
            letterSpacing: -0.9,  // -2% of 45px
            fontFamily: PRETENDARD_STACK,
          },
        },
        // ② YOGIBO MAX — Pretendard ExtraBold 90px / 흰색 / 드롭쉐도우
        {
          id: t + 'w2',
          text: 'YOGIBO MAX',
          position: { x: 388, y: 239 }, // ≈ ①bottom(215) + 24
          style: {
            color: '#FFFFFF',
            fontSize: 90,
            fontWeight: 800,
            textAlign: 'left',
            lineHeight: 1,
            letterSpacing: -1.8,  // -2% of 90px
            fontFamily: PRETENDARD_STACK,
            textShadow: '0 2px 10px #BCB29B',
          },
        },
        // ③ 5초에 1개씩 판매되는 빈백 소파 — Pretendard Regular 28px / ls -3%
        {
          id: t + 'w3',
          text: '5초에 1개씩 판매되는 빈백 소파',
          position: { x: 388, y: 353 }, // ≈ ②bottom(329) + 24
          style: {
            color: '#252525',
            fontSize: 28,
            fontWeight: 400,
            textAlign: 'left',
            lineHeight: 40,       // 100px는 과도 → 40px 로 완화
            letterSpacing: -0.84, // -3% of 28px
            fontFamily: PRETENDARD_STACK,
          },
        },
        // ④ 요기보 맥스 → (pill 버튼) — Pretendard SemiBold 28px, 흰색
        //    위치: 설명 박스 하단(y=353+40=393) + margin-top 41px = y=434
        //    너비: width 고정 없이 padding 으로 자동 확장 (글자 길이에 따라 커짐)
        {
          id: t + 'w4',
          text: '요기보 맥스 →',
          position: { x: 388, y: 434 },
          style: {
            color: '#FFFFFF',
            backgroundColor: BUTTON_BG,
            fontSize: 28,
            fontWeight: 600,       // SemiBold
            textAlign: 'center',
            lineHeight: 1,         // 100%
            letterSpacing: -0.56,  // -2% of 28px
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
        // ① 서브타이틀 — 중앙 정렬
        {
          id: t + 'm1',
          text: '글로벌 NO.1 베스트 셀러',
          position: { x: 160, y: 110 },
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
        // ② 타이틀
        {
          id: t + 'm2',
          text: 'YOGIBO MAX',
          position: { x: 160, y: 172 }, // ①bottom(148) + 24
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
        // ③ 설명
        {
          id: t + 'm3',
          text: '5초에 1개씩 판매되는 빈백 소파',
          position: { x: 160, y: 272 }, // ②bottom(248) + 24
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
        // ④ 요기보 맥스 → 버튼 — 하단
        //    모바일: 캔버스 하단에서 100px 위에 버튼 하단이 오도록.
        //    버튼 실높이 ≈ fontSize(26) + pill 수직 padding(8.5*2) ≈ 43
        //    → top ≈ 907 - 100 - 43 ≈ 764 (기존 위치 유지, 1px 오차 내)
        //    너비: width 고정 없이 padding 으로 자동 확장
        {
          id: t + 'm4',
          text: '요기보 맥스 →',
          position: { x: 290, y: 761 },
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

import { TextItem } from '../builder/types';

/**
 * 메인비주얼 뷰포트 사이즈 정의.
 *  - 웹   : 1920 x 680
 *  - 모바일: 800 x 907
 */
export const MAIN_VISUAL_SIZES = {
  web:    { width: 1920, height: 680, label: '웹 (1920×680)' },
  mobile: { width: 800,  height: 907, label: '모바일 (800×907)' },
} as const;

export type MainVisualDevice = keyof typeof MAIN_VISUAL_SIZES;

export interface MainVisualCanvas {
  bgImage: string;   // blob: URL 또는 dataURL
  bgColor: string;   // 배경 이미지가 없을 때 사용
  texts: TextItem[];
}

export interface MainVisualState {
  web: MainVisualCanvas;
  mobile: MainVisualCanvas;
}

/**
 * Figma 가이드 기준 기본 배치:
 *  - 타이틀 텍스트 (상단 중앙)
 *  - 날짜 바 (연보라 배경, 중간 하단)
 *  - 이벤트 바로가기 버튼 (검정 pill, 날짜 바 아래)
 */
export function createEmptyMainVisualState(): MainVisualState {
  const t = Date.now().toString();
  return {
    web: {
      bgImage: '',
      bgColor: '#ffffff',
      texts: [
        {
          id: t + 'w1',
          text: '타이틀이 들어갑니다.\n타이틀이 들어갑니다.',
          position: { x: 127, y: 160 },
          style: {
            color: '#000000',
            fontSize: 96,
            fontWeight: 700,
            textAlign: 'center',
            lineHeight: 1.19,
            letterSpacing: -1.6,
            width: 1666,
          },
        },
        {
          id: t + 'w2',
          text: '00.00(요) - 00.00(요)',
          position: { x: 557, y: 415 },
          style: {
            color: '#090909',
            fontSize: 30,
            fontWeight: 500,
            textAlign: 'center',
            backgroundColor: '#b0aae0',
            width: 806,
          },
        },
        {
          id: t + 'w3',
          text: '이벤트 바로가기 →',
          position: { x: 825, y: 487 },
          style: {
            color: '#ffffff',
            backgroundColor: '#111827',
            fontSize: 18,
            fontWeight: 700,
            textAlign: 'center',
            isPill: true,
            width: 270,
          },
        },
      ],
    },
    mobile: {
      bgImage: '',
      bgColor: '#ffffff',
      texts: [
        {
          id: t + 'm1',
          text: '타이틀이 들어갑니다.\n타이틀이 들어갑니다.',
          position: { x: 53, y: 228 },
          style: {
            color: '#000000',
            fontSize: 80,
            fontWeight: 700,
            textAlign: 'center',
            lineHeight: 1.19,
            letterSpacing: -1.6,
            width: 694,
          },
        },
        {
          id: t + 'm2',
          text: '00.00(요) - 00.00(요)',
          position: { x: 232, y: 451 },
          style: {
            color: '#090909',
            fontSize: 25,
            fontWeight: 500,
            textAlign: 'center',
            backgroundColor: '#b0aae0',
            width: 336,
          },
        },
        {
          id: t + 'm3',
          text: '이벤트 바로가기 →',
          position: { x: 265, y: 557 },
          style: {
            color: '#ffffff',
            backgroundColor: '#111827',
            fontSize: 18,
            fontWeight: 700,
            textAlign: 'center',
            isPill: true,
            width: 270,
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
    },
  };
}

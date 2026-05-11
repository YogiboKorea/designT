/**
 * /builder 메인 비주얼 섹션용 레이아웃 프리셋
 * ──────────────────────────────────────────────────────────────────
 * 좌표는 **800×800 정사각 캔버스** 기준 (쿠폰/상품 영역과 동일 폭).
 * 4 종 (기본/A/E/F) — 각 프리셋엔 할인율 + 기간 텍스트 포함.
 * 캔버스에서 텍스트 클릭으로 수정 가능.
 * ──────────────────────────────────────────────────────────────────
 */
import type { TextItem } from '../app/builder/types';

const PF = "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, sans-serif";

export interface BuilderMainPreset {
  id: 'default' | 'A' | 'E' | 'F';
  label: string;
  emoji: string;
  description: string;
  /** 카드 미리보기용 thumbnail SVG markup (1:1 비례) */
  thumbnail: string;
  bgColor: string;
  /** 모든 프리셋 800 고정 — 정사각 구조 */
  height: 800;
  /** 좌표는 800-wide 캔버스 기준 (0~800). */
  texts: TextItem[];
  /**
   * 라운드/웨이브 등 장식 SVG. bgColor 위, 텍스트 아래 z-index 로 깔림.
   * 좌표계는 800×800.
   */
  decorations?: string;
}

const sid = (prefix: string, idx: number) =>
  `${prefix}-${Date.now()}-${idx}-${Math.floor(Math.random() * 1000)}`;

// ════════════════════════════════════════════════════════════════
// 기본타입 — 화이트/베이지 그라데이션 + 중앙 정렬
// ════════════════════════════════════════════════════════════════
const PRESET_DEFAULT: BuilderMainPreset = {
  id: 'default',
  label: '기본 타입',
  emoji: '🎨',
  description: '깔끔한 화이트 베이스',
  thumbnail: `<svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="bg-def" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#F2E2CB"/><stop offset="1" stop-color="#fff"/>
    </linearGradient></defs>
    <rect width="80" height="80" fill="url(#bg-def)"/>
    <text x="40" y="22" text-anchor="middle" fill="#252525" font-size="6" font-weight="700">YOGIBO</text>
    <text x="40" y="38" text-anchor="middle" fill="#252525" font-size="11" font-weight="800">MAX</text>
    <text x="40" y="54" text-anchor="middle" fill="#fe6326" font-size="6" font-weight="800">30% OFF</text>
    <text x="40" y="64" text-anchor="middle" fill="#666" font-size="4">04.23 ~ 04.30</text>
    <rect x="28" y="68" width="24" height="6" rx="3" fill="#45B3C2"/>
  </svg>`,
  bgColor: 'linear-gradient(180deg, #F2E2CB 0%, #ffffff 70%)',
  height: 800,
  texts: [
    { id: sid('def', 1), text: '글로벌 NO.1 베스트셀러', position: { x: 0, y: 140 },
      style: { color: '#252525', fontSize: 28, fontWeight: 600, textAlign: 'center', lineHeight: 1.2, letterSpacing: -0.5, fontFamily: PF, width: 800 } },
    { id: sid('def', 2), text: 'YOGIBO MAX', position: { x: 0, y: 200 },
      style: { color: '#252525', fontSize: 92, fontWeight: 800, textAlign: 'center', lineHeight: 1, letterSpacing: -1.5, fontFamily: PF, textShadow: '0 2px 10px rgba(188,178,155,0.5)', width: 800 } },
    { id: sid('def', 3), text: '최대 30% 할인 혜택', position: { x: 0, y: 380 },
      style: { color: '#fe6326', fontSize: 44, fontWeight: 800, textAlign: 'center', lineHeight: 1.2, letterSpacing: -0.5, fontFamily: PF, width: 800 } },
    { id: sid('def', 4), text: '2025.04.23 ~ 04.30', position: { x: 0, y: 460 },
      style: { color: '#666666', fontSize: 24, fontWeight: 400, textAlign: 'center', lineHeight: 1.2, letterSpacing: 0, fontFamily: PF, width: 800 } },
    { id: sid('def', 5), text: '자세히 보기 →', position: { x: 280, y: 620 },
      style: { color: '#FFFFFF', backgroundColor: '#45B3C2', fontSize: 24, fontWeight: 600, textAlign: 'center', lineHeight: 64, width: 240, isPill: true, fontFamily: PF } },
  ],
};

// ════════════════════════════════════════════════════════════════
// A 타입 — 짙은 남색 + 좌측 정렬 + 라운드 웨이브
// ════════════════════════════════════════════════════════════════
const PRESET_A: BuilderMainPreset = {
  id: 'A',
  label: 'A 타입',
  emoji: '🌙',
  description: '다크 네이비 + 좌측 텍스트',
  thumbnail: `<svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
    <rect width="80" height="80" fill="#0C2053"/>
    <circle cx="-4" cy="-2" r="20" fill="#ffffff" opacity="0.06"/>
    <circle cx="72" cy="12" r="15" fill="#ffffff" opacity="0.06"/>
    <text x="6" y="22" fill="#fff" font-size="5" font-weight="300">LUNAR NEW</text>
    <text x="6" y="32" fill="#fff" font-size="7" font-weight="800">RELAXING</text>
    <text x="6" y="46" fill="#FFC857" font-size="6" font-weight="800">30% OFF</text>
    <text x="6" y="56" fill="#fff" font-size="3">01.17 ~ 02.02</text>
    <path d="M 0 65 C 20 72, 50 58, 80 67 L 80 80 L 0 80 Z" fill="#FFFFFF"/>
  </svg>`,
  bgColor: '#0C2053',
  height: 800,
  decorations: `
    <svg width="100%" height="100%" viewBox="0 0 800 800" preserveAspectRatio="none" style="position:absolute;inset:0;pointer-events:none">
      <circle cx="-40" cy="-20" r="220" fill="#ffffff" opacity="0.04"/>
      <circle cx="720" cy="100" r="160" fill="#ffffff" opacity="0.04"/>
      <circle cx="450" cy="480" r="200" fill="#ffffff" opacity="0.04"/>
      <path d="M 0 660 C 200 740, 500 580, 800 680 L 800 800 L 0 800 Z" fill="#FFFFFF"/>
    </svg>
  `,
  texts: [
    { id: sid('A', 1), text: 'LUNAR NEW YEAR,', position: { x: 80, y: 180 },
      style: { color: '#FFFFFF', fontSize: 46, fontWeight: 300, textAlign: 'left', lineHeight: 1.1, letterSpacing: 0, fontFamily: PF } },
    { id: sid('A', 2), text: 'RELAXING HOME', position: { x: 80, y: 250 },
      style: { color: '#FFFFFF', fontSize: 56, fontWeight: 800, textAlign: 'left', lineHeight: 1.1, letterSpacing: 0, fontFamily: PF } },
    { id: sid('A', 3), text: '최대 30% 할인', position: { x: 80, y: 390 },
      style: { color: '#FFC857', fontSize: 44, fontWeight: 800, textAlign: 'left', lineHeight: 1.2, letterSpacing: -0.5, fontFamily: PF } },
    { id: sid('A', 4), text: '2025.01.17(금) ~ 02.02(일)', position: { x: 80, y: 470 },
      style: { color: '#FFFFFF', fontSize: 24, fontWeight: 400, textAlign: 'left', lineHeight: 1.2, letterSpacing: 0, fontFamily: PF } },
    { id: sid('A', 5), text: '바로가기 →', position: { x: 80, y: 560 },
      style: { color: '#0C2053', backgroundColor: '#FFFFFF', fontSize: 24, fontWeight: 700, textAlign: 'center', lineHeight: 64, width: 240, isPill: true, fontFamily: PF } },
  ],
};

// ════════════════════════════════════════════════════════════════
// E 타입 — 파란 배경 + 큰 영문 타이틀 + 골드 액센트
// ════════════════════════════════════════════════════════════════
const PRESET_E: BuilderMainPreset = {
  id: 'E',
  label: 'E 타입',
  emoji: '⚡',
  description: '블루 + 골드 액센트',
  thumbnail: `<svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
    <rect width="80" height="80" fill="#0070B8"/>
    <circle cx="8" cy="-4" r="18" fill="#ffffff" opacity="0.06"/>
    <circle cx="76" cy="22" r="14" fill="#E4B869" opacity="0.1"/>
    <text x="40" y="24" text-anchor="middle" fill="#fff" font-size="10" font-weight="900">PREMIUM</text>
    <text x="40" y="38" text-anchor="middle" fill="#E4B869" font-size="7" font-weight="900">Re:Cover</text>
    <text x="40" y="54" text-anchor="middle" fill="#fff" font-size="6" font-weight="800">30% OFF</text>
    <text x="40" y="64" text-anchor="middle" fill="#fff" font-size="3.5" opacity="0.85">04.23 ~ 04.30</text>
    <rect x="28" y="68" width="24" height="6" rx="3" fill="#ffffff"/>
  </svg>`,
  bgColor: '#0070B8',
  height: 800,
  decorations: `
    <svg width="100%" height="100%" viewBox="0 0 800 800" preserveAspectRatio="none" style="position:absolute;inset:0;pointer-events:none">
      <circle cx="80" cy="-60" r="200" fill="#ffffff" opacity="0.05"/>
      <circle cx="760" cy="200" r="160" fill="#E4B869" opacity="0.08"/>
      <ellipse cx="400" cy="800" rx="500" ry="160" fill="#003F73" opacity="0.4"/>
    </svg>
  `,
  texts: [
    { id: sid('E', 1), text: 'YOGIBO PREMIUM', position: { x: 0, y: 160 },
      style: { color: '#FFFFFF', fontSize: 96, fontWeight: 900, textAlign: 'center', lineHeight: 1.05, letterSpacing: -2, textShadow: '0 4px 10px rgba(0,0,0,0.2)', fontFamily: PF, width: 800 } },
    { id: sid('E', 2), text: 'Re:Cover', position: { x: 0, y: 290 },
      style: { color: '#E4B869', fontSize: 58, fontWeight: 900, textAlign: 'center', lineHeight: 1.1, letterSpacing: 0, textShadow: '0 2px 8px rgba(0,0,0,0.2)', fontFamily: PF, width: 800 } },
    { id: sid('E', 3), text: '최대 30% 할인', position: { x: 0, y: 430 },
      style: { color: '#FFFFFF', fontSize: 44, fontWeight: 800, textAlign: 'center', lineHeight: 1.2, letterSpacing: -0.5, fontFamily: PF, width: 800 } },
    { id: sid('E', 4), text: '2025.04.23 ~ 04.30', position: { x: 0, y: 510 },
      style: { color: '#FFFFFF', fontSize: 24, fontWeight: 400, textAlign: 'center', lineHeight: 1.2, letterSpacing: 0, fontFamily: PF, width: 800 } },
    { id: sid('E', 5), text: '바로가기 →', position: { x: 280, y: 620 },
      style: { color: '#0070B8', backgroundColor: '#FFFFFF', fontSize: 24, fontWeight: 700, textAlign: 'center', lineHeight: 64, width: 240, isPill: true, fontFamily: PF } },
  ],
};

// ════════════════════════════════════════════════════════════════
// F 타입 — 럭키드로우 (베이지 + LUCKY/DRAW 큰 타이포 + sparkle)
// ════════════════════════════════════════════════════════════════
const PRESET_F: BuilderMainPreset = {
  id: 'F',
  label: 'F 타입',
  emoji: '🎁',
  description: '럭키드로우 / 이벤트성',
  thumbnail: `<svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
    <rect width="80" height="80" fill="#B8A88E"/>
    <text x="40" y="14" text-anchor="middle" fill="#fff" font-size="3" font-weight="700" letter-spacing="1">MARCH</text>
    <text x="40" y="32" text-anchor="middle" fill="#fff" font-size="12" font-weight="900">LUCKY</text>
    <text x="40" y="48" text-anchor="middle" fill="#fff" font-size="12" font-weight="900">DRAW</text>
    <text x="40" y="58" text-anchor="middle" fill="#1F1F1F" font-size="4" font-weight="800">30% · 04.23~04.30</text>
    <rect x="28" y="62" width="24" height="6" rx="3" fill="#1F1F1F"/>
    <path d="M 0 70 L 30 80 L 0 80 Z" fill="#D4C5A9" opacity="0.6"/>
  </svg>`,
  bgColor: '#B8A88E',
  height: 800,
  decorations: `
    <svg width="100%" height="100%" viewBox="0 0 800 800" preserveAspectRatio="none" style="position:absolute;inset:0;pointer-events:none">
      <!-- 별 4개 (작은 sparkle 데코) -->
      <g fill="#FFFFFF" opacity="0.7">
        <path d="M 640 130 l 6 16 l 16 6 l -16 6 l -6 16 l -6 -16 l -16 -6 l 16 -6 z"/>
        <path d="M 130 240 l 4 12 l 12 4 l -12 4 l -4 12 l -4 -12 l -12 -4 l 12 -4 z"/>
        <path d="M 700 500 l 5 14 l 14 5 l -14 5 l -5 14 l -5 -14 l -14 -5 l 14 -5 z"/>
        <path d="M 110 590 l 4 11 l 11 4 l -11 4 l -4 11 l -4 -11 l -11 -4 l 11 -4 z"/>
      </g>
      <!-- 좌하단 사선 컷오프 -->
      <path d="M 0 680 L 360 800 L 0 800 Z" fill="#D4C5A9" opacity="0.6"/>
    </svg>
  `,
  texts: [
    { id: sid('F', 1), text: 'MARCH 2025', position: { x: 0, y: 80 },
      style: { color: '#FFFFFF', fontSize: 28, fontWeight: 600, textAlign: 'center', lineHeight: 1, letterSpacing: 2, fontFamily: PF, width: 800 } },
    { id: sid('F', 2), text: 'LUCKY', position: { x: 0, y: 140 },
      style: { color: '#FFFFFF', fontSize: 140, fontWeight: 900, textAlign: 'center', lineHeight: 0.95, letterSpacing: -3, fontFamily: PF, width: 800 } },
    { id: sid('F', 3), text: 'DRAW', position: { x: 0, y: 300 },
      style: { color: '#FFFFFF', fontSize: 140, fontWeight: 900, textAlign: 'center', lineHeight: 0.95, letterSpacing: -3, fontFamily: PF, width: 800 } },
    { id: sid('F', 4), text: '최대 30% 할인', position: { x: 0, y: 490 },
      style: { color: '#1F1F1F', fontSize: 40, fontWeight: 800, textAlign: 'center', lineHeight: 1.2, letterSpacing: -0.5, fontFamily: PF, width: 800 } },
    { id: sid('F', 5), text: '2025.04.23 ~ 04.30', position: { x: 0, y: 560 },
      style: { color: '#FFFFFF', fontSize: 24, fontWeight: 500, textAlign: 'center', lineHeight: 1.2, letterSpacing: -0.5, fontFamily: PF, width: 800 } },
    { id: sid('F', 6), text: '이벤트 바로가기 →', position: { x: 280, y: 660 },
      style: { color: '#FFFFFF', backgroundColor: '#1F1F1F', fontSize: 24, fontWeight: 700, textAlign: 'center', lineHeight: 64, width: 240, isPill: true, fontFamily: PF } },
  ],
};

export const BUILDER_MAIN_PRESETS: BuilderMainPreset[] = [
  PRESET_DEFAULT,
  PRESET_A,
  PRESET_E,
  PRESET_F,
];

export function getBuilderMainPresetById(id: string): BuilderMainPreset | undefined {
  return BUILDER_MAIN_PRESETS.find((p) => p.id === id);
}

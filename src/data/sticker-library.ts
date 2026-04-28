/**
 * 스티커 라이브러리 — 메인 비주얼/쿠폰 영역에서 자유롭게 추가할 수 있는 아이콘 모음
 * ──────────────────────────────────────────────────────────────────
 * 카테고리:
 *   · discount  : 할인율 뱃지 (원형/사각/리본)
 *   · time      : 시간/카운트다운 관련 아이콘
 *   · highlight : 강조 효과 (별, 폭발, 화살표)
 *   · season    : 시즌 장식 (꽃, 눈, 잎)
 *
 * 사용:
 *   STICKER_LIBRARY 에서 카테고리별로 필터링해서 UI 에 표시
 *   사용자 클릭 → 해당 스티커를 캔버스 중앙에 추가
 * ──────────────────────────────────────────────────────────────────
 */
import type { StickerItem } from '../app/builder/types';

export type StickerCategory = 'discount' | 'time' | 'highlight' | 'season';

export interface StickerLibraryItem {
  /** 라이브러리 내 고유 ID — 캔버스에 추가 시 timestamp 으로 새 ID 생성 */
  libraryId: string;
  category: StickerCategory;
  /** UI 에 표시될 이름 */
  label: string;
  /** 캔버스에 추가될 때 사용될 스티커 데이터 (id 는 새로 발급됨) */
  template: Omit<StickerItem, 'id'>;
  /** 작은 미리보기용 SVG (라이브러리 그리드에서 표시) */
  preview: string;
}

// ─────────────────────────────────────────────────────────────────
// 1. 할인율 뱃지 (8개) — 다양한 모양·색상의 할인 표시
// ─────────────────────────────────────────────────────────────────

const STK_DISCOUNT_CIRCLE_CYAN: StickerLibraryItem = {
  libraryId: 'discount-circle-cyan',
  category: 'discount',
  label: '시안 원형',
  preview: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
    <circle cx="30" cy="30" r="26" fill="#5ec9d4" stroke="#fff" stroke-width="2"/>
    <text x="30" y="26" text-anchor="middle" fill="#fff" font-size="9" font-weight="700">UP TO</text>
    <text x="30" y="40" text-anchor="middle" fill="#fff" font-size="14" font-weight="900">40%</text>
  </svg>`,
  template: {
    type: 'discount',
    position: { x: 350, y: 200 },
    size: 120,
    discountStyle: {
      bgColor: 'radial-gradient(circle at 30% 30%, #6ee7e7 0%, #5ec9d4 50%, #2da9b8 100%)',
      textColor: '#ffffff',
      label: 'UP TO',
      valueTemplate: '{discount}%',
      fontSize: 32,
      labelFontSize: 11,
      shape: 'circle',
    },
  },
};

const STK_DISCOUNT_CIRCLE_RED: StickerLibraryItem = {
  libraryId: 'discount-circle-red',
  category: 'discount',
  label: '레드 원형',
  preview: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
    <circle cx="30" cy="30" r="26" fill="#dc2626" stroke="#fff" stroke-width="2"/>
    <text x="30" y="26" text-anchor="middle" fill="#fff" font-size="8" font-weight="700">SALE</text>
    <text x="30" y="40" text-anchor="middle" fill="#fff" font-size="14" font-weight="900">50%</text>
  </svg>`,
  template: {
    type: 'discount',
    position: { x: 350, y: 200 },
    size: 120,
    discountStyle: {
      bgColor: 'radial-gradient(circle at 30% 30%, #fca5a5 0%, #dc2626 50%, #991b1b 100%)',
      textColor: '#ffffff',
      label: 'SALE',
      valueTemplate: '{discount}%',
      fontSize: 32,
      labelFontSize: 11,
      shape: 'circle',
    },
  },
};

const STK_DISCOUNT_CIRCLE_GOLD: StickerLibraryItem = {
  libraryId: 'discount-circle-gold',
  category: 'discount',
  label: '골드 원형',
  preview: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
    <circle cx="30" cy="30" r="26" fill="#fbbf24" stroke="#fff" stroke-width="2"/>
    <text x="30" y="26" text-anchor="middle" fill="#1c1917" font-size="7" font-weight="700">VIP</text>
    <text x="30" y="40" text-anchor="middle" fill="#1c1917" font-size="14" font-weight="900">25%</text>
  </svg>`,
  template: {
    type: 'discount',
    position: { x: 350, y: 200 },
    size: 120,
    discountStyle: {
      bgColor: 'linear-gradient(135deg, #fef3c7 0%, #fbbf24 50%, #d97706 100%)',
      textColor: '#1c1917',
      label: 'VIP',
      valueTemplate: '{discount}%',
      fontSize: 32,
      labelFontSize: 11,
      shape: 'circle',
    },
  },
};

const STK_DISCOUNT_ROUNDED_PINK: StickerLibraryItem = {
  libraryId: 'discount-rounded-pink',
  category: 'discount',
  label: '핑크 사각',
  preview: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
    <rect x="6" y="14" width="48" height="32" rx="6" fill="#f472b6" stroke="#fff" stroke-width="1.5"/>
    <text x="30" y="26" text-anchor="middle" fill="#fff" font-size="7" font-weight="700">UP TO</text>
    <text x="30" y="40" text-anchor="middle" fill="#fff" font-size="13" font-weight="900">30%</text>
  </svg>`,
  template: {
    type: 'discount',
    position: { x: 350, y: 200 },
    size: 140,
    discountStyle: {
      bgColor: 'linear-gradient(135deg, #fbcfe8 0%, #f472b6 50%, #be185d 100%)',
      textColor: '#ffffff',
      label: 'UP TO',
      valueTemplate: '{discount}%',
      fontSize: 36,
      labelFontSize: 12,
      shape: 'rounded',
    },
  },
};

const STK_DISCOUNT_ROUNDED_PURPLE: StickerLibraryItem = {
  libraryId: 'discount-rounded-purple',
  category: 'discount',
  label: '퍼플 사각',
  preview: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
    <rect x="6" y="14" width="48" height="32" rx="6" fill="#a855f7" stroke="#fff" stroke-width="1.5"/>
    <text x="30" y="26" text-anchor="middle" fill="#fff" font-size="7" font-weight="700">SPECIAL</text>
    <text x="30" y="40" text-anchor="middle" fill="#fff" font-size="13" font-weight="900">35%</text>
  </svg>`,
  template: {
    type: 'discount',
    position: { x: 350, y: 200 },
    size: 140,
    discountStyle: {
      bgColor: 'linear-gradient(135deg, #d8b4fe 0%, #a855f7 50%, #6b21a8 100%)',
      textColor: '#ffffff',
      label: 'SPECIAL',
      valueTemplate: '{discount}%',
      fontSize: 36,
      labelFontSize: 12,
      shape: 'rounded',
    },
  },
};

const STK_DISCOUNT_SQUARE_BLACK: StickerLibraryItem = {
  libraryId: 'discount-square-black',
  category: 'discount',
  label: '블랙 박스',
  preview: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
    <rect x="8" y="14" width="44" height="32" fill="#0a0a0a" stroke="#fff" stroke-width="1.5"/>
    <text x="30" y="26" text-anchor="middle" fill="#fff" font-size="7" font-weight="700">DEAL</text>
    <text x="30" y="40" text-anchor="middle" fill="#fff" font-size="13" font-weight="900">45%</text>
  </svg>`,
  template: {
    type: 'discount',
    position: { x: 350, y: 200 },
    size: 130,
    discountStyle: {
      bgColor: '#0a0a0a',
      textColor: '#ffffff',
      label: 'DEAL',
      valueTemplate: '{discount}%',
      fontSize: 32,
      labelFontSize: 12,
      shape: 'square',
    },
  },
};

const STK_DISCOUNT_RIBBON: StickerLibraryItem = {
  libraryId: 'discount-ribbon',
  category: 'discount',
  label: '리본 뱃지',
  preview: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="rb-g" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#ef4444"/>
        <stop offset="1" stop-color="#991b1b"/>
      </linearGradient>
    </defs>
    <path d="M 6 16 L 54 16 L 50 30 L 54 44 L 6 44 L 10 30 Z" fill="url(#rb-g)" stroke="#fff" stroke-width="1"/>
    <text x="30" y="34" text-anchor="middle" fill="#fff" font-size="11" font-weight="900">HOT 50%</text>
  </svg>`,
  template: {
    type: 'svg',
    position: { x: 320, y: 220 },
    size: 180,
    content: `<svg viewBox="0 0 200 80" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="ribbon-g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#ef4444"/>
          <stop offset="0.5" stop-color="#dc2626"/>
          <stop offset="1" stop-color="#991b1b"/>
        </linearGradient>
        <filter id="ribbon-shadow"><feGaussianBlur stdDeviation="2"/></filter>
      </defs>
      <path d="M 0 20 L 200 20 L 180 40 L 200 60 L 0 60 L 20 40 Z" fill="url(#ribbon-g)" stroke="#ffffff" stroke-width="2"/>
      <text x="100" y="48" text-anchor="middle" fill="#ffffff" font-size="22" font-weight="900" font-family="system-ui" letter-spacing="2">HOT DEAL</text>
    </svg>`,
  },
};

const STK_DISCOUNT_BURST: StickerLibraryItem = {
  libraryId: 'discount-burst',
  category: 'discount',
  label: '폭발 뱃지',
  preview: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="bs-g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fde047"/><stop offset="1" stop-color="#dc2626"/></linearGradient></defs>
    <polygon points="30,4 35,18 50,12 42,26 56,30 42,34 50,48 35,42 30,56 25,42 10,48 18,34 4,30 18,26 10,12 25,18" fill="url(#bs-g)" stroke="#fff" stroke-width="1"/>
    <text x="30" y="28" text-anchor="middle" fill="#fff" font-size="7" font-weight="800">SUPER</text>
    <text x="30" y="40" text-anchor="middle" fill="#fff" font-size="11" font-weight="900">DEAL</text>
  </svg>`,
  template: {
    type: 'svg',
    position: { x: 340, y: 200 },
    size: 160,
    content: `<svg viewBox="0 0 160 160" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="burst-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#fde047"/>
          <stop offset="0.5" stop-color="#f97316"/>
          <stop offset="1" stop-color="#dc2626"/>
        </linearGradient>
      </defs>
      <polygon points="80,8 92,42 130,30 112,64 150,80 112,96 130,130 92,118 80,152 68,118 30,130 48,96 10,80 48,64 30,30 68,42"
               fill="url(#burst-g)" stroke="#ffffff" stroke-width="3"/>
      <text x="80" y="76" text-anchor="middle" fill="#ffffff" font-size="18" font-weight="900" font-family="system-ui">SUPER</text>
      <text x="80" y="100" text-anchor="middle" fill="#ffffff" font-size="22" font-weight="900" font-family="system-ui">DEAL</text>
    </svg>`,
  },
};

// ─────────────────────────────────────────────────────────────────
// 2. 시간/타임세일 (3개)
// ─────────────────────────────────────────────────────────────────

const STK_TIME_LIMITED: StickerLibraryItem = {
  libraryId: 'time-limited',
  category: 'time',
  label: '한정 시간',
  preview: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
    <circle cx="30" cy="30" r="22" fill="#18181b" stroke="#fbbf24" stroke-width="2"/>
    <text x="30" y="28" text-anchor="middle" fill="#fbbf24" font-size="14">⏰</text>
    <text x="30" y="44" text-anchor="middle" fill="#fbbf24" font-size="6" font-weight="700">LIMITED</text>
  </svg>`,
  template: {
    type: 'svg',
    position: { x: 340, y: 200 },
    size: 140,
    content: `<svg viewBox="0 0 140 140" xmlns="http://www.w3.org/2000/svg">
      <circle cx="70" cy="70" r="64" fill="#18181b" stroke="#fbbf24" stroke-width="3"/>
      <text x="70" y="68" text-anchor="middle" font-size="44">⏰</text>
      <text x="70" y="100" text-anchor="middle" fill="#fbbf24" font-size="14" font-weight="900" letter-spacing="2" font-family="system-ui">LIMITED</text>
    </svg>`,
  },
};

const STK_TIME_24H: StickerLibraryItem = {
  libraryId: 'time-24h',
  category: 'time',
  label: '24시간 한정',
  preview: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
    <rect x="6" y="16" width="48" height="28" rx="4" fill="#dc2626" stroke="#fff" stroke-width="1"/>
    <text x="30" y="28" text-anchor="middle" fill="#fff" font-size="7" font-weight="700">ONLY</text>
    <text x="30" y="40" text-anchor="middle" fill="#fff" font-size="14" font-weight="900">24H</text>
  </svg>`,
  template: {
    type: 'svg',
    position: { x: 340, y: 200 },
    size: 160,
    content: `<svg viewBox="0 0 200 100" xmlns="http://www.w3.org/2000/svg">
      <defs><linearGradient id="t24" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ef4444"/><stop offset="1" stop-color="#991b1b"/></linearGradient></defs>
      <rect x="0" y="0" width="200" height="100" rx="14" fill="url(#t24)" stroke="#ffffff" stroke-width="3"/>
      <text x="100" y="40" text-anchor="middle" fill="#ffffff" font-size="20" font-weight="700" letter-spacing="6" font-family="system-ui">ONLY</text>
      <text x="100" y="80" text-anchor="middle" fill="#ffffff" font-size="40" font-weight="900" font-family="system-ui">24H</text>
    </svg>`,
  },
};

const STK_TIME_TODAY: StickerLibraryItem = {
  libraryId: 'time-today',
  category: 'time',
  label: '오늘만',
  preview: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
    <polygon points="6,18 54,18 50,42 10,42" fill="#fbbf24" stroke="#1c1917" stroke-width="1.5"/>
    <text x="30" y="28" text-anchor="middle" fill="#1c1917" font-size="6" font-weight="700">TODAY</text>
    <text x="30" y="40" text-anchor="middle" fill="#1c1917" font-size="11" font-weight="900">ONLY</text>
  </svg>`,
  template: {
    type: 'svg',
    position: { x: 340, y: 200 },
    size: 160,
    content: `<svg viewBox="0 0 200 100" xmlns="http://www.w3.org/2000/svg">
      <polygon points="0,16 200,16 184,84 16,84" fill="#fbbf24" stroke="#1c1917" stroke-width="3"/>
      <text x="100" y="44" text-anchor="middle" fill="#1c1917" font-size="18" font-weight="700" letter-spacing="6" font-family="system-ui">TODAY</text>
      <text x="100" y="74" text-anchor="middle" fill="#1c1917" font-size="28" font-weight="900" letter-spacing="4" font-family="system-ui">ONLY</text>
    </svg>`,
  },
};

// ─────────────────────────────────────────────────────────────────
// 3. 강조 효과 (4개) — 별, 화살표, 라이트닝, 신상
// ─────────────────────────────────────────────────────────────────

const STK_STAR_SOLID: StickerLibraryItem = {
  libraryId: 'star-solid',
  category: 'highlight',
  label: '별 (옐로우)',
  preview: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
    <text x="30" y="42" text-anchor="middle" font-size="32">⭐</text>
  </svg>`,
  template: {
    type: 'emoji',
    content: '⭐',
    position: { x: 100, y: 100 },
    size: 56,
    rotation: -15,
  },
};

const STK_SPARKLES: StickerLibraryItem = {
  libraryId: 'sparkles',
  category: 'highlight',
  label: '반짝임',
  preview: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
    <text x="30" y="42" text-anchor="middle" font-size="32">✨</text>
  </svg>`,
  template: {
    type: 'emoji',
    content: '✨',
    position: { x: 100, y: 100 },
    size: 48,
  },
};

const STK_BOLT: StickerLibraryItem = {
  libraryId: 'bolt',
  category: 'highlight',
  label: '번개',
  preview: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="bl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fde047"/><stop offset="1" stop-color="#f97316"/></linearGradient></defs>
    <path d="M 32 6 L 16 32 L 26 32 L 22 54 L 44 28 L 32 28 Z" fill="url(#bl)" stroke="#fff" stroke-width="1.5"/>
  </svg>`,
  template: {
    type: 'svg',
    position: { x: 340, y: 150 },
    size: 120,
    content: `<svg viewBox="0 0 100 160" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bolt-yo" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#fde047"/>
          <stop offset="0.5" stop-color="#f97316"/>
          <stop offset="1" stop-color="#dc2626"/>
        </linearGradient>
      </defs>
      <path d="M 60 0 L 12 85 L 48 85 L 32 160 L 92 65 L 56 65 Z"
            fill="url(#bolt-yo)" stroke="#ffffff" stroke-width="3" stroke-linejoin="round"/>
    </svg>`,
  },
};

const STK_NEW_BADGE: StickerLibraryItem = {
  libraryId: 'new-badge',
  category: 'highlight',
  label: 'NEW 뱃지',
  preview: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
    <circle cx="30" cy="30" r="24" fill="#3b82f6" stroke="#fff" stroke-width="2"/>
    <text x="30" y="36" text-anchor="middle" fill="#fff" font-size="14" font-weight="900">NEW</text>
  </svg>`,
  template: {
    type: 'svg',
    position: { x: 340, y: 200 },
    size: 110,
    content: `<svg viewBox="0 0 110 110" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="new-g" cx="0.3" cy="0.3">
          <stop offset="0" stop-color="#60a5fa"/>
          <stop offset="0.7" stop-color="#3b82f6"/>
          <stop offset="1" stop-color="#1e40af"/>
        </radialGradient>
      </defs>
      <circle cx="55" cy="55" r="50" fill="url(#new-g)" stroke="#ffffff" stroke-width="3"/>
      <text x="55" y="68" text-anchor="middle" fill="#ffffff" font-size="32" font-weight="900" font-family="system-ui" letter-spacing="2">NEW</text>
    </svg>`,
  },
};

// ─────────────────────────────────────────────────────────────────
// 4. 시즌/장식 (3개)
// ─────────────────────────────────────────────────────────────────

const STK_FLOWER: StickerLibraryItem = {
  libraryId: 'flower',
  category: 'season',
  label: '벚꽃',
  preview: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
    <text x="30" y="42" text-anchor="middle" font-size="32">🌸</text>
  </svg>`,
  template: {
    type: 'emoji',
    content: '🌸',
    position: { x: 100, y: 100 },
    size: 56,
    rotation: -10,
  },
};

const STK_BUTTERFLY: StickerLibraryItem = {
  libraryId: 'butterfly',
  category: 'season',
  label: '나비',
  preview: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
    <text x="30" y="42" text-anchor="middle" font-size="32">🦋</text>
  </svg>`,
  template: {
    type: 'emoji',
    content: '🦋',
    position: { x: 100, y: 100 },
    size: 52,
  },
};

const STK_GIFT: StickerLibraryItem = {
  libraryId: 'gift',
  category: 'season',
  label: '선물',
  preview: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
    <text x="30" y="42" text-anchor="middle" font-size="32">🎁</text>
  </svg>`,
  template: {
    type: 'emoji',
    content: '🎁',
    position: { x: 100, y: 100 },
    size: 56,
    rotation: -10,
  },
};

// ─────────────────────────────────────────────────────────────────
// 카탈로그 export
// ─────────────────────────────────────────────────────────────────
export const STICKER_LIBRARY: StickerLibraryItem[] = [
  // 할인 뱃지
  STK_DISCOUNT_CIRCLE_CYAN,
  STK_DISCOUNT_CIRCLE_RED,
  STK_DISCOUNT_CIRCLE_GOLD,
  STK_DISCOUNT_ROUNDED_PINK,
  STK_DISCOUNT_ROUNDED_PURPLE,
  STK_DISCOUNT_SQUARE_BLACK,
  STK_DISCOUNT_RIBBON,
  STK_DISCOUNT_BURST,
  // 시간
  STK_TIME_LIMITED,
  STK_TIME_24H,
  STK_TIME_TODAY,
  // 강조
  STK_STAR_SOLID,
  STK_SPARKLES,
  STK_BOLT,
  STK_NEW_BADGE,
  // 시즌
  STK_FLOWER,
  STK_BUTTERFLY,
  STK_GIFT,
];

export const STICKER_CATEGORIES: Array<{ key: StickerCategory; label: string; icon: string }> = [
  { key: 'discount',  label: '할인 뱃지',   icon: '🏷️' },
  { key: 'time',      label: '타임세일',    icon: '⏰' },
  { key: 'highlight', label: '강조 효과',   icon: '✨' },
  { key: 'season',    label: '시즌 장식',   icon: '🌸' },
];

/** 라이브러리에서 스티커를 가져와 새 ID 부여 후 반환 */
export function instantiateSticker(libraryId: string): StickerItem | null {
  const item = STICKER_LIBRARY.find((s) => s.libraryId === libraryId);
  if (!item) return null;
  const newId = `sticker-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  return {
    id: newId,
    ...item.template,
  };
}

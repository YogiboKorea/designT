/**
 * 메인 비주얼 템플릿 카탈로그 v2 — 디자인 강화
 * ──────────────────────────────────────────────────────────────────
 * 변경 사항:
 *   · 텍스트 글로우/스트로크/그림자로 입체감 ↑
 *   · 스티커 비대칭 배치, 다양한 크기 변주
 *   · 할인 뱃지: 더 크게, 그라데이션·테두리·그림자 강화
 *   · 가독성을 위해 텍스트 영역 어두운 그라데이션 오버레이는 빌더 측에서 처리
 * ──────────────────────────────────────────────────────────────────
 */
import type { TextItem, StickerItem, TemplateVar } from '../app/builder/types';

export interface MainTemplate {
  id: string;
  name: string;
  description: string;
  thumbnail: string;
  height: number;
  background: string;
  variables: TemplateVar[];
  texts: TextItem[];
  stickers: StickerItem[];
}

const sid = (prefix: string, idx: number) => `${prefix}-${idx}`;

// ════════════════════════════════════════════════════════════════
// 1. ⚡ 번쩍 핫딜 — 검정 + 네온 그라데이션 + 번개
// ════════════════════════════════════════════════════════════════
const TPL_FLASH_DEAL: MainTemplate = {
  id: 'flash-deal',
  name: '⚡ 번쩍 핫딜',
  description: '네온 그라데이션, 번개 그래픽, 강렬한 임팩트',
  height: 500,
  background: `
    radial-gradient(ellipse at 20% 30%, rgba(167,139,250,0.25) 0%, transparent 50%),
    radial-gradient(ellipse at 80% 70%, rgba(94,201,212,0.25) 0%, transparent 50%),
    linear-gradient(135deg, #0f0f1e 0%, #1a1a2e 50%, #0a0a14 100%)
  `,
  thumbnail: `<svg viewBox="0 0 100 60" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="fd-bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#1a1a2e"/>
        <stop offset="1" stop-color="#0a0a14"/>
      </linearGradient>
      <linearGradient id="fd-text" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="#ff6b9d"/>
        <stop offset="0.5" stop-color="#a78bfa"/>
        <stop offset="1" stop-color="#5ec9d4"/>
      </linearGradient>
    </defs>
    <rect width="100" height="60" fill="url(#fd-bg)"/>
    <text x="50" y="14" text-anchor="middle" fill="#fff" font-size="4" font-weight="600">번개처럼 날아온</text>
    <text x="50" y="34" text-anchor="middle" fill="url(#fd-text)" font-size="14" font-weight="900">번쩍 핫딜</text>
    <circle cx="50" cy="44" r="8" fill="#5ec9d4"/>
    <text x="50" y="46" text-anchor="middle" fill="#fff" font-size="5" font-weight="900">40%</text>
    <text x="32" y="22" font-size="6">⭐</text>
    <text x="62" y="22" font-size="4">✨</text>
  </svg>`,
  variables: [
    { key: 'discount',  label: '할인율 (%)',  type: 'number', defaultValue: 40, min: 1, max: 99 },
    { key: 'startDate', label: '시작일',       type: 'text',   defaultValue: '04.23' },
    { key: 'endDate',   label: '종료일',       type: 'text',   defaultValue: '04.30' },
  ],
  texts: [
    {
      id: sid('text', 1),
      text: '번개처럼 날아온 특가혜택',
      position: { x: 100, y: 70 },
      style: {
        color: '#ffffff',
        fontSize: 24,
        fontWeight: 600,
        textAlign: 'center',
        width: 600,
        letterSpacing: 0,
        textShadow: '0 2px 12px rgba(167,139,250,0.5)',
      },
    },
    {
      id: sid('text', 2),
      text: '번쩍       핫딜',
      position: { x: 50, y: 130 },
      style: {
        color: '#ff6b9d',
        fontSize: 110,
        fontWeight: 900,
        textAlign: 'center',
        width: 700,
        letterSpacing: -4,
        textShadow:
          '0 0 30px rgba(255,107,157,0.6), 0 0 60px rgba(167,139,250,0.4), 0 4px 20px rgba(0,0,0,0.8)',
      },
    },
    {
      id: sid('text', 3),
      text: '{startDate}    ─────    {endDate}',
      position: { x: 100, y: 410 },
      style: {
        color: '#ffffff',
        fontSize: 20,
        fontWeight: 600,
        textAlign: 'center',
        width: 600,
        letterSpacing: 3,
        textShadow: '0 2px 8px rgba(0,0,0,0.6)',
      },
    },
  ],
  stickers: [
    // 메인 번개 SVG (중앙 약간 좌측)
    {
      id: sid('sticker', 1),
      type: 'svg',
      content: `<svg viewBox="0 0 100 160" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="bolt-g" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#ff6b9d"/>
            <stop offset="0.5" stop-color="#a78bfa"/>
            <stop offset="1" stop-color="#5ec9d4"/>
          </linearGradient>
          <filter id="bolt-glow">
            <feGaussianBlur stdDeviation="3" result="b"/>
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>
        <path d="M 60 0 L 12 85 L 48 85 L 32 160 L 92 65 L 56 65 Z"
              fill="url(#bolt-g)"
              stroke="#ffffff"
              stroke-width="2.5"
              stroke-linejoin="round"
              filter="url(#bolt-glow)"/>
      </svg>`,
      position: { x: 340, y: 140 },
      size: 170,
    },
    // 별 (비대칭 — 다양한 크기·각도)
    { id: sid('sticker', 2), type: 'emoji', content: '⭐', position: { x: 90,  y: 130 }, size: 44, rotation: -18 },
    { id: sid('sticker', 3), type: 'emoji', content: '⭐', position: { x: 680, y: 250 }, size: 38, rotation: 25 },
    { id: sid('sticker', 4), type: 'emoji', content: '✨', position: { x: 700, y: 130 }, size: 32 },
    { id: sid('sticker', 5), type: 'emoji', content: '✨', position: { x: 60,  y: 320 }, size: 28 },
    { id: sid('sticker', 6), type: 'emoji', content: '💫', position: { x: 720, y: 380 }, size: 26 },
    // 할인율 원형 뱃지 — 강화된 디자인
    {
      id: sid('sticker', 7),
      type: 'discount',
      position: { x: 340, y: 230 },
      size: 130,
      rotation: -8,
      discountStyle: {
        bgColor: 'radial-gradient(circle at 30% 30%, #6ee7e7 0%, #5ec9d4 50%, #2da9b8 100%)',
        textColor: '#ffffff',
        label: 'UP TO',
        valueTemplate: '{discount}%',
        fontSize: 38,
        labelFontSize: 13,
        shape: 'circle',
      },
    },
  ],
};

// ════════════════════════════════════════════════════════════════
// 2. 🌸 봄 시즌 세일 — 파스텔 + 꽃 + 부드러운 우아함
// ════════════════════════════════════════════════════════════════
const TPL_SPRING: MainTemplate = {
  id: 'spring-sale',
  name: '🌸 봄 시즌 세일',
  description: '파스텔 톤, 우아한 세리프, 꽃 모티프',
  height: 460,
  background: `
    radial-gradient(ellipse at 30% 20%, rgba(251,207,232,0.7) 0%, transparent 60%),
    radial-gradient(ellipse at 70% 80%, rgba(221,214,254,0.7) 0%, transparent 60%),
    linear-gradient(135deg, #fff1f2 0%, #fef3c7 50%, #ede9fe 100%)
  `,
  thumbnail: `<svg viewBox="0 0 100 60" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="sp-bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#fff1f2"/>
        <stop offset="0.5" stop-color="#fef3c7"/>
        <stop offset="1" stop-color="#ede9fe"/>
      </linearGradient>
      <linearGradient id="sp-text" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#be185d"/>
        <stop offset="1" stop-color="#831843"/>
      </linearGradient>
    </defs>
    <rect width="100" height="60" fill="url(#sp-bg)"/>
    <text x="20" y="14" font-size="6">🌸</text>
    <text x="78" y="16" font-size="5">🌷</text>
    <text x="50" y="22" text-anchor="middle" fill="#be185d" font-size="3.5" font-weight="600" letter-spacing="1.5">SPRING SALE</text>
    <text x="50" y="38" text-anchor="middle" fill="url(#sp-text)" font-size="11" font-weight="800">봄맞이 할인</text>
    <text x="50" y="50" text-anchor="middle" fill="#9d174d" font-size="5" font-weight="700">최대 30%</text>
    <text x="80" y="52" font-size="4">🦋</text>
  </svg>`,
  variables: [
    { key: 'discount',  label: '할인율 (%)',  type: 'number', defaultValue: 30, min: 1, max: 99 },
    { key: 'startDate', label: '시작일',       type: 'text',   defaultValue: '03.20' },
    { key: 'endDate',   label: '종료일',       type: 'text',   defaultValue: '04.15' },
  ],
  texts: [
    {
      id: sid('text', 1),
      text: '— SPRING COLLECTION —',
      position: { x: 100, y: 70 },
      style: {
        color: '#be185d',
        fontSize: 22,
        fontWeight: 600,
        textAlign: 'center',
        width: 600,
        letterSpacing: 8,
        textShadow: '0 1px 3px rgba(190,24,93,0.15)',
      },
    },
    {
      id: sid('text', 2),
      text: '봄맞이 특별 할인',
      position: { x: 100, y: 130 },
      style: {
        color: '#831843',
        fontSize: 76,
        fontWeight: 800,
        textAlign: 'center',
        width: 600,
        letterSpacing: -2.5,
        textShadow: '0 4px 16px rgba(190,24,93,0.2)',
      },
    },
    {
      id: sid('text', 3),
      text: '봄을 담은 특별한 혜택',
      position: { x: 100, y: 250 },
      style: {
        color: '#be185d',
        fontSize: 22,
        fontWeight: 500,
        textAlign: 'center',
        width: 600,
      },
    },
    {
      id: sid('text', 4),
      text: '{startDate} ─ {endDate}',
      position: { x: 100, y: 380 },
      style: {
        color: '#9d174d',
        fontSize: 18,
        fontWeight: 600,
        textAlign: 'center',
        width: 600,
        letterSpacing: 3,
      },
    },
  ],
  stickers: [
    // 비대칭 꽃 배치
    { id: sid('sticker', 1), type: 'emoji', content: '🌸', position: { x: 50,  y: 50 },  size: 64, rotation: -12 },
    { id: sid('sticker', 2), type: 'emoji', content: '🌷', position: { x: 700, y: 70 },  size: 54, rotation: 18 },
    { id: sid('sticker', 3), type: 'emoji', content: '🌼', position: { x: 30,  y: 280 }, size: 42, rotation: -8 },
    { id: sid('sticker', 4), type: 'emoji', content: '🦋', position: { x: 680, y: 290 }, size: 56, rotation: -15 },
    { id: sid('sticker', 5), type: 'emoji', content: '🌿', position: { x: 720, y: 220 }, size: 36, rotation: 25 },
    { id: sid('sticker', 6), type: 'emoji', content: '🌿', position: { x: 100, y: 200 }, size: 32, rotation: -25 },
    // 할인 뱃지 — 부드러운 핑크 그라데이션, 둥근 사각
    {
      id: sid('sticker', 7),
      type: 'discount',
      position: { x: 320, y: 290 },
      size: 160,
      rotation: -6,
      discountStyle: {
        bgColor: 'linear-gradient(135deg, #fbcfe8 0%, #f472b6 50%, #be185d 100%)',
        textColor: '#ffffff',
        label: 'UP TO',
        valueTemplate: '{discount}%',
        fontSize: 44,
        labelFontSize: 13,
        shape: 'rounded',
      },
    },
  ],
};

// ════════════════════════════════════════════════════════════════
// 3. 🔥 블랙 프라이데이 — 검정 + 네온 레드, 임팩트 극대화
// ════════════════════════════════════════════════════════════════
const TPL_BLACK_FRIDAY: MainTemplate = {
  id: 'black-friday',
  name: '🔥 블랙 프라이데이',
  description: '강렬한 네온 레드, 사선 띠, 굵은 임팩트',
  height: 500,
  background: `
    radial-gradient(ellipse at 50% 50%, rgba(220,38,38,0.15) 0%, transparent 60%),
    linear-gradient(180deg, #000000 0%, #18181b 50%, #000000 100%)
  `,
  thumbnail: `<svg viewBox="0 0 100 60" xmlns="http://www.w3.org/2000/svg">
    <rect width="100" height="60" fill="#000"/>
    <rect x="0" y="6" width="100" height="6" fill="#dc2626" transform="skewY(-2)"/>
    <text x="50" y="11" text-anchor="middle" fill="#fff" font-size="4" font-weight="900" letter-spacing="2">BLACK FRIDAY</text>
    <text x="50" y="36" text-anchor="middle" fill="#fff" font-size="16" font-weight="900">BIG SALE</text>
    <text x="50" y="50" text-anchor="middle" fill="#dc2626" font-size="6" font-weight="900">UP TO 50% OFF</text>
  </svg>`,
  variables: [
    { key: 'discount',  label: '할인율 (%)',  type: 'number', defaultValue: 50, min: 1, max: 99 },
    { key: 'startDate', label: '시작일',       type: 'text',   defaultValue: '11.24' },
    { key: 'endDate',   label: '종료일',       type: 'text',   defaultValue: '11.30' },
  ],
  texts: [
    {
      id: sid('text', 1),
      text: 'BIG SALE',
      position: { x: 50, y: 130 },
      style: {
        color: '#ffffff',
        fontSize: 150,
        fontWeight: 900,
        textAlign: 'center',
        width: 700,
        letterSpacing: -5,
        textShadow:
          '0 0 40px rgba(220,38,38,0.6), 0 0 80px rgba(220,38,38,0.3), 0 8px 24px rgba(0,0,0,0.9)',
      },
    },
    {
      id: sid('text', 2),
      text: '단 7일간의 최대 혜택',
      position: { x: 100, y: 320 },
      style: {
        color: '#fafafa',
        fontSize: 22,
        fontWeight: 500,
        textAlign: 'center',
        width: 600,
        letterSpacing: 2,
      },
    },
    {
      id: sid('text', 3),
      text: '{startDate} ─ {endDate}',
      position: { x: 100, y: 410 },
      style: {
        color: '#a8a29e',
        fontSize: 18,
        fontWeight: 600,
        textAlign: 'center',
        width: 600,
        letterSpacing: 3,
      },
    },
  ],
  stickers: [
    // 사선 BLACK FRIDAY 띠 (상단)
    {
      id: sid('sticker', 1),
      type: 'svg',
      content: `<svg viewBox="0 0 320 50" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
        <defs>
          <linearGradient id="bf-band" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stop-color="#991b1b"/>
            <stop offset="0.5" stop-color="#dc2626"/>
            <stop offset="1" stop-color="#991b1b"/>
          </linearGradient>
        </defs>
        <rect width="320" height="50" fill="url(#bf-band)" transform="skewY(-2)"/>
        <text x="160" y="32" text-anchor="middle" fill="#ffffff" font-size="22" font-weight="900" letter-spacing="6" font-family="system-ui">BLACK FRIDAY</text>
      </svg>`,
      position: { x: 240, y: 60 },
      size: 320,
    },
    // 양쪽 불꽃
    { id: sid('sticker', 2), type: 'emoji', content: '🔥', position: { x: 60,  y: 200 }, size: 64, rotation: -10 },
    { id: sid('sticker', 3), type: 'emoji', content: '🔥', position: { x: 680, y: 200 }, size: 64, rotation: 10 },
    // 할인 사각 뱃지 — 사선 회전, 네온 레드
    {
      id: sid('sticker', 4),
      type: 'discount',
      position: { x: 310, y: 350 },
      size: 180,
      rotation: -8,
      discountStyle: {
        bgColor: 'linear-gradient(135deg, #ef4444 0%, #dc2626 50%, #991b1b 100%)',
        textColor: '#ffffff',
        label: 'UP TO',
        valueTemplate: '{discount}% OFF',
        fontSize: 32,
        labelFontSize: 14,
        shape: 'rounded',
      },
    },
  ],
};

// ════════════════════════════════════════════════════════════════
// 4. ✨ 신상품 런칭 — 미니멀 화이트 + 골드 액센트
// ════════════════════════════════════════════════════════════════
const TPL_NEW_LAUNCH: MainTemplate = {
  id: 'new-launch',
  name: '✨ 신상품 런칭',
  description: '미니멀 화이트, 골드 액센트, 럭셔리한 분위기',
  height: 440,
  background: `
    radial-gradient(ellipse at 50% 0%, rgba(254,215,170,0.4) 0%, transparent 60%),
    linear-gradient(180deg, #fafaf9 0%, #f5f5f4 50%, #e7e5e4 100%)
  `,
  thumbnail: `<svg viewBox="0 0 100 60" xmlns="http://www.w3.org/2000/svg">
    <rect width="100" height="60" fill="#fafaf9"/>
    <text x="50" y="14" text-anchor="middle" fill="#a16207" font-size="3.5" font-weight="600" letter-spacing="2">— NEW ARRIVAL —</text>
    <line x1="35" y1="18" x2="65" y2="18" stroke="#a16207" stroke-width="0.4"/>
    <text x="50" y="36" text-anchor="middle" fill="#1c1917" font-size="11" font-weight="900">신상품 런칭</text>
    <text x="50" y="50" text-anchor="middle" fill="#78716c" font-size="4">launching · 15% off</text>
  </svg>`,
  variables: [
    { key: 'discount',  label: '런칭 할인 (%)', type: 'number', defaultValue: 15, min: 1, max: 99 },
    { key: 'startDate', label: '시작일',          type: 'text',   defaultValue: '05.01' },
    { key: 'endDate',   label: '종료일',          type: 'text',   defaultValue: '05.31' },
  ],
  texts: [
    {
      id: sid('text', 1),
      text: '— NEW ARRIVAL —',
      position: { x: 100, y: 70 },
      style: {
        color: '#a16207',
        fontSize: 20,
        fontWeight: 600,
        textAlign: 'center',
        width: 600,
        letterSpacing: 12,
      },
    },
    {
      id: sid('text', 2),
      text: '신상품 런칭',
      position: { x: 100, y: 140 },
      style: {
        color: '#1c1917',
        fontSize: 88,
        fontWeight: 900,
        textAlign: 'center',
        width: 600,
        letterSpacing: -3,
        textShadow: '0 2px 8px rgba(28,25,23,0.1)',
      },
    },
    {
      id: sid('text', 3),
      text: 'launching now — 오픈 기념 {discount}% 할인',
      position: { x: 100, y: 270 },
      style: {
        color: '#57534e',
        fontSize: 20,
        fontWeight: 500,
        textAlign: 'center',
        width: 600,
        letterSpacing: 0.5,
      },
    },
    {
      id: sid('text', 4),
      text: '{startDate} ─ {endDate}',
      position: { x: 100, y: 360 },
      style: {
        color: '#a16207',
        fontSize: 16,
        fontWeight: 600,
        textAlign: 'center',
        width: 600,
        letterSpacing: 3,
      },
    },
  ],
  stickers: [
    // 골드 가는 라인 (제목 위)
    {
      id: sid('sticker', 1),
      type: 'svg',
      content: `<svg viewBox="0 0 200 4" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="gold-line" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stop-color="#a16207" stop-opacity="0"/>
            <stop offset="0.5" stop-color="#d97706"/>
            <stop offset="1" stop-color="#a16207" stop-opacity="0"/>
          </linearGradient>
        </defs>
        <line x1="0" y1="2" x2="200" y2="2" stroke="url(#gold-line)" stroke-width="2"/>
      </svg>`,
      position: { x: 300, y: 110 },
      size: 200,
    },
    // 골드 별 (장식)
    { id: sid('sticker', 2), type: 'emoji', content: '✨', position: { x: 150, y: 60 },  size: 32, rotation: -15 },
    { id: sid('sticker', 3), type: 'emoji', content: '✨', position: { x: 620, y: 80 },  size: 28, rotation: 20 },
    // 할인 뱃지 — 미니멀 골드
    {
      id: sid('sticker', 4),
      type: 'discount',
      position: { x: 320, y: 300 },
      size: 130,
      rotation: 0,
      discountStyle: {
        bgColor: 'linear-gradient(135deg, #fef3c7 0%, #fbbf24 50%, #d97706 100%)',
        textColor: '#1c1917',
        label: 'OPENING',
        valueTemplate: '{discount}% OFF',
        fontSize: 26,
        labelFontSize: 11,
        shape: 'circle',
      },
    },
  ],
};

// ════════════════════════════════════════════════════════════════
// 5. 🌊 여름 클리어런스 — 시원한 바다 그라데이션
// ════════════════════════════════════════════════════════════════
const TPL_SUMMER: MainTemplate = {
  id: 'summer-clearance',
  name: '🌊 여름 클리어런스',
  description: '바다 그라데이션, 청량한 분위기, 휴양지 무드',
  height: 480,
  background: `
    radial-gradient(ellipse at 70% 100%, rgba(14,165,233,0.4) 0%, transparent 60%),
    radial-gradient(ellipse at 20% 0%, rgba(254,240,138,0.4) 0%, transparent 50%),
    linear-gradient(180deg, #e0f2fe 0%, #7dd3fc 40%, #0284c7 100%)
  `,
  thumbnail: `<svg viewBox="0 0 100 60" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="sm-bg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#e0f2fe"/>
        <stop offset="1" stop-color="#0284c7"/>
      </linearGradient>
    </defs>
    <rect width="100" height="60" fill="url(#sm-bg)"/>
    <text x="50" y="14" text-anchor="middle" fill="#075985" font-size="3.5" font-weight="600" letter-spacing="3">SUMMER 2026</text>
    <text x="50" y="36" text-anchor="middle" fill="#fff" font-size="13" font-weight="900">CLEARANCE</text>
    <text x="50" y="50" text-anchor="middle" fill="#075985" font-size="6" font-weight="700">최대 60% OFF</text>
    <text x="20" y="22" font-size="6">🌊</text>
    <text x="76" y="22" font-size="5">☀️</text>
  </svg>`,
  variables: [
    { key: 'discount',  label: '할인율 (%)', type: 'number', defaultValue: 60, min: 1, max: 99 },
    { key: 'startDate', label: '시작일',      type: 'text',   defaultValue: '07.01' },
    { key: 'endDate',   label: '종료일',      type: 'text',   defaultValue: '07.31' },
  ],
  texts: [
    {
      id: sid('text', 1),
      text: 'SUMMER 2026',
      position: { x: 100, y: 70 },
      style: {
        color: '#075985',
        fontSize: 24,
        fontWeight: 700,
        textAlign: 'center',
        width: 600,
        letterSpacing: 14,
      },
    },
    {
      id: sid('text', 2),
      text: 'CLEARANCE',
      position: { x: 50, y: 130 },
      style: {
        color: '#ffffff',
        fontSize: 100,
        fontWeight: 900,
        textAlign: 'center',
        width: 700,
        letterSpacing: 8,
        textShadow:
          '0 0 30px rgba(2,132,199,0.5), 0 4px 20px rgba(7,89,133,0.4), 0 8px 40px rgba(0,0,0,0.2)',
      },
    },
    {
      id: sid('text', 3),
      text: '시원한 여름, 최대 {discount}% 할인',
      position: { x: 100, y: 270 },
      style: {
        color: '#075985',
        fontSize: 26,
        fontWeight: 700,
        textAlign: 'center',
        width: 600,
        textShadow: '0 1px 3px rgba(255,255,255,0.5)',
      },
    },
    {
      id: sid('text', 4),
      text: '{startDate} ─ {endDate}',
      position: { x: 100, y: 400 },
      style: {
        color: '#0c4a6e',
        fontSize: 18,
        fontWeight: 700,
        textAlign: 'center',
        width: 600,
        letterSpacing: 3,
      },
    },
  ],
  stickers: [
    // 바다 모티프 비대칭 배치
    { id: sid('sticker', 1), type: 'emoji', content: '🌊', position: { x: 50,  y: 60 },  size: 60, rotation: -10 },
    { id: sid('sticker', 2), type: 'emoji', content: '☀️', position: { x: 690, y: 50 },  size: 56, rotation: 0 },
    { id: sid('sticker', 3), type: 'emoji', content: '🏖️', position: { x: 80,  y: 350 }, size: 50, rotation: -8 },
    { id: sid('sticker', 4), type: 'emoji', content: '🐚', position: { x: 700, y: 360 }, size: 44, rotation: 25 },
    { id: sid('sticker', 5), type: 'emoji', content: '🍹', position: { x: 720, y: 240 }, size: 40 },
    { id: sid('sticker', 6), type: 'emoji', content: '⛵', position: { x: 110, y: 240 }, size: 36, rotation: -5 },
    // 할인 뱃지 — 시원한 청록 그라데이션
    {
      id: sid('sticker', 7),
      type: 'discount',
      position: { x: 330, y: 320 },
      size: 150,
      rotation: -5,
      discountStyle: {
        bgColor: 'linear-gradient(135deg, #fde047 0%, #facc15 50%, #eab308 100%)',
        textColor: '#0c4a6e',
        label: 'UP TO',
        valueTemplate: '{discount}%',
        fontSize: 44,
        labelFontSize: 13,
        shape: 'circle',
      },
    },
  ],
};

// ════════════════════════════════════════════════════════════════
// 6. 📷 미니멀 — 사진 + 글자만 (데코 없음)
//    이미지 한 장에 텍스트 슬롯(상단/중앙/하단)만 잡혀있는 구조.
//    배경 사진이 주인공이고, MD 는 글자 3줄만 채우면 됨.
// ════════════════════════════════════════════════════════════════
const TPL_MINIMAL: MainTemplate = {
  id: 'minimal',
  name: '📷 미니멀 (사진+글자)',
  description: '사진 한 장 + 텍스트 슬롯 3개. 데코 없는 깔끔한 구성',
  height: 500,
  // 사진이 없을 때 보이는 기본 배경 (옅은 그레이) — 사진 올리면 사진이 덮음
  background: '#1f2937',
  thumbnail: `<svg viewBox="0 0 100 60" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="mini-bg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#475569"/>
        <stop offset="1" stop-color="#1e293b"/>
      </linearGradient>
    </defs>
    <rect width="100" height="60" fill="url(#mini-bg)"/>
    <text x="50" y="14" text-anchor="middle" fill="#fff" font-size="3.5" font-weight="500" letter-spacing="1">SUBTITLE LINE</text>
    <text x="50" y="32" text-anchor="middle" fill="#fff" font-size="11" font-weight="800">HEADLINE</text>
    <text x="50" y="50" text-anchor="middle" fill="#fff" font-size="3.5" font-weight="500">2026.04.28 — 05.10</text>
  </svg>`,
  variables: [],
  texts: [
    // 상단 — 보조 카피
    {
      id: sid('text', 1),
      text: '카테고리 / 한 줄 카피',
      position: { x: 100, y: 80 },
      style: {
        color: '#ffffff',
        fontSize: 18,
        fontWeight: 500,
        textAlign: 'center',
        width: 600,
        letterSpacing: 4,
        textShadow: '0 2px 8px rgba(0,0,0,0.5)',
      },
    },
    // 중앙 — 메인 헤드라인
    {
      id: sid('text', 2),
      text: '메인 타이틀',
      position: { x: 50, y: 180 },
      style: {
        color: '#ffffff',
        fontSize: 80,
        fontWeight: 800,
        textAlign: 'center',
        width: 700,
        letterSpacing: -2,
        lineHeight: 1.1,
        textShadow: '0 4px 20px rgba(0,0,0,0.5)',
      },
    },
    // 하단 — 기간/세부 정보
    {
      id: sid('text', 3),
      text: '2026.04.28 — 2026.05.10',
      position: { x: 100, y: 410 },
      style: {
        color: '#ffffff',
        fontSize: 18,
        fontWeight: 500,
        textAlign: 'center',
        width: 600,
        letterSpacing: 3,
        textShadow: '0 2px 8px rgba(0,0,0,0.5)',
      },
    },
  ],
  // 스티커 없음 — 데코 일체 없음
  stickers: [],
};

// ────────────────────────────────────────────────────────────────
export const MAIN_VISUAL_TEMPLATES: MainTemplate[] = [
  TPL_FLASH_DEAL,
  TPL_SPRING,
  TPL_BLACK_FRIDAY,
  TPL_NEW_LAUNCH,
  TPL_SUMMER,
  TPL_MINIMAL,
];

export const getTemplateById = (id: string): MainTemplate | undefined =>
  MAIN_VISUAL_TEMPLATES.find((t) => t.id === id);

/** "할인 {discount}%" + {discount: 40} → "할인 40%" */
export function resolveTemplate(
  template: string,
  vars: Record<string, string | number> | undefined,
): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    const v = vars[key];
    return v !== undefined && v !== null ? String(v) : match;
  });
}

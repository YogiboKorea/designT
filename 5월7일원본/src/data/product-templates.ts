/**
 * 상품 영역 템플릿 카탈로그 — MD 가 사진/이름만 채워서 빠르게 완성
 * ──────────────────────────────────────────────────────────────────
 * 각 템플릿은 다음을 한꺼번에 세팅한다:
 *   · 영역 배경 (단색·그라데이션) + 상하 여백
 *   · 그리드 레이아웃 (uniform/featured + columns)
 *   · 헤더 텍스트 (제목 + 서브카피, 캡션)  ← MD 글자만 수정
 *   · 기본 상품 카드들의 뱃지·할인 색상 프리셋  ← MD 사진과 이름만 수정
 *
 *  ※ 디자인 통일성을 위해 색상·뱃지 위치·여백 등은 잠겨 있고,
 *    PropertiesPanel 에서는 상품 사진·이름·서브 라벨·할인율만 노출됨.
 * ──────────────────────────────────────────────────────────────────
 */
import type { TextItem, ProductItem } from '../app/builder/types';

export interface ProductTemplate {
  id: string;
  name: string;
  description: string;
  thumbnail: string;
  /** 그리드 레이아웃 */
  layout: 'uniform' | 'featured';
  columns: 1 | 2 | 3;
  /** 영역 배경 */
  bgColor?: string;
  bgGradient?: string;
  /** 상하 여백 */
  paddingTop: number;
  paddingBottom: number;
  /** 헤더 텍스트 */
  texts: TextItem[];
  /** 기본 상품 카드 (뱃지·할인 색상은 잠금, MD 가 사진/이름만 수정) */
  products: ProductItem[];
}

const sid = (prefix: string, idx: number) => `${prefix}-${idx}`;

// 빈 이미지 placeholder — MD 가 채울 자리
const EMPTY_IMG = '';

// ════════════════════════════════════════════════════════════════
// 1. 🛒 베이직 2단 그리드 — 가장 무난한 균형형
// ════════════════════════════════════════════════════════════════
const TPL_BASIC_2COL: ProductTemplate = {
  id: 'product-basic-2col',
  name: '🛒 베이직 2단 그리드',
  description: '균형 잡힌 2열 정렬, 어떤 카테고리든 잘 어울림',
  layout: 'uniform',
  columns: 2,
  bgColor: '#ffffff',
  paddingTop: 80,
  paddingBottom: 60,
  thumbnail: `<svg viewBox="0 0 100 60" xmlns="http://www.w3.org/2000/svg">
    <rect width="100" height="60" fill="#fff"/>
    <text x="50" y="10" text-anchor="middle" fill="#1f2937" font-size="6" font-weight="800">PRODUCT</text>
    <rect x="10" y="16" width="38" height="38" rx="3" fill="#f3f4f6" stroke="#e5e7eb"/>
    <rect x="52" y="16" width="38" height="38" rx="3" fill="#f3f4f6" stroke="#e5e7eb"/>
    <circle cx="44" cy="22" r="5" fill="#10b981"/>
    <text x="44" y="24" text-anchor="middle" fill="#fff" font-size="4" font-weight="900">20%</text>
    <circle cx="86" cy="22" r="5" fill="#10b981"/>
    <text x="86" y="24" text-anchor="middle" fill="#fff" font-size="4" font-weight="900">15%</text>
  </svg>`,
  texts: [
    {
      id: sid('text', 1),
      text: '추천 상품',
      position: { x: 280, y: 24 },
      style: { color: '#111827', fontSize: 28, fontWeight: 800, textAlign: 'center', width: 240 },
    },
    {
      id: sid('text', 2),
      text: '엄선된 베스트 셀러를 만나보세요',
      position: { x: 200, y: 60 },
      style: { color: '#6b7280', fontSize: 14, fontWeight: 500, textAlign: 'center', width: 400 },
    },
  ],
  products: [
    { id: sid('p', 1), name: '상품명을 입력하세요', discount: 20, image: EMPTY_IMG, badge: 'best',
      discountColor: '#10b981', badgeColor: '#ec4899' },
    { id: sid('p', 2), name: '상품명을 입력하세요', discount: 15, image: EMPTY_IMG, badge: 'new',
      discountColor: '#10b981', badgeColor: '#3b82f6' },
  ],
};

// ════════════════════════════════════════════════════════════════
// 2. 📦 컴팩트 3단 — 라인업이 많을 때
// ════════════════════════════════════════════════════════════════
const TPL_COMPACT_3COL: ProductTemplate = {
  id: 'product-compact-3col',
  name: '📦 컴팩트 3단',
  description: '라인업이 많을 때 / 카테고리 모음전',
  layout: 'uniform',
  columns: 3,
  bgColor: '#f9fafb',
  paddingTop: 80,
  paddingBottom: 70,
  thumbnail: `<svg viewBox="0 0 100 60" xmlns="http://www.w3.org/2000/svg">
    <rect width="100" height="60" fill="#f9fafb"/>
    <text x="50" y="10" text-anchor="middle" fill="#1f2937" font-size="6" font-weight="800">LINE UP</text>
    <rect x="6" y="16" width="26" height="38" rx="2" fill="#fff" stroke="#e5e7eb"/>
    <rect x="37" y="16" width="26" height="38" rx="2" fill="#fff" stroke="#e5e7eb"/>
    <rect x="68" y="16" width="26" height="38" rx="2" fill="#fff" stroke="#e5e7eb"/>
  </svg>`,
  texts: [
    {
      id: sid('text', 1),
      text: '인기 라인업',
      position: { x: 280, y: 24 },
      style: { color: '#111827', fontSize: 28, fontWeight: 800, textAlign: 'center', width: 240 },
    },
    {
      id: sid('text', 2),
      text: '한눈에 보는 베스트 셀렉션',
      position: { x: 220, y: 60 },
      style: { color: '#6b7280', fontSize: 14, fontWeight: 500, textAlign: 'center', width: 360 },
    },
  ],
  products: [
    { id: sid('p', 1), name: '상품명을 입력하세요', discount: 10, image: EMPTY_IMG, badge: 'best',
      discountColor: '#ef4444', badgeColor: '#ec4899' },
    { id: sid('p', 2), name: '상품명을 입력하세요', discount: 15, image: EMPTY_IMG, badge: 'hot',
      discountColor: '#ef4444', badgeColor: '#ef4444' },
    { id: sid('p', 3), name: '상품명을 입력하세요', discount: 20, image: EMPTY_IMG, badge: 'new',
      discountColor: '#ef4444', badgeColor: '#3b82f6' },
  ],
};

// ════════════════════════════════════════════════════════════════
// 3. ⭐ 강조형 1+2 — 메인 1개 + 서브 2개
// ════════════════════════════════════════════════════════════════
const TPL_FEATURED_1PLUS2: ProductTemplate = {
  id: 'product-featured',
  name: '⭐ 강조형 1+2',
  description: '간판 상품 1개 + 보조 라인업 2개',
  layout: 'featured',
  columns: 2, // featured 일 때는 무관
  bgColor: '#ffffff',
  paddingTop: 80,
  paddingBottom: 60,
  thumbnail: `<svg viewBox="0 0 100 60" xmlns="http://www.w3.org/2000/svg">
    <rect width="100" height="60" fill="#fff"/>
    <text x="50" y="10" text-anchor="middle" fill="#1f2937" font-size="6" font-weight="800">★ FEATURED</text>
    <rect x="10" y="16" width="46" height="38" rx="3" fill="#f3f4f6" stroke="#e5e7eb"/>
    <rect x="60" y="16" width="30" height="18" rx="2" fill="#f3f4f6" stroke="#e5e7eb"/>
    <rect x="60" y="36" width="30" height="18" rx="2" fill="#f3f4f6" stroke="#e5e7eb"/>
  </svg>`,
  texts: [
    {
      id: sid('text', 1),
      text: '★ 이번 주 PICK',
      position: { x: 250, y: 24 },
      style: { color: '#111827', fontSize: 28, fontWeight: 800, textAlign: 'center', width: 300 },
    },
    {
      id: sid('text', 2),
      text: '에디터가 직접 고른 이번 주 추천',
      position: { x: 200, y: 60 },
      style: { color: '#6b7280', fontSize: 14, fontWeight: 500, textAlign: 'center', width: 400 },
    },
  ],
  products: [
    { id: sid('p', 1), name: '메인 상품을 입력하세요', subtitle: '간판 카피', discount: 30, image: EMPTY_IMG, badge: 'best',
      discountColor: '#ef4444', badgeColor: '#111827' },
    { id: sid('p', 2), name: '서브 상품 1', discount: 10, image: EMPTY_IMG, badge: 'new',
      discountColor: '#ef4444', badgeColor: '#3b82f6' },
    { id: sid('p', 3), name: '서브 상품 2', discount: 15, image: EMPTY_IMG, badge: 'hot',
      discountColor: '#ef4444', badgeColor: '#ef4444' },
  ],
};

// ════════════════════════════════════════════════════════════════
// 4. 💎 럭셔리 다크 — 검정 배경 프리미엄
// ════════════════════════════════════════════════════════════════
const TPL_LUXURY_DARK: ProductTemplate = {
  id: 'product-luxury-dark',
  name: '💎 럭셔리 다크',
  description: '프리미엄·하이엔드·VIP 컬렉션',
  layout: 'uniform',
  columns: 2,
  bgColor: '#0c0a09',
  bgGradient: 'linear-gradient(180deg, #1c1917 0%, #0c0a09 100%)',
  paddingTop: 100,
  paddingBottom: 90,
  thumbnail: `<svg viewBox="0 0 100 60" xmlns="http://www.w3.org/2000/svg">
    <rect width="100" height="60" fill="#1c1917"/>
    <text x="50" y="10" text-anchor="middle" fill="#d4af37" font-size="6" font-weight="700" letter-spacing="2">SIGNATURE</text>
    <rect x="10" y="16" width="38" height="38" rx="0" fill="#292524" stroke="#d4af37" stroke-width="0.3"/>
    <rect x="52" y="16" width="38" height="38" rx="0" fill="#292524" stroke="#d4af37" stroke-width="0.3"/>
  </svg>`,
  texts: [
    {
      id: sid('text', 1),
      text: 'SIGNATURE COLLECTION',
      position: { x: 130, y: 30 },
      style: { color: '#d4af37', fontSize: 28, fontWeight: 700, textAlign: 'center', width: 540, letterSpacing: 6 },
    },
    {
      id: sid('text', 2),
      text: '─  CRAFTED FOR YOU  ─',
      position: { x: 200, y: 76 },
      style: { color: '#a8a29e', fontSize: 13, fontWeight: 500, textAlign: 'center', width: 400, letterSpacing: 4 },
    },
  ],
  products: [
    { id: sid('p', 1), name: '시그니처 상품 1', discount: 10, image: EMPTY_IMG, badge: 'custom', badgeLabel: 'EXCLUSIVE',
      discountColor: '#d4af37', badgeColor: '#d4af37' },
    { id: sid('p', 2), name: '시그니처 상품 2', discount: 15, image: EMPTY_IMG, badge: 'custom', badgeLabel: 'LIMITED',
      discountColor: '#d4af37', badgeColor: '#d4af37' },
  ],
};

// ════════════════════════════════════════════════════════════════
// 5. 🌸 파스텔 핑크 — 뷰티·여성·라이프
// ════════════════════════════════════════════════════════════════
const TPL_PASTEL_PINK: ProductTemplate = {
  id: 'product-pastel-pink',
  name: '🌸 파스텔 핑크',
  description: '뷰티·여성·생활용품·키즈',
  layout: 'uniform',
  columns: 2,
  bgColor: '#fdf2f8',
  bgGradient: 'linear-gradient(180deg, #fdf2f8 0%, #fce7f3 100%)',
  paddingTop: 80,
  paddingBottom: 70,
  thumbnail: `<svg viewBox="0 0 100 60" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="pp-bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fdf2f8"/><stop offset="1" stop-color="#fce7f3"/></linearGradient></defs>
    <rect width="100" height="60" fill="url(#pp-bg)"/>
    <text x="50" y="10" text-anchor="middle" fill="#be185d" font-size="6" font-weight="800">SOFT PICK</text>
    <rect x="10" y="16" width="38" height="38" rx="6" fill="#fff" stroke="#fbcfe8"/>
    <rect x="52" y="16" width="38" height="38" rx="6" fill="#fff" stroke="#fbcfe8"/>
  </svg>`,
  texts: [
    {
      id: sid('text', 1),
      text: '봄을 부르는 픽',
      position: { x: 250, y: 24 },
      style: { color: '#be185d', fontSize: 28, fontWeight: 800, textAlign: 'center', width: 300 },
    },
    {
      id: sid('text', 2),
      text: '하루를 더 사랑스럽게 만드는 아이템',
      position: { x: 180, y: 64 },
      style: { color: '#ec4899', fontSize: 14, fontWeight: 500, textAlign: 'center', width: 440 },
    },
  ],
  products: [
    { id: sid('p', 1), name: '상품명을 입력하세요', discount: 15, image: EMPTY_IMG, badge: 'best',
      discountColor: '#ec4899', badgeColor: '#ec4899' },
    { id: sid('p', 2), name: '상품명을 입력하세요', discount: 20, image: EMPTY_IMG, badge: 'new',
      discountColor: '#ec4899', badgeColor: '#a855f7' },
  ],
};

// ════════════════════════════════════════════════════════════════
// 6. 🔥 핫딜 빨강 — 가격 강조, 종료임박 톤
// ════════════════════════════════════════════════════════════════
const TPL_HOT_RED: ProductTemplate = {
  id: 'product-hot-red',
  name: '🔥 핫딜 빨강',
  description: '가격 강조·재고 한정·기간 특가',
  layout: 'uniform',
  columns: 2,
  bgColor: '#fef2f2',
  paddingTop: 70,
  paddingBottom: 60,
  thumbnail: `<svg viewBox="0 0 100 60" xmlns="http://www.w3.org/2000/svg">
    <rect width="100" height="60" fill="#fef2f2"/>
    <text x="50" y="10" text-anchor="middle" fill="#dc2626" font-size="7" font-weight="900">🔥 HOT DEAL</text>
    <rect x="10" y="16" width="38" height="38" rx="2" fill="#fff" stroke="#fecaca"/>
    <rect x="52" y="16" width="38" height="38" rx="2" fill="#fff" stroke="#fecaca"/>
    <circle cx="44" cy="22" r="6" fill="#dc2626"/>
    <text x="44" y="24" text-anchor="middle" fill="#fff" font-size="4" font-weight="900">50%</text>
    <circle cx="86" cy="22" r="6" fill="#dc2626"/>
    <text x="86" y="24" text-anchor="middle" fill="#fff" font-size="4" font-weight="900">40%</text>
  </svg>`,
  texts: [
    {
      id: sid('text', 1),
      text: '🔥 오늘만! 한정 핫딜',
      position: { x: 200, y: 22 },
      style: { color: '#dc2626', fontSize: 30, fontWeight: 900, textAlign: 'center', width: 400, letterSpacing: -1 },
    },
    {
      id: sid('text', 2),
      text: '재고 소진 시 즉시 종료됩니다',
      position: { x: 220, y: 62 },
      style: { color: '#991b1b', fontSize: 14, fontWeight: 600, textAlign: 'center', width: 360 },
    },
  ],
  products: [
    { id: sid('p', 1), name: '상품명을 입력하세요', discount: 50, image: EMPTY_IMG, badge: 'hot',
      discountColor: '#dc2626', badgeColor: '#dc2626' },
    { id: sid('p', 2), name: '상품명을 입력하세요', discount: 40, image: EMPTY_IMG, badge: 'hot',
      discountColor: '#dc2626', badgeColor: '#dc2626' },
  ],
};

// ════════════════════════════════════════════════════════════════
// 7. 🌿 내추럴 그린 — 친환경·식품·웰니스
// ════════════════════════════════════════════════════════════════
const TPL_NATURAL_GREEN: ProductTemplate = {
  id: 'product-natural-green',
  name: '🌿 내추럴 그린',
  description: '친환경·식품·건강기능식품·웰니스',
  layout: 'uniform',
  columns: 3,
  bgColor: '#f0fdf4',
  bgGradient: 'linear-gradient(180deg, #f0fdf4 0%, #dcfce7 100%)',
  paddingTop: 80,
  paddingBottom: 70,
  thumbnail: `<svg viewBox="0 0 100 60" xmlns="http://www.w3.org/2000/svg">
    <rect width="100" height="60" fill="#f0fdf4"/>
    <text x="50" y="10" text-anchor="middle" fill="#047857" font-size="6" font-weight="800">🌿 PURE</text>
    <rect x="6" y="16" width="26" height="38" rx="4" fill="#fff" stroke="#86efac"/>
    <rect x="37" y="16" width="26" height="38" rx="4" fill="#fff" stroke="#86efac"/>
    <rect x="68" y="16" width="26" height="38" rx="4" fill="#fff" stroke="#86efac"/>
  </svg>`,
  texts: [
    {
      id: sid('text', 1),
      text: '자연이 키운 라인업',
      position: { x: 230, y: 24 },
      style: { color: '#047857', fontSize: 28, fontWeight: 800, textAlign: 'center', width: 340 },
    },
    {
      id: sid('text', 2),
      text: '지구도 우리 몸도 건강하게',
      position: { x: 220, y: 64 },
      style: { color: '#059669', fontSize: 14, fontWeight: 500, textAlign: 'center', width: 360 },
    },
  ],
  products: [
    { id: sid('p', 1), name: '상품명을 입력하세요', discount: 10, image: EMPTY_IMG, badge: 'custom', badgeLabel: 'ECO',
      discountColor: '#10b981', badgeColor: '#10b981' },
    { id: sid('p', 2), name: '상품명을 입력하세요', discount: 15, image: EMPTY_IMG, badge: 'best',
      discountColor: '#10b981', badgeColor: '#047857' },
    { id: sid('p', 3), name: '상품명을 입력하세요', discount: 20, image: EMPTY_IMG, badge: 'new',
      discountColor: '#10b981', badgeColor: '#0d9488' },
  ],
};

// ════════════════════════════════════════════════════════════════
// 8. 🏠 모던 미니멀 — 화이트, 가구·홈리빙
// ════════════════════════════════════════════════════════════════
const TPL_MODERN_MINIMAL: ProductTemplate = {
  id: 'product-modern-minimal',
  name: '🏠 모던 미니멀',
  description: '미니멀·가구·홈리빙·라이프스타일',
  layout: 'uniform',
  columns: 2,
  bgColor: '#fafaf9',
  paddingTop: 100,
  paddingBottom: 90,
  thumbnail: `<svg viewBox="0 0 100 60" xmlns="http://www.w3.org/2000/svg">
    <rect width="100" height="60" fill="#fafaf9"/>
    <text x="50" y="10" text-anchor="middle" fill="#171717" font-size="5" font-weight="600" letter-spacing="2">collection</text>
    <rect x="10" y="16" width="38" height="38" rx="0" fill="#fff" stroke="#e7e5e4"/>
    <rect x="52" y="16" width="38" height="38" rx="0" fill="#fff" stroke="#e7e5e4"/>
  </svg>`,
  texts: [
    {
      id: sid('text', 1),
      text: 'collection',
      position: { x: 280, y: 30 },
      style: { color: '#171717', fontSize: 30, fontWeight: 600, textAlign: 'center', width: 240, letterSpacing: 4 },
    },
    {
      id: sid('text', 2),
      text: 'thoughtful living, everyday',
      position: { x: 220, y: 76 },
      style: { color: '#737373', fontSize: 13, fontWeight: 400, textAlign: 'center', width: 360, letterSpacing: 2 },
    },
  ],
  products: [
    { id: sid('p', 1), name: '상품명을 입력하세요', discount: 0, image: EMPTY_IMG, badge: 'none',
      discountColor: '#171717', badgeColor: '#171717' },
    { id: sid('p', 2), name: '상품명을 입력하세요', discount: 0, image: EMPTY_IMG, badge: 'none',
      discountColor: '#171717', badgeColor: '#171717' },
  ],
};

// ────────────────────────────────────────────────────────────────
export const PRODUCT_TEMPLATES: ProductTemplate[] = [
  TPL_BASIC_2COL,
  TPL_COMPACT_3COL,
  TPL_FEATURED_1PLUS2,
  TPL_LUXURY_DARK,
  TPL_PASTEL_PINK,
  TPL_HOT_RED,
  TPL_NATURAL_GREEN,
  TPL_MODERN_MINIMAL,
];

export const getProductTemplateById = (id: string): ProductTemplate | undefined =>
  PRODUCT_TEMPLATES.find((t) => t.id === id);

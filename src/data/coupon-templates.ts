/**
 * 쿠폰 영역 템플릿 카탈로그 — MD 가 사진/텍스트만 수정해서 빠르게 완성하는 프리셋
 * ──────────────────────────────────────────────────────────────────
 * 각 템플릿은 다음을 한꺼번에 세팅한다:
 *   · 영역 배경 (단색 또는 그라데이션)
 *   · 헤더 텍스트 (제목·서브카피)  ← MD 가 글자만 수정
 *   · 쿠폰 카드 스타일 (shape / 색상 / 보더 / 그라데이션)
 *   · 기본 쿠폰 1~2장의 라벨/색상 프리셋  ← MD 는 라벨 글자, 할인내역, 링크만 수정
 *
 *  ※ 디자인 통일성을 위해 색상·보더·shape 같은 시각 속성은 잠겨 있고,
 *    PropertiesPanel 에서 텍스트와 링크 입력만 노출된다.
 * ──────────────────────────────────────────────────────────────────
 */
import type { TextItem, CouponItem } from '../app/builder/types';

export interface CouponTemplate {
  id: string;
  name: string;
  description: string;
  /** 썸네일 SVG (인라인) — 갤러리에서 표시 */
  thumbnail: string;
  /** 영역 배경 색 */
  bgColor: string;
  /** 영역 배경 그라데이션 (있으면 bgColor 대신 사용) */
  bgGradient?: string;
  /** 헤더 텍스트 (드래그 가능한 텍스트로 영역 위에 얹힘) */
  texts: TextItem[];
  /** 기본 쿠폰 카드 (디자인 속성은 잠겨있음, MD 는 라벨/내용/링크만 수정) */
  coupons: CouponItem[];
}

const sid = (prefix: string, idx: number) => `${prefix}-${idx}`;

// ════════════════════════════════════════════════════════════════
// 1. 🌸 스프링 쿠폰팩 — 핑크 파스텔 + 클래식 카드
// ════════════════════════════════════════════════════════════════
const TPL_SPRING_COUPON: CouponTemplate = {
  id: 'coupon-spring',
  name: '🌸 스프링 쿠폰팩',
  description: '봄·꽃·여성 타깃에 어울리는 핑크 파스텔',
  bgColor: '#ffedf3',
  bgGradient: 'linear-gradient(180deg, #fff0f5 0%, #ffd6e7 100%)',
  thumbnail: `<svg viewBox="0 0 100 60" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="cs-bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff0f5"/><stop offset="1" stop-color="#ffd6e7"/></linearGradient></defs>
    <rect width="100" height="60" fill="url(#cs-bg)"/>
    <text x="50" y="14" text-anchor="middle" fill="#ec4899" font-size="7" font-weight="800">스프링 쿠폰팩</text>
    <rect x="14" y="22" width="72" height="14" rx="3" fill="#fff" stroke="#fbcfe8"/>
    <text x="50" y="32" text-anchor="middle" fill="#ec4899" font-size="5" font-weight="700">10% OFF</text>
    <rect x="14" y="40" width="72" height="14" rx="3" fill="#fff" stroke="#fbcfe8"/>
    <text x="50" y="50" text-anchor="middle" fill="#ec4899" font-size="5" font-weight="700">20% OFF</text>
  </svg>`,
  texts: [
    {
      id: sid('text', 1),
      text: '스프링 쿠폰팩',
      position: { x: 230, y: 40 },
      style: { color: '#ec4899', fontSize: 36, fontWeight: 800, textAlign: 'center', width: 340 },
    },
    {
      id: sid('text', 2),
      text: '화사한 봄날, 우리 집을 위한 완벽한 휴식 솔루션',
      position: { x: 150, y: 92 },
      style: { color: '#f472b6', fontSize: 16, fontWeight: 500, textAlign: 'center', width: 500 },
    },
  ],
  coupons: [
    { id: sid('cp', 1), label: '🌷 NEW MEMBER', name: '전 제품 10% OFF', link: '#',
      shape: 'classic', borderStyle: 'solid',
      labelColor: '#ec4899', nameColor: '#831843', couponBgColor: '#ffffff', couponWidth: 480 },
    { id: sid('cp', 2), label: '🌸 BIG SALE', name: '20만원 이상 구매시 20%', link: '#',
      shape: 'classic', borderStyle: 'solid',
      labelColor: '#ec4899', nameColor: '#831843', couponBgColor: '#ffffff', couponWidth: 480 },
  ],
};

// ════════════════════════════════════════════════════════════════
// 2. ⚡ 다크 핫딜 — 검정 + 네온 + 티켓 모양
// ════════════════════════════════════════════════════════════════
const TPL_DARK_DEAL: CouponTemplate = {
  id: 'coupon-dark-deal',
  name: '⚡ 다크 핫딜',
  description: '강렬한 임팩트, 한정 특가 / 플래시 세일',
  bgColor: '#0f0f1e',
  bgGradient: 'radial-gradient(ellipse at top, #1a1a2e 0%, #0a0a14 100%)',
  thumbnail: `<svg viewBox="0 0 100 60" xmlns="http://www.w3.org/2000/svg">
    <rect width="100" height="60" fill="#0f0f1e"/>
    <text x="50" y="14" text-anchor="middle" fill="#fbbf24" font-size="7" font-weight="900">⚡ FLASH DEAL</text>
    <rect x="14" y="22" width="72" height="14" rx="2" fill="#1a1a2e" stroke="#fbbf24" stroke-dasharray="2,1"/>
    <text x="50" y="32" text-anchor="middle" fill="#fff" font-size="5" font-weight="700">50% OFF</text>
    <rect x="14" y="40" width="72" height="14" rx="2" fill="#1a1a2e" stroke="#fbbf24" stroke-dasharray="2,1"/>
    <text x="50" y="50" text-anchor="middle" fill="#fff" font-size="5" font-weight="700">FREE 배송</text>
  </svg>`,
  texts: [
    {
      id: sid('text', 1),
      text: '⚡ FLASH DEAL',
      position: { x: 230, y: 40 },
      style: { color: '#fbbf24', fontSize: 38, fontWeight: 900, textAlign: 'center', width: 340, letterSpacing: 2 },
    },
    {
      id: sid('text', 2),
      text: '오늘 단 하루! 놓치면 끝나는 특가 쿠폰',
      position: { x: 150, y: 95 },
      style: { color: '#e2e8f0', fontSize: 15, fontWeight: 500, textAlign: 'center', width: 500 },
    },
  ],
  coupons: [
    { id: sid('cp', 1), label: '🔥 HOT', name: '인기 상품 50% 즉시 할인', link: '#',
      shape: 'ticket', borderStyle: 'dashed',
      labelColor: '#fbbf24', nameColor: '#ffffff', couponBgColor: '#1a1a2e', couponWidth: 480 },
    { id: sid('cp', 2), label: '🚚 FREE', name: '전 제품 무료배송 쿠폰', link: '#',
      shape: 'ticket', borderStyle: 'dashed',
      labelColor: '#fbbf24', nameColor: '#ffffff', couponBgColor: '#1a1a2e', couponWidth: 480 },
  ],
};

// ════════════════════════════════════════════════════════════════
// 3. 💎 럭셔리 골드 — 베이지 + 골드 보더, 프리미엄 톤
// ════════════════════════════════════════════════════════════════
const TPL_LUXURY_GOLD: CouponTemplate = {
  id: 'coupon-luxury-gold',
  name: '💎 럭셔리 골드',
  description: '프리미엄·뷰티·VIP 멤버십 톤',
  bgColor: '#1c1917',
  bgGradient: 'linear-gradient(180deg, #1c1917 0%, #292524 100%)',
  thumbnail: `<svg viewBox="0 0 100 60" xmlns="http://www.w3.org/2000/svg">
    <rect width="100" height="60" fill="#1c1917"/>
    <text x="50" y="14" text-anchor="middle" fill="#d4af37" font-size="7" font-weight="700" font-style="italic">VIP COUPON</text>
    <rect x="14" y="22" width="72" height="14" rx="0" fill="none" stroke="#d4af37"/>
    <text x="50" y="32" text-anchor="middle" fill="#d4af37" font-size="5" font-weight="600">15% OFF</text>
    <rect x="14" y="40" width="72" height="14" rx="0" fill="none" stroke="#d4af37"/>
    <text x="50" y="50" text-anchor="middle" fill="#d4af37" font-size="5" font-weight="600">SIGNATURE</text>
  </svg>`,
  texts: [
    {
      id: sid('text', 1),
      text: 'VIP EXCLUSIVE',
      position: { x: 230, y: 36 },
      style: { color: '#d4af37', fontSize: 32, fontWeight: 700, textAlign: 'center', width: 340, letterSpacing: 6 },
    },
    {
      id: sid('text', 2),
      text: '─  PREMIUM MEMBERS ONLY  ─',
      position: { x: 180, y: 88 },
      style: { color: '#a8a29e', fontSize: 13, fontWeight: 500, textAlign: 'center', width: 440, letterSpacing: 4 },
    },
  ],
  coupons: [
    { id: sid('cp', 1), label: '✦ SIGNATURE', name: '시그니처 라인 15% 할인', link: '#',
      shape: 'classic', borderStyle: 'solid',
      labelColor: '#d4af37', nameColor: '#fef3c7', couponBgColor: '#292524', couponWidth: 500 },
    { id: sid('cp', 2), label: '✦ COMPLIMENTARY', name: '구매 시 사은품 증정', link: '#',
      shape: 'classic', borderStyle: 'solid',
      labelColor: '#d4af37', nameColor: '#fef3c7', couponBgColor: '#292524', couponWidth: 500 },
  ],
};

// ════════════════════════════════════════════════════════════════
// 4. 🌿 내추럴 민트 — 친환경·웰니스 톤, 둥근 뱃지형
// ════════════════════════════════════════════════════════════════
const TPL_NATURAL_MINT: CouponTemplate = {
  id: 'coupon-natural-mint',
  name: '🌿 내추럴 민트',
  description: '친환경·웰니스·식품·건강기능식품',
  bgColor: '#ecfdf5',
  bgGradient: 'linear-gradient(180deg, #ecfdf5 0%, #d1fae5 100%)',
  thumbnail: `<svg viewBox="0 0 100 60" xmlns="http://www.w3.org/2000/svg">
    <rect width="100" height="60" fill="#ecfdf5"/>
    <text x="50" y="14" text-anchor="middle" fill="#047857" font-size="6" font-weight="700">🌿 NATURAL DEAL</text>
    <rect x="14" y="22" width="72" height="14" rx="7" fill="#fff" stroke="#34d399"/>
    <text x="50" y="32" text-anchor="middle" fill="#047857" font-size="5" font-weight="700">10% OFF</text>
    <rect x="14" y="40" width="72" height="14" rx="7" fill="#fff" stroke="#34d399"/>
    <text x="50" y="50" text-anchor="middle" fill="#047857" font-size="5" font-weight="700">FREE GIFT</text>
  </svg>`,
  texts: [
    {
      id: sid('text', 1),
      text: '자연이 주는 선물',
      position: { x: 200, y: 38 },
      style: { color: '#047857', fontSize: 32, fontWeight: 800, textAlign: 'center', width: 400 },
    },
    {
      id: sid('text', 2),
      text: '오늘부터 시작하는 깨끗한 라이프스타일',
      position: { x: 180, y: 90 },
      style: { color: '#059669', fontSize: 15, fontWeight: 500, textAlign: 'center', width: 440 },
    },
  ],
  coupons: [
    { id: sid('cp', 1), label: '🌱 NEW LIFE', name: '첫 구매 10% 할인 쿠폰', link: '#',
      shape: 'badge', borderStyle: 'solid',
      labelColor: '#047857', nameColor: '#064e3b', couponBgColor: '#ffffff', couponWidth: 460 },
    { id: sid('cp', 2), label: '🎁 FREE GIFT', name: '5만원 이상 구매시 사은품', link: '#',
      shape: 'badge', borderStyle: 'solid',
      labelColor: '#047857', nameColor: '#064e3b', couponBgColor: '#ffffff', couponWidth: 460 },
  ],
};

// ════════════════════════════════════════════════════════════════
// 5. 🎟️ 클래식 티켓 — 영화관 티켓 모양, 빈티지 베이지
// ════════════════════════════════════════════════════════════════
const TPL_CLASSIC_TICKET: CouponTemplate = {
  id: 'coupon-classic-ticket',
  name: '🎟️ 클래식 티켓',
  description: '빈티지·이벤트·문화 콘텐츠 톤',
  bgColor: '#fef3c7',
  bgGradient: 'linear-gradient(180deg, #fef3c7 0%, #fde68a 100%)',
  thumbnail: `<svg viewBox="0 0 100 60" xmlns="http://www.w3.org/2000/svg">
    <rect width="100" height="60" fill="#fef3c7"/>
    <text x="50" y="14" text-anchor="middle" fill="#92400e" font-size="6" font-weight="800">━ ADMIT ONE ━</text>
    <rect x="14" y="22" width="72" height="14" rx="2" fill="#fffbeb" stroke="#92400e" stroke-dasharray="3,2"/>
    <text x="50" y="32" text-anchor="middle" fill="#92400e" font-size="5" font-weight="700">EVENT TICKET</text>
    <rect x="14" y="40" width="72" height="14" rx="2" fill="#fffbeb" stroke="#92400e" stroke-dasharray="3,2"/>
    <text x="50" y="50" text-anchor="middle" fill="#92400e" font-size="5" font-weight="700">VIP PASS</text>
  </svg>`,
  texts: [
    {
      id: sid('text', 1),
      text: '━━ EVENT TICKET ━━',
      position: { x: 180, y: 36 },
      style: { color: '#92400e', fontSize: 28, fontWeight: 800, textAlign: 'center', width: 440, letterSpacing: 3 },
    },
    {
      id: sid('text', 2),
      text: '특별한 날을 위한 특별한 혜택',
      position: { x: 220, y: 86 },
      style: { color: '#b45309', fontSize: 15, fontWeight: 600, textAlign: 'center', width: 360 },
    },
  ],
  coupons: [
    { id: sid('cp', 1), label: 'ADMIT ONE', name: '이벤트 한정 25% 할인', link: '#',
      shape: 'ticket', borderStyle: 'dashed',
      labelColor: '#92400e', nameColor: '#451a03', couponBgColor: '#fffbeb', couponWidth: 500 },
    { id: sid('cp', 2), label: 'VIP PASS', name: 'VIP 전용 추가 적립금', link: '#',
      shape: 'ticket', borderStyle: 'dashed',
      labelColor: '#92400e', nameColor: '#451a03', couponBgColor: '#fffbeb', couponWidth: 500 },
  ],
};

// ════════════════════════════════════════════════════════════════
// 6. 🌊 오션 블루 — 시원한 청량감, 여름·테크
// ════════════════════════════════════════════════════════════════
const TPL_OCEAN_BLUE: CouponTemplate = {
  id: 'coupon-ocean-blue',
  name: '🌊 오션 블루',
  description: '여름·시원·테크·전자제품 톤',
  bgColor: '#dbeafe',
  bgGradient: 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 50%, #2563eb 100%)',
  thumbnail: `<svg viewBox="0 0 100 60" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="ob-bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#60a5fa"/><stop offset="1" stop-color="#2563eb"/></linearGradient></defs>
    <rect width="100" height="60" fill="url(#ob-bg)"/>
    <text x="50" y="14" text-anchor="middle" fill="#fff" font-size="7" font-weight="800">SUMMER COOL</text>
    <rect x="14" y="22" width="72" height="14" rx="3" fill="#fff" opacity="0.95"/>
    <text x="50" y="32" text-anchor="middle" fill="#1e40af" font-size="5" font-weight="800">30% OFF</text>
    <rect x="14" y="40" width="72" height="14" rx="3" fill="#fff" opacity="0.95"/>
    <text x="50" y="50" text-anchor="middle" fill="#1e40af" font-size="5" font-weight="800">15만원↑</text>
  </svg>`,
  texts: [
    {
      id: sid('text', 1),
      text: 'SUMMER COOL',
      position: { x: 230, y: 38 },
      style: { color: '#ffffff', fontSize: 36, fontWeight: 900, textAlign: 'center', width: 340, letterSpacing: 4, textShadow: '0 2px 12px rgba(0,0,0,0.25)' },
    },
    {
      id: sid('text', 2),
      text: '시원한 여름, 시원한 할인',
      position: { x: 230, y: 90 },
      style: { color: '#dbeafe', fontSize: 15, fontWeight: 500, textAlign: 'center', width: 340 },
    },
  ],
  coupons: [
    { id: sid('cp', 1), label: '☀️ SUMMER', name: '여름 신상 30% 할인 쿠폰', link: '#',
      shape: 'classic', borderStyle: 'none',
      labelColor: '#1e40af', nameColor: '#0c4a6e', couponBgColor: '#ffffff', couponWidth: 480 },
    { id: sid('cp', 2), label: '🌊 BIG ORDER', name: '15만원 이상 구매시 적용', link: '#',
      shape: 'classic', borderStyle: 'none',
      labelColor: '#1e40af', nameColor: '#0c4a6e', couponBgColor: '#ffffff', couponWidth: 480 },
  ],
};

// ════════════════════════════════════════════════════════════════
// 7. 🍓 비비드 팝 — 강렬한 채도, MZ 타깃
// ════════════════════════════════════════════════════════════════
const TPL_VIVID_POP: CouponTemplate = {
  id: 'coupon-vivid-pop',
  name: '🍓 비비드 팝',
  description: 'MZ·뷰티·패션·트렌디 콘텐츠',
  bgColor: '#fef2f2',
  bgGradient: 'linear-gradient(135deg, #fef3c7 0%, #fbcfe8 50%, #ddd6fe 100%)',
  thumbnail: `<svg viewBox="0 0 100 60" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="vp-bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fef3c7"/><stop offset="0.5" stop-color="#fbcfe8"/><stop offset="1" stop-color="#ddd6fe"/></linearGradient></defs>
    <rect width="100" height="60" fill="url(#vp-bg)"/>
    <text x="50" y="14" text-anchor="middle" fill="#7c3aed" font-size="7" font-weight="900">YAY! POP</text>
    <rect x="14" y="22" width="72" height="14" rx="7" fill="#fff" stroke="#a855f7"/>
    <text x="50" y="32" text-anchor="middle" fill="#a855f7" font-size="5" font-weight="800">25% OFF</text>
    <rect x="14" y="40" width="72" height="14" rx="7" fill="#fff" stroke="#a855f7"/>
    <text x="50" y="50" text-anchor="middle" fill="#a855f7" font-size="5" font-weight="800">FIRST BUY</text>
  </svg>`,
  texts: [
    {
      id: sid('text', 1),
      text: 'YAY! 쿠폰 모음',
      position: { x: 200, y: 38 },
      style: { color: '#7c3aed', fontSize: 36, fontWeight: 900, textAlign: 'center', width: 400, letterSpacing: -1 },
    },
    {
      id: sid('text', 2),
      text: '쟁여둘수록 이득되는 트렌디 쿠폰들',
      position: { x: 180, y: 92 },
      style: { color: '#a855f7', fontSize: 15, fontWeight: 600, textAlign: 'center', width: 440 },
    },
  ],
  coupons: [
    { id: sid('cp', 1), label: '💖 FIRST BUY', name: '첫 구매 25% 즉시할인', link: '#',
      shape: 'badge', borderStyle: 'solid',
      labelColor: '#a855f7', nameColor: '#581c87', couponBgColor: '#ffffff', couponWidth: 470 },
    { id: sid('cp', 2), label: '🎀 MEMBER', name: '회원 전용 무료배송권', link: '#',
      shape: 'badge', borderStyle: 'solid',
      labelColor: '#a855f7', nameColor: '#581c87', couponBgColor: '#ffffff', couponWidth: 470 },
  ],
};

// ════════════════════════════════════════════════════════════════
// 8. 🏠 모던 모노 — 미니멀 화이트, 가구·홈리빙
// ════════════════════════════════════════════════════════════════
const TPL_MODERN_MONO: CouponTemplate = {
  id: 'coupon-modern-mono',
  name: '🏠 모던 모노',
  description: '미니멀·가구·홈리빙·라이프스타일',
  bgColor: '#fafaf9',
  thumbnail: `<svg viewBox="0 0 100 60" xmlns="http://www.w3.org/2000/svg">
    <rect width="100" height="60" fill="#fafaf9"/>
    <text x="50" y="14" text-anchor="middle" fill="#171717" font-size="7" font-weight="700">SPECIAL OFFER</text>
    <rect x="14" y="22" width="72" height="14" rx="0" fill="#fff" stroke="#171717" stroke-width="0.5"/>
    <text x="50" y="32" text-anchor="middle" fill="#171717" font-size="5" font-weight="600">10% OFF</text>
    <rect x="14" y="40" width="72" height="14" rx="0" fill="#fff" stroke="#171717" stroke-width="0.5"/>
    <text x="50" y="50" text-anchor="middle" fill="#171717" font-size="5" font-weight="600">FREE SHIP</text>
  </svg>`,
  texts: [
    {
      id: sid('text', 1),
      text: 'Special Offer',
      position: { x: 230, y: 38 },
      style: { color: '#171717', fontSize: 32, fontWeight: 700, textAlign: 'center', width: 340, letterSpacing: 1 },
    },
    {
      id: sid('text', 2),
      text: 'thoughtful living, everyday',
      position: { x: 220, y: 88 },
      style: { color: '#737373', fontSize: 14, fontWeight: 400, textAlign: 'center', width: 360, letterSpacing: 2 },
    },
  ],
  coupons: [
    { id: sid('cp', 1), label: 'WELCOME', name: '신규 회원 10% 할인', link: '#',
      shape: 'classic', borderStyle: 'solid',
      labelColor: '#171717', nameColor: '#262626', couponBgColor: '#ffffff', couponWidth: 500 },
    { id: sid('cp', 2), label: 'FREE SHIPPING', name: '7만원 이상 구매시 무료배송', link: '#',
      shape: 'classic', borderStyle: 'solid',
      labelColor: '#171717', nameColor: '#262626', couponBgColor: '#ffffff', couponWidth: 500 },
  ],
};

// ════════════════════════════════════════════════════════════════
// 9. 📜 빈티지 세피아 — 따뜻한 베이지/브라운, 클래식·아날로그
// ════════════════════════════════════════════════════════════════
const TPL_VINTAGE_SEPIA: CouponTemplate = {
  id: 'coupon-vintage-sepia',
  name: '📜 빈티지 세피아',
  description: '클래식 베이지·브라운, 카페·도서·라이프스타일',
  bgColor: '#f5ebd9',
  bgGradient: 'linear-gradient(135deg, #f5ebd9 0%, #e7d4b3 100%)',
  thumbnail: `<svg viewBox="0 0 100 60" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="vs-bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f5ebd9"/><stop offset="1" stop-color="#e7d4b3"/></linearGradient></defs>
    <rect width="100" height="60" fill="url(#vs-bg)"/>
    <text x="50" y="14" text-anchor="middle" fill="#5b3a1e" font-size="6" font-weight="700" letter-spacing="2">SINCE 2015</text>
    <rect x="14" y="22" width="72" height="14" rx="2" fill="#fff8eb" stroke="#5b3a1e"/>
    <text x="50" y="32" text-anchor="middle" fill="#5b3a1e" font-size="5" font-weight="700">15% OFF</text>
    <rect x="14" y="40" width="72" height="14" rx="2" fill="#fff8eb" stroke="#5b3a1e"/>
    <text x="50" y="50" text-anchor="middle" fill="#5b3a1e" font-size="5" font-weight="700">FREE GIFT</text>
  </svg>`,
  texts: [
    { id: sid('text', 1), text: 'Heritage Sale', position: { x: 200, y: 36 },
      style: { color: '#5b3a1e', fontSize: 34, fontWeight: 800, textAlign: 'center', width: 400, letterSpacing: 2 } },
    { id: sid('text', 2), text: '오래도록 사랑받는 클래식 혜택', position: { x: 180, y: 88 },
      style: { color: '#8b5a2b', fontSize: 14, fontWeight: 500, textAlign: 'center', width: 440, letterSpacing: 1 } },
  ],
  coupons: [
    { id: sid('cp', 1), label: 'HERITAGE', name: '단골 회원 15% 즉시할인', link: '#',
      shape: 'classic', borderStyle: 'solid',
      labelColor: '#5b3a1e', nameColor: '#3e2811', couponBgColor: '#fff8eb', couponWidth: 470 },
    { id: sid('cp', 2), label: 'GIFT', name: '구매 시 빈티지 엽서 동봉', link: '#',
      shape: 'classic', borderStyle: 'solid',
      labelColor: '#5b3a1e', nameColor: '#3e2811', couponBgColor: '#fff8eb', couponWidth: 470 },
  ],
};

// ════════════════════════════════════════════════════════════════
// 10. 🌃 사이버 네온 — 다크 + 네온 컬러, 게이밍·테크·MZ
// ════════════════════════════════════════════════════════════════
const TPL_CYBER_NEON: CouponTemplate = {
  id: 'coupon-cyber-neon',
  name: '🌃 사이버 네온',
  description: '다크 + 네온 그라데이션, 테크·게이밍·디지털',
  bgColor: '#0a0a1f',
  bgGradient: 'linear-gradient(135deg, #0a0a1f 0%, #1a0a2e 50%, #0a1f1f 100%)',
  thumbnail: `<svg viewBox="0 0 100 60" xmlns="http://www.w3.org/2000/svg">
    <rect width="100" height="60" fill="#0a0a1f"/>
    <text x="50" y="14" text-anchor="middle" fill="#22d3ee" font-size="7" font-weight="900">CYBER DROP</text>
    <rect x="14" y="22" width="72" height="14" rx="2" fill="#0f1923" stroke="#22d3ee"/>
    <text x="50" y="32" text-anchor="middle" fill="#22d3ee" font-size="5" font-weight="800">35% OFF</text>
    <rect x="14" y="40" width="72" height="14" rx="2" fill="#0f1923" stroke="#f472b6"/>
    <text x="50" y="50" text-anchor="middle" fill="#f472b6" font-size="5" font-weight="800">FLASH 10K</text>
  </svg>`,
  texts: [
    { id: sid('text', 1), text: 'CYBER DROP', position: { x: 200, y: 32 },
      style: { color: '#22d3ee', fontSize: 42, fontWeight: 900, textAlign: 'center', width: 400, letterSpacing: 2, textShadow: '0 0 20px rgba(34,211,238,0.7)' } },
    { id: sid('text', 2), text: '⚡ 한정 수량 · 코드 입력 즉시 적용', position: { x: 180, y: 90 },
      style: { color: '#f472b6', fontSize: 14, fontWeight: 600, textAlign: 'center', width: 440, letterSpacing: 1 } },
  ],
  coupons: [
    { id: sid('cp', 1), label: '⚡ CYBER35', name: '전 상품 35% 즉시할인', link: '#',
      shape: 'classic', borderStyle: 'solid',
      labelColor: '#22d3ee', nameColor: '#e0f2fe', couponBgColor: '#0f1923', couponWidth: 470 },
    { id: sid('cp', 2), label: '💖 FLASH10K', name: '깜짝 10,000원 즉시할인', link: '#',
      shape: 'classic', borderStyle: 'solid',
      labelColor: '#f472b6', nameColor: '#fce7f3', couponBgColor: '#0f1923', couponWidth: 470 },
  ],
};

// ════════════════════════════════════════════════════════════════
// 11. 🌸 소프트 파스텔 — 부드러운 크림/핑크, 패션·뷰티·키즈
// ════════════════════════════════════════════════════════════════
const TPL_SOFT_PASTEL_CREAM: CouponTemplate = {
  id: 'coupon-soft-pastel-cream',
  name: '🌸 소프트 파스텔',
  description: '부드러운 크림/핑크, 패션·뷰티·키즈·플로럴',
  bgColor: '#fff5f5',
  bgGradient: 'linear-gradient(135deg, #fff5f5 0%, #ffe4e1 60%, #fde2ff 100%)',
  thumbnail: `<svg viewBox="0 0 100 60" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="sp-bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff5f5"/><stop offset="1" stop-color="#fde2ff"/></linearGradient></defs>
    <rect width="100" height="60" fill="url(#sp-bg)"/>
    <text x="50" y="14" text-anchor="middle" fill="#d946a8" font-size="6" font-weight="800">SWEET DAYS</text>
    <rect x="14" y="22" width="72" height="14" rx="7" fill="#ffffff"/>
    <text x="50" y="32" text-anchor="middle" fill="#d946a8" font-size="5" font-weight="700">20% OFF</text>
    <rect x="14" y="40" width="72" height="14" rx="7" fill="#ffffff"/>
    <text x="50" y="50" text-anchor="middle" fill="#d946a8" font-size="5" font-weight="700">+SAMPLES</text>
  </svg>`,
  texts: [
    { id: sid('text', 1), text: 'Sweet Days 🌸', position: { x: 200, y: 34 },
      style: { color: '#d946a8', fontSize: 36, fontWeight: 800, textAlign: 'center', width: 400, letterSpacing: -0.5 } },
    { id: sid('text', 2), text: '오늘만큼은 나에게 달콤한 혜택을', position: { x: 180, y: 88 },
      style: { color: '#e879c0', fontSize: 14, fontWeight: 500, textAlign: 'center', width: 440 } },
  ],
  coupons: [
    { id: sid('cp', 1), label: '🌷 SWEET20', name: '오늘 하루 전 상품 20% 할인', link: '#',
      shape: 'badge', borderStyle: 'none',
      labelColor: '#d946a8', nameColor: '#86195e', couponBgColor: '#ffffff', couponWidth: 470 },
    { id: sid('cp', 2), label: '✨ SAMPLES', name: '구매 시 시그니처 샘플 3종 증정', link: '#',
      shape: 'badge', borderStyle: 'none',
      labelColor: '#d946a8', nameColor: '#86195e', couponBgColor: '#ffffff', couponWidth: 470 },
  ],
};

// ────────────────────────────────────────────────────────────────
export const COUPON_TEMPLATES: CouponTemplate[] = [
  TPL_SPRING_COUPON,
  TPL_DARK_DEAL,
  TPL_LUXURY_GOLD,
  TPL_NATURAL_MINT,
  TPL_CLASSIC_TICKET,
  TPL_OCEAN_BLUE,
  TPL_VIVID_POP,
  TPL_MODERN_MONO,
  TPL_VINTAGE_SEPIA,
  TPL_CYBER_NEON,
  TPL_SOFT_PASTEL_CREAM,
];

export const getCouponTemplateById = (id: string): CouponTemplate | undefined =>
  COUPON_TEMPLATES.find((t) => t.id === id);

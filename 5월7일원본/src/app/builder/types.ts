export interface TextStyle {
  color: string;
  fontSize: number;
  subFontSize?: number;
  fontWeight: string | number;
  textAlign?: 'left' | 'center' | 'right';
  letterSpacing?: number;
  /**
   * 라인 하이트.
   *  - 값이 4 미만이면 배수 (e.g. 1.2, 1.5)
   *  - 값이 4 이상이면 절대 픽셀 (e.g. 60, 100)
   * 렌더링 단에서 자동 분기 — DraggableText 및 main-visual 캡쳐 캔버스 참고.
   */
  lineHeight?: number;
  backgroundColor?: string;
  width?: number | 'auto';
  isPill?: boolean;
  isBadge?: boolean;
  badgeShape?: 'starburst' | 'circle' | 'hexagon';
  /** CSS font-family. 지정 없으면 전역 Pretendard. */
  fontFamily?: string;
  /** CSS text-shadow. e.g. "0 2px 10px #BCB29B" */
  textShadow?: string;
}

export interface TextItem {
  id: string;
  text: string;
  position: { x: number, y: number };
  style: TextStyle;
}

// ─────────────────────────────────────────────────────────────────
// 🎨 메인 비주얼 템플릿 시스템
// ─────────────────────────────────────────────────────────────────
//  템플릿은 "검증된 디자인 프리셋" — MD 가 선택하면 텍스트·스티커·배경이
//  한 번에 세팅됨. 텍스트와 스티커 위치/스타일은 고정이며, 변수
//  ({discount} 등) 만 폼으로 수정 가능하다.
// ─────────────────────────────────────────────────────────────────

/** 스티커 아이템 — 메인 비주얼 위에 얹는 그래픽 요소.
 *  · type='emoji'  : 이모지 1글자 (🌸 ⚡ ✨ 등) — 폰트로 그려서 가벼움
 *  · type='svg'    : 인라인 SVG 마크업 — 번개·별·뱃지 같은 커스텀 그래픽
 *  · type='discount' : 할인율 원형 뱃지 — `{discount}` 변수가 들어가는 핵심 스티커
 */
export interface StickerItem {
  id: string;
  type: 'emoji' | 'svg' | 'discount';
  /** type='emoji' → 이모지 글자, type='svg' → SVG markup, type='discount' → 사용 안 함 */
  content?: string;
  position: { x: number; y: number };
  /** 픽셀 크기 (정사각형 기준 한 변) */
  size: number;
  /** 회전 각도 (도) */
  rotation?: number;
  /** type='discount' 전용 스타일 */
  discountStyle?: {
    bgColor: string;       // 뱃지 배경 (예: rgba 그라데이션)
    textColor: string;     // 글자 색
    label: string;         // "UP TO" 같은 윗줄 라벨
    /** 본문은 `{discount}` 같은 변수 표현식 사용 가능 */
    valueTemplate: string; // 예: "{discount}%"
    fontSize: number;      // 본문 폰트 크기
    labelFontSize: number; // 윗줄 라벨 폰트 크기
    shape: 'circle' | 'square' | 'rounded';
  };
  /** type='svg' 전용: SVG 컨테이너에 적용할 추가 색상 변수
   *  templates.ts 의 svg 안에서 currentColor 로 참조 가능 */
  color?: string;
}

/** 템플릿 변수 — 사용자가 폼으로 수정 가능한 동적 값.
 *  텍스트나 스티커 안의 `{varName}` 표현식이 이 값으로 치환된다. */
export interface TemplateVar {
  /** 변수 키 (예: 'discount', 'startDate') */
  key: string;
  /** 폼 라벨 */
  label: string;
  /** 입력 타입 */
  type: 'number' | 'text' | 'date';
  /** 기본값 */
  defaultValue: string | number;
  /** number 일 때 최소/최대 */
  min?: number;
  max?: number;
  /** 도움말 (placeholder) */
  hint?: string;
}

export interface CouponItem {
  id: string;
  label?: string;
  name: string;
  link: string;
  labelColor?: string;
  nameColor?: string;
  couponBgColor?: string;
  couponWidth?: number;
  /** 쿠폰 카드 형태 — 'classic'(기본 사각), 'ticket'(티켓 모양), 'badge'(둥근 뱃지) */
  shape?: 'classic' | 'ticket' | 'badge';
  /** 카드 그라데이션 (단색 대신 사용) */
  gradient?: string;
  /** 보더 스타일 — 'dashed' | 'solid' | 'none' */
  borderStyle?: 'dashed' | 'solid' | 'none';
  /** 강조 아이콘 (이모지) — 카드 앞쪽에 큰 그래픽으로 표시 */
  icon?: string;
}

export interface ProductItem {
  id: string;
  name: string;
  /** 상품명 아래 표시되는 서브 설명 (선택사항). 짧은 카피·스펙·태그라인용 */
  subtitle?: string;
  discount: number;
  discountColor?: string;
  discountPosition?: 'left' | 'right';
  image: string;
  badge: 'none' | 'best' | 'new' | 'hot' | 'custom';
  badgeLabel?: string;
  badgeColor?: string;
  badgePosition?: 'left' | 'right';
  /** 상품명 글자 크기 (px) — 미지정 시 기본 16 */
  nameFontSize?: number;
  /** 상품명 글자 색상 — 미지정 시 배경에 따라 자동 (다크 배경=밝은 글씨) */
  nameColor?: string;
  /** 서브 설명 글자 크기 (px) — 미지정 시 기본 13 */
  subtitleFontSize?: number;
  /** 서브 설명 글자 색상 — 미지정 시 배경에 따라 자동 */
  subtitleColor?: string;
}

export type SectionData = 
  | { type: 'main'; id: string; bgImage: string; texts: TextItem[];
      /** 적용된 템플릿 ID (없으면 빈 캔버스) */
      templateId?: string;
      /** 메인 비주얼 위에 얹는 스티커 (할인율 뱃지·이모지·SVG 그래픽) */
      stickers?: StickerItem[];
      /** 템플릿 변수 값 (예: { discount: 40, startDate: '04.23' }) */
      templateVars?: Record<string, string | number>;
    }
  | { type: 'coupon'; id: string; bgColor: string; bgImage: string; coupons: CouponItem[]; texts: TextItem[];
      /** 적용된 쿠폰 템플릿 ID */
      templateId?: string;
      /** 배경 그라데이션 (templateId 적용 시) */
      bgGradient?: string;
      /** 쿠폰 영역에 얹히는 장식 스티커 */
      stickers?: StickerItem[];
    }
  | { type: 'product'; id: string; layout: 'uniform'|'featured'; columns: 1|2|3;
      paddingTop?: number; paddingBottom?: number;
      products: ProductItem[]; texts: TextItem[];
      /** 적용된 상품 템플릿 ID */
      templateId?: string;
      /** 상품 영역 배경 (단색 또는 그라데이션) */
      bgColor?: string;
      bgGradient?: string;
      /** 상품 영역에 얹히는 장식 스티커 (옵션) */
      stickers?: StickerItem[];
    };

export function createDefaultSection(type: 'main' | 'coupon' | 'product'): SectionData {
  const id = Date.now().toString();
  if (type === 'main') {
    return {
      type,
      id,
      bgImage: '',
      texts: [],
      stickers: [],
      templateVars: {},
    };
  } else if (type === 'coupon') {
    // 빈 쿠폰 섹션 — MD 가 우측 패널에서 템플릿을 골라야 실제 디자인이 채워짐
    return {
      type, id,
      bgColor: '#ffffff',
      bgImage: '',
      coupons: [],
      texts: [],
      stickers: [],
    };
  } else {
    // 빈 상품 섹션 — 템플릿 선택 후 상품 추가
    return {
      type, id,
      layout: 'uniform',
      columns: 2,
      products: [],
      texts: [],
      stickers: [],
    };
  }
}

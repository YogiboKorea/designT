export interface TextStyle {
  color: string;
  fontSize: number;
  fontWeight: string | number;
  textAlign?: 'left' | 'center' | 'right';
  letterSpacing?: number;
  lineHeight?: number;
  backgroundColor?: string;
  width?: number | 'auto';
  isPill?: boolean;
}

export interface TextItem {
  id: string;
  text: string;
  position: { x: number, y: number };
  style: TextStyle;
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
}

export interface ProductItem {
  id: string;
  name: string;
  discount: number;
  discountColor?: string;
  discountPosition?: 'left' | 'right';
  image: string;
  badge: 'none' | 'best' | 'new' | 'hot' | 'custom';
  badgeLabel?: string;
  badgeColor?: string;
  badgePosition?: 'left' | 'right';
}

export type SectionData = 
  | { type: 'main'; id: string; bgImage: string; texts: TextItem[] }
  | { type: 'coupon'; id: string; bgColor: string; bgImage: string; coupons: CouponItem[]; texts: TextItem[] }
  | { type: 'product'; id: string; layout: 'uniform'|'featured'; columns: 1|2|3; paddingTop?: number; paddingBottom?: number; products: ProductItem[]; texts: TextItem[] };

export function createDefaultSection(type: 'main' | 'coupon' | 'product'): SectionData {
  const id = Date.now().toString();
  if (type === 'main') {
    return { 
      type, 
      id, 
      bgImage: '', 
      texts: [
      ] 
    };
  } else if (type === 'coupon') {
    return { 
      type, id, bgColor: '#ffedf3', bgImage: '', 
      coupons: [{ id: Date.now().toString(), label: '🎟️ SPECIAL COUPON', name: '전 제품 10% OFF', link: '#' }],
      texts: [
        { id: Date.now().toString() + 't1', text: '스프링 쿠폰팩', position: { x: 230, y: 40 }, style: { color: '#ec4899', fontSize: 36, fontWeight: 800, textAlign: 'center' } },
        { id: Date.now().toString() + 't2', text: '화사한 봄날, 우리 집을 위한 완벽한 휴식 솔루션', position: { x: 190, y: 100 }, style: { color: '#f472b6', fontSize: 18, fontWeight: 500, textAlign: 'center' } }
      ]
    };
  } else {
    return { 
      type, id, layout: 'uniform', columns: 2, 
      products: [
        { id: Date.now().toString() + '1', name: '요기보 슬림', discount: 20, image: '', badge: 'best' },
        { id: Date.now().toString() + '2', name: '요기보 미디', discount: 20, image: '', badge: 'none' }
      ],
      texts: [
        { id: Date.now().toString() + 't1', text: '형제/자매/남매와 함께', position: { x: 250, y: 30 }, style: { color: '#ffffff', backgroundColor: '#c7b8a5', fontSize: 17, fontWeight: 700, isPill: true, textAlign: 'center' } }
      ]
    };
  }
}

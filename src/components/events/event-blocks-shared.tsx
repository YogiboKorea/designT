'use client';
import React from 'react';
import { BlockOutlined } from '@ant-design/icons';

export const escapeHtml = (s = '') =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function getYouTubeId(input: string | null | undefined): string | null {
  if (!input) return null;
  if (/^[\w-]{11}$/.test(input)) return input;
  try {
    const url = new URL(input.trim());
    const host = url.hostname.replace('www.', '');
    if (host === 'youtu.be') return url.pathname.slice(1);
    if (host.includes('youtube.com')) {
      if (url.searchParams.get('v')) return url.searchParams.get('v');
      const m = url.pathname.match(/\/(embed|shorts)\/([\w-]{11})/);
      if (m) return m[2];
    }
  } catch {
    // ignore
  }
  return null;
}

export const buildYouTubeSrc = (id: string, autoplay = false, loop = false) => {
  const params = new URLSearchParams({
    autoplay: autoplay ? '1' : '0',
    mute: autoplay ? '1' : '0',
    playsinline: '1',
    rel: '0',
    modestbranding: '1',
    enablejsapi: '1',
  });
  if (loop) {
    params.set('loop', '1');
    params.set('playlist', id);
  }
  return `https://www.youtube.com/embed/${id}?${params.toString()}`;
};

export function YouTubeEmbed({
  id,
  ratioW = 16,
  ratioH = 9,
  title = 'YouTube video',
  autoplay = false,
  loop = false,
}: {
  id: string;
  ratioW?: number;
  ratioH?: number;
  title?: string;
  autoplay?: boolean;
  loop?: boolean;
}) {
  const src = buildYouTubeSrc(id, autoplay, loop);
  return (
    <div style={{ width: '100%', maxWidth: 800, margin: '0 auto' }}>
      <div style={{ position: 'relative', width: '100%', aspectRatio: `${ratioW} / ${ratioH}` }}>
        <iframe
          src={src}
          title={title}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
      </div>
    </div>
  );
}

export interface ProductIcon {
  icon_url?: string;
  icon_alt?: string;
}

export interface ProductLite {
  product_no?: number | string;
  product_name?: string;
  eng_product_name?: string;
  summary_description?: string;
  simple_description?: string;
  list_image?: string;
  image_medium?: string | null;
  image_small?: string | null;
  tiny_image?: string | null;
  detail_image?: string | null;
  price?: number | string;
  sale_price?: number | string | null;
  benefit_price?: number | string | null;
  decoration_icon_url?: string | null;
  icons?: Record<string, string | null | undefined> | null;
  additional_icons?: ProductIcon[];
}

export interface RenderGridOptions {
  /**
   * 이벤트 전체에 적용된 쿠폰 최대 할인율(%). 상품 자체 데이터(sale_price/benefit_price)가
   * 비어 있을 때 placeholder 카드에 fallback 으로만 표시. 실제 라이브 위젯은 상품별
   * benefit_price 를 사용하므로 admin 도 그쪽을 우선한다.
   */
  discountPercent?: number;
}

const PRETENDARD_STACK = "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";

const parseNumber = (v: unknown): number | null => {
  if (v == null) return null;
  if (typeof v === 'number' && isFinite(v)) return v;
  const n = parseFloat(String(v).replace(/[^\d.-]/g, ''));
  return isFinite(n) ? n : null;
};

const formatKRW = (val: number) => `${(Number(val) || 0).toLocaleString('ko-KR')}원`;

// 라이브 widget.js renderProducts 와 1:1 매칭되는 admin 미리보기 카드.
// per-product sale_price / benefit_price 를 그대로 사용해서 라이브와 동일한 가격/뱃지를 보여준다.
// 데이터가 없는 placeholder 카드에 한해 RenderGridOptions.discountPercent fallback 적용.
export function renderGrid(cols: number, products: ProductLite[] = [], opts: RenderGridOptions = {}) {
  const safeCols = Math.max(1, Math.min(4, Number(cols) || 2));
  const placeholderCount = safeCols === 1 ? 1 : Math.min(safeCols * safeCols, 4);
  const itemsToRender: (ProductLite | undefined)[] = products.length > 0
    ? (safeCols === 1 ? products.slice(0, 1) : products)
    : Array.from({ length: placeholderCount });

  const containerMaxWidth = safeCols === 1 ? 400 : 800;
  const fallbackPct = Math.max(0, Math.min(100, Number(opts.discountPercent) || 0));

  // 위젯과 동일한 시각 사이즈. 카드 폰트는 cols 와 무관 (위젯과 동일).
  const cardFont = {
    sub: 11,
    name: 16,
    original: 10,
    final: 16,
    percent: 13,
  };

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${safeCols},1fr)`,
        gap: 24,
        maxWidth: containerMaxWidth,
        margin: '24px auto',
        fontFamily: PRETENDARD_STACK,
      }}
    >
      {itemsToRender.map((p, i) => {
        const product = p || ({} as ProductLite);
        const subText = product.eng_product_name || product.summary_description || product.simple_description || '';
        const origPrice = parseNumber(product.price);
        const salePrice = parseNumber(product.sale_price);
        const benefitPrice = parseNumber(product.benefit_price);
        const isSale = origPrice != null && salePrice != null && salePrice < origPrice;
        const isCoupon = benefitPrice != null && origPrice != null && benefitPrice < (isSale ? (salePrice as number) : origPrice);

        let displayPercent: number | null = null;
        if (isCoupon && origPrice != null) {
          const base = isSale ? (salePrice as number) : origPrice;
          if (base > 0 && (benefitPrice as number) >= 0) {
            displayPercent = Math.round((base - (benefitPrice as number)) / base * 100);
          }
        } else if (isSale && origPrice != null && origPrice > 0) {
          displayPercent = Math.round((origPrice - (salePrice as number)) / origPrice * 100);
        }
        // 데이터 없는 placeholder + 이벤트 쿠폰이 있는 경우 fallback 으로만 표시.
        const isPlaceholder = !product.product_no;
        if (isPlaceholder && fallbackPct > 0 && origPrice == null) {
          displayPercent = fallbackPct;
        }

        const finalPrice =
          isCoupon && benefitPrice != null ? formatKRW(benefitPrice as number)
          : isSale && salePrice != null ? formatKRW(salePrice as number)
          : origPrice != null ? formatKRW(origPrice)
          : '';
        const showOriginal = (isSale || isCoupon) && origPrice != null;

        const thumbImg = product.image_medium || product.list_image;

        // 데코 아이콘 — widget 과 동일한 우선순위로 중복 제거.
        const renderedUrls = new Set<string>();
        const iconImgs: { url: string; alt: string }[] = [];
        if (product.decoration_icon_url && !renderedUrls.has(product.decoration_icon_url)) {
          iconImgs.push({ url: product.decoration_icon_url, alt: 'icon' });
          renderedUrls.add(product.decoration_icon_url);
        }
        (product.additional_icons || []).forEach((icon) => {
          if (icon?.icon_url && !renderedUrls.has(icon.icon_url)) {
            iconImgs.push({ url: icon.icon_url, alt: icon.icon_alt || '아이콘' });
            renderedUrls.add(icon.icon_url);
          }
        });
        if (product.icons && typeof product.icons === 'object') {
          (['icon_new', 'icon_recom', 'icon_best', 'icon_sale'] as const).forEach((key) => {
            const url = product.icons?.[key];
            if (url && !renderedUrls.has(url)) {
              iconImgs.push({ url, alt: key.replace('icon_', '') });
              renderedUrls.add(url);
            }
          });
        }

        const percentText = displayPercent && displayPercent > 0 ? `${displayPercent}%` : '';

        return (
          <div key={product.product_no || i} style={{ overflow: 'hidden', background: '#fff' }}>
            {/* 이미지 영역 — 둥근 모서리 + 데코 아이콘 absolute 컨테이너 */}
            <div
              style={{
                position: 'relative',
                aspectRatio: '1 / 1',
                background: '#f8f9fa',
                overflow: 'hidden',
                borderRadius: 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {thumbImg ? (
                <img
                  src={thumbImg}
                  alt={product.product_name || ''}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              ) : (
                <BlockOutlined style={{ fontSize: 40, color: '#d9d9d9' }} />
              )}
              {iconImgs.length > 0 && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: 12,
                    right: 12,
                    display: 'flex',
                    gap: 4,
                    zIndex: 2,
                    pointerEvents: 'none',
                  }}
                >
                  {iconImgs.map((ic, idx) => (
                    <img key={idx} src={ic.url} alt={ic.alt} style={{ width: '100%', maxWidth: 40, height: 'auto', display: 'block' }} />
                  ))}
                </div>
              )}
            </div>

            {/* 영문/요약 — 민트색 sub 텍스트 */}
            {subText && (
              <div
                style={{
                  fontSize: cardFont.sub,
                  color: '#ABB0BA',
                  marginTop: 12,
                  lineHeight: 1.3,
                  letterSpacing: '-0.03em',
                }}
              >
                {subText}
              </div>
            )}

            {/* 한글 상품명 */}
            <div
              style={{
                display: 'inline-block',
                fontSize: cardFont.name,
                color: '#090909',
                fontWeight: 400,
                marginTop: 5,
                lineHeight: 1.3,
                letterSpacing: '-0.03em',
                width: '100%',
              }}
            >
              {product.product_name || (isPlaceholder ? `상품명 ${i + 1}` : '')}
            </div>

            {/* 가격 영역 — 쿠폰/할인 시 정가(취소선) 윗줄 + 뱃지/최종가 아랫줄 */}
            {(origPrice != null || isPlaceholder) && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  marginTop: 10,
                  flexWrap: 'wrap',
                }}
              >
                {showOriginal && origPrice != null && (
                  <span
                    style={{
                      order: 1,
                      width: '100%',
                      textAlign: 'right',
                      color: '#CACFD8',
                      fontSize: cardFont.original,
                      fontWeight: 400,
                      textDecoration: 'line-through',
                      marginTop: 5,
                    }}
                  >
                    {formatKRW(origPrice)}
                  </span>
                )}
                {percentText && (
                  <span
                    style={{
                      order: 2,
                      background: '#06BEDE',
                      color: '#fff',
                      width: 48,
                      height: 20,
                      lineHeight: '20px',
                      textAlign: 'center',
                      fontWeight: 700,
                      fontSize: cardFont.percent,
                      borderRadius: 50,
                    }}
                  >
                    {percentText}
                  </span>
                )}
                <span
                  style={{
                    order: 3,
                    marginLeft: 'auto',
                    fontSize: cardFont.final,
                    fontWeight: 400,
                    color: '#090909',
                  }}
                >
                  {finalPrice}
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// 이벤트 블록 공통 데이터 타입
export interface RegionItem {
  id?: string;
  _id?: string;
  xRatio: number;
  yRatio: number;
  wRatio: number;
  hRatio: number;
  href?: string;
  coupon?: string;
  /**
   * 이벤트 페이지 내 탭으로 이동하는 영역.
   * widget.js 가 클릭 시 해당 product_group 블록의 i 번째 탭을 활성화하고 스크롤.
   * href / coupon 과 상호 배타적.
   */
  tabTarget?: { blockId: string; tabIndex: number };
}

export interface EventBlock {
  id: string;
  _id?: string;
  type: 'image' | 'video' | 'text' | 'product_group' | 'event_notice';
  // image
  src?: string;
  file?: File;
  hash?: string;
  regions?: RegionItem[];
  // event_notice — 클릭 시 슬라이드 다운으로 펼쳐지는 유의사항 토글
  noticeImage?: string;     // 영구 cafe24 FTP URL
  noticeImageFile?: File;   // 저장 직전까지 임시
  noticeText?: string;      // 본문 (여러 줄)
  noticeTitle?: string;     // 토글 버튼에 표시될 제목 (기본: "이벤트 유의사항")
  // video
  youtubeId?: string;
  ratio?: { w?: number; h?: number };
  autoplay?: boolean;
  loop?: boolean;
  // text
  text?: string;
  style?: {
    align?: 'left' | 'center' | 'right';
    fontSize?: number;
    fontWeight?: 'normal' | 'bold' | number;
    color?: string;
    mt?: number;
    mb?: number;
  };
  // product_group
  registerMode?: 'direct' | 'category' | 'none';
  /** 단품 모드 그리드 (1×1, 2×2, 3×3, 4×4). 탭 모드에서는 기본/fallback 값으로 사용. */
  gridSize?: number;
  /** 탭 모드에서 탭별로 다른 그리드 사이즈를 지정. 없으면 gridSize 사용. */
  tabGridSizes?: Record<number, number>;
  layoutType?: 'single' | 'tabs';
  root?: string;
  sub?: string;
  tabs?: Array<{ title: string; root: string | null; sub: string | null }>;
  /** 탭 헤더 한 줄에 몇 개씩 배치할지. undefined/null/0 이면 자동(전체 한 줄). 2면 2개씩 줄바꿈, 3이면 3개씩. */
  tabsPerRow?: number;
  activeColor?: string;
  directProducts?: ProductLite[];
  tabDirectProducts?: Record<number, ProductLite[]>;
}

export interface CategoryItem {
  category_no: number | string;
  category_name: string;
  category_depth: number;
  parent_category_no?: number | string;
}

export interface CouponOption {
  value: string;
  label: string;
  discountPercent?: number;
}

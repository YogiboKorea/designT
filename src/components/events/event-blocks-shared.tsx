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

export interface ProductLite {
  product_no?: number | string;
  product_name?: string;
  eng_product_name?: string;
  summary_description?: string;
  simple_description?: string;
  list_image?: string;
  price?: number | string;
  sale_price?: number | string | null;
  benefit_price?: number | string | null;
}

export interface RenderGridOptions {
  discountPercent?: number;
}

export function renderGrid(cols: number, products: ProductLite[] = [], opts: RenderGridOptions = {}) {
  const safeCols = Math.max(1, Math.min(4, Number(cols) || 2));
  // 1×1 은 단일 상품 중앙 노출 — placeholder 도 1 개만
  const placeholderCount = safeCols === 1 ? 1 : Math.min(safeCols * safeCols, 4);
  const itemsToRender = products.length > 0
    ? (safeCols === 1 ? products.slice(0, 1) : products)
    : Array.from({ length: placeholderCount });
  // 1×1 은 큰 폰트, 다른 cols 은 cols 비례
  const titleFontSize = safeCols === 1 ? '20px' : `${18 - safeCols}px`;
  const subFontSize = safeCols === 1 ? '14px' : `${14 - safeCols}px`;
  const priceFontSize = safeCols === 1 ? '20px' : `${17 - safeCols}px`;
  const discountPercent = Math.max(0, Math.min(100, Number(opts.discountPercent) || 0));
  // 1×1 은 폭을 좁혀 중앙 배치
  const containerMaxWidth = safeCols === 1 ? 400 : 800;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${safeCols},1fr)`, gap: 16, maxWidth: containerMaxWidth, margin: '24px auto' }}>
      {itemsToRender.map((p, i) => {
        const product = (p as ProductLite) || {};
        const engName = product.eng_product_name || product.summary_description || product.simple_description || '';
        const original = product.price != null ? Number(product.price) : null;
        const discounted = original != null && discountPercent > 0
          ? Math.round(original * (1 - discountPercent / 100))
          : null;
        return (
          <div key={product.product_no || i} style={{ overflow: 'hidden', background: '#fff' }}>
            <div style={{ aspectRatio: '1 / 1', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8f9fa' }}>
              {product.list_image ? (
                <img src={product.list_image} alt={product.product_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <BlockOutlined style={{ fontSize: 40, color: '#d9d9d9' }} />
              )}
            </div>
            <div style={{ padding: 10, minHeight: 90 }}>
              {engName && (
                <div style={{ fontSize: subFontSize, color: '#888', lineHeight: 1.2, marginBottom: 2 }}>
                  {engName}
                </div>
              )}
              <div style={{ fontWeight: 500, fontSize: titleFontSize, lineHeight: 1.2 }}>
                {product.product_name || `상품명 ${i + 1}`}
              </div>
              {original != null && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                  {discounted != null ? (
                    <>
                      <span style={{ background: '#4FC3D7', color: '#fff', padding: '2px 8px', borderRadius: 12, fontSize: `${12 - Math.max(safeCols - 2, 0)}px`, fontWeight: 600, lineHeight: 1 }}>
                        {discountPercent}%
                      </span>
                      <span style={{ color: '#999', textDecoration: 'line-through', fontSize: `${13 - Math.max(safeCols - 2, 0)}px` }}>
                        {original.toLocaleString()}원
                      </span>
                      <span style={{ fontWeight: 'bold', fontSize: priceFontSize, color: '#111' }}>
                        {discounted.toLocaleString()}원
                      </span>
                    </>
                  ) : (
                    <span style={{ fontWeight: 'bold', fontSize: priceFontSize }}>
                      {original.toLocaleString()}원
                    </span>
                  )}
                </div>
              )}
            </div>
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
}

export interface EventBlock {
  id: string;
  _id?: string;
  type: 'image' | 'video' | 'text' | 'product_group';
  // image
  src?: string;
  file?: File;
  hash?: string;
  regions?: RegionItem[];
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

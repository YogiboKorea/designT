'use client';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { App as AntdApp, Card, Button, Space, Modal, Input, Alert } from 'antd';
import { UnorderedListOutlined, CodeOutlined, CopyOutlined, EditOutlined, BlockOutlined } from '@ant-design/icons';
import { useRouter, useParams } from 'next/navigation';
import cafe24Api, { CAFE24_API_HOST } from '@/lib/cafe24-api';
import { useMallId } from '@/lib/use-mall-id';
import AppShell from '@/components/AppShell';

const escapeHtml = (s = '') => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const buildYouTubeSrc = (id: string, autoplay = false, loop = false) => {
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

function YouTubeEmbed({
  id, ratioW = 16, ratioH = 9, title = 'YouTube video', autoplay = false, loop = false,
}: { id: string; ratioW?: number; ratioH?: number; title?: string; autoplay?: boolean; loop?: boolean }) {
  const src = buildYouTubeSrc(id, autoplay, loop);
  return (
    <div style={{ width: '100%', maxWidth: 800, margin: '0 auto', marginBottom: 8 }}>
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

interface ProductLite {
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

function renderGrid(cols: number, products: ProductLite[] = [], opts: { discountPercent?: number } = {}) {
  const safeCols = Math.max(1, Math.min(4, Number(cols) || 2));
  const placeholderCount = safeCols === 1 ? 1 : Math.min(safeCols * safeCols, 4);
  const itemsToRender = products.length > 0
    ? (safeCols === 1 ? products.slice(0, 1) : products)
    : Array.from({ length: placeholderCount });
  const titleFontSize = safeCols === 1 ? '20px' : `${18 - safeCols}px`;
  const subFontSize = safeCols === 1 ? '14px' : `${14 - safeCols}px`;
  const priceFontSize = safeCols === 1 ? '20px' : `${17 - safeCols}px`;
  const discountPercent = Math.max(0, Math.min(100, Number(opts.discountPercent) || 0));
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
                      <span style={{ background: '#4FC3D7', color: '#fff', padding: '2px 8px', borderRadius: 12, fontSize: `${12 - Math.max(cols - 2, 0)}px`, fontWeight: 600, lineHeight: 1 }}>
                        {discountPercent}%
                      </span>
                      <span style={{ color: '#999', textDecoration: 'line-through', fontSize: `${13 - Math.max(cols - 2, 0)}px` }}>
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

interface RegionItem {
  id?: string;
  _id?: string;
  xRatio: number;
  yRatio: number;
  wRatio: number;
  hRatio: number;
  href?: string;
  coupon?: string;
}

interface Block {
  id?: string;
  _id?: string;
  type: 'image' | 'video' | 'text' | 'product_group';
  src?: string;
  regions?: RegionItem[];
  youtubeId?: string;
  autoplay?: boolean;
  loop?: boolean;
  ratio?: { w?: number; h?: number };
  text?: string;
  style?: { align?: string; mt?: number; mb?: number; fontSize?: number; fontWeight?: string | number; color?: string };
  layoutType?: 'single' | 'tabs';
  registerMode?: 'direct' | 'category' | 'none';
  tabs?: Array<{ title?: string }>;
  tabDirectProducts?: Record<number, ProductLite[]>;
  directProducts?: ProductLite[];
  gridSize?: number;
  tabGridSizes?: Record<number, number>;
  activeColor?: string;
}

interface EventData {
  _id: string;
  title?: string;
  // EventPage MongoDB 모델: blocks 배열을 sections 에 그대로 저장
  sections?: Block[];
  imageUrl?: string;
  // 이벤트 전체 적용 쿠폰 — widget.js 의 data-coupon-nos 로 전달되어
  // 상품 가격을 쿠폰 할인가(benefit_price) 로 표시.
  couponNos?: string[];
  // legacy fallback (기존 ychat 데이터 마이그레이션 대비)
  content?: { blocks?: Block[] };
  images?: Array<{ src: string; regions?: RegionItem[]; _id?: string; id?: string }>;
}

export default function EventDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const mallId = useMallId();
  const [event, setEvent] = useState<EventData | null>(null);
  const [htmlModalVisible, setHtmlModalVisible] = useState(false);
  const [htmlCode, setHtmlCode] = useState('');
  const [previewActiveTabs, setPreviewActiveTabs] = useState<Record<string, number>>({});
  const [couponDiscountMap, setCouponDiscountMap] = useState<Record<string, number>>({});
  const { message: messageApi } = AntdApp.useApp();

  // 미리보기에 적용할 최대 쿠폰 할인율(%) — 이벤트에 선택된 쿠폰 중 최대치 사용.
  const previewDiscountPercent = useMemo(() => {
    const nos = event?.couponNos || [];
    if (!nos.length) return 0;
    return Math.max(0, ...nos.map((no) => couponDiscountMap[no] || 0));
  }, [event?.couponNos, couponDiscountMap]);

  useEffect(() => {
    if (!mallId) return;
    cafe24Api
      .get(`/api/${mallId}/coupons`)
      .then((res) => {
        const map: Record<string, number> = {};
        (res.data || []).forEach((c: { coupon_no: string; benefit_percentage: number }) => {
          map[c.coupon_no] = Number(c.benefit_percentage) || 0;
        });
        setCouponDiscountMap(map);
      })
      .catch(() => {
        // 쿠폰 로드 실패 시 미리보기 할인 적용 안 됨 — 사이트 표시는 widget.js 가 책임
      });
  }, [mallId]);

  // 옛 이벤트에 저장된 directProducts 가 summary_description 을 안 가진 경우, 클라이언트가 detail 호출해서 보강.
  const enrichedRef = useRef(new Set<string>());
  useEffect(() => {
    if (!mallId || !event) return;
    const blocksToScan: Block[] =
      event.sections || event.content?.blocks || [];
    if (!blocksToScan.length) return;

    const missing: (string | number)[] = [];
    blocksToScan.forEach((b) => {
      if (b.type !== 'product_group' || b.registerMode !== 'direct') return;
      const list: ProductLite[] =
        b.layoutType === 'tabs'
          ? (Object.values(b.tabDirectProducts || {}).flat() as ProductLite[])
          : ((b.directProducts || []) as ProductLite[]);
      list.forEach((p) => {
        if (p && p.product_no != null && !p.summary_description) {
          const key = String(p.product_no);
          if (!enrichedRef.current.has(key)) missing.push(p.product_no);
        }
      });
    });

    if (missing.length === 0) return;
    const uniqueNos = Array.from(new Set(missing.map(String)));
    uniqueNos.forEach((no) => enrichedRef.current.add(no));

    Promise.all(
      uniqueNos.map((no) =>
        cafe24Api
          .get(`/api/${mallId}/products/${no}`)
          .then((res) => ({ no, data: res.data as Record<string, unknown> | null }))
          .catch(() => ({ no, data: null as Record<string, unknown> | null }))
      )
    ).then((results) => {
      const detailMap = new Map<string, Record<string, unknown>>();
      results.forEach((r) => {
        if (r.data) detailMap.set(r.no, r.data);
      });
      if (detailMap.size === 0) return;

      const fillProduct = (p: ProductLite): ProductLite => {
        if (!p || p.product_no == null || p.summary_description) return p;
        const d = detailMap.get(String(p.product_no));
        if (!d) return p;
        return { ...p, summary_description: (d.summary_description as string) || '' };
      };

      setEvent((prev) => {
        if (!prev) return prev;
        const nextSections = (prev.sections || []).map((b) => {
          if (b.type !== 'product_group' || b.registerMode !== 'direct') return b;
          if (b.layoutType === 'tabs') {
            const tabs = b.tabDirectProducts || {};
            const newTabs: Record<number, ProductLite[]> = {};
            Object.entries(tabs).forEach(([k, arr]) => {
              newTabs[Number(k)] = (arr || []).map(fillProduct);
            });
            return { ...b, tabDirectProducts: newTabs };
          }
          return { ...b, directProducts: (b.directProducts || []).map(fillProduct) };
        });
        return { ...prev, sections: nextSections };
      });
    });
  }, [event, mallId]);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/events/${id}`)
      .then((r) => r.json())
      .then((json) => {
        if (!json.success) throw new Error(json.message || '이벤트 로드 실패');
        setEvent(json.data);
      })
      .catch(() => {
        messageApi.error('이벤트 로드 실패');
        router.push('/events/list');
      });
  }, [id, router, messageApi]);

  const handleShowHtml = () => {
    if (!event) {
      messageApi.error('이벤트 데이터가 없습니다.');
      return;
    }
    // cafe24 자사몰 페이지 상단에 표준 레이아웃 import. widget.js 와 함께 항상 같이 들어가도록 자동 삽입.
    let html = `<!--@layout(/layout/basic/layout.html)-->\n\n`;
    html += `<div id="evt-root"></div>\n\n`;

    const allBlocks = event.sections || event.content?.blocks || [];
    // 1) 이미지 영역 클릭 시 다운로드되는 쿠폰
    const regionCoupons = allBlocks
      .flatMap((b) => (b.type === 'image' ? (b.regions || []).filter((r) => r.coupon).map((r) => r.coupon) : []))
      .filter(Boolean)
      .join(',')
      .split(',')
      .filter(Boolean);
    // 2) 이벤트에서 선택한 적용 쿠폰 (상품 가격에 영향)
    const eventCoupons = Array.isArray(event.couponNos) ? event.couponNos : [];
    const uniqueCoupons = [...new Set([...eventCoupons, ...regionCoupons])];

    const productTabBlock = allBlocks.find((b) => b.type === 'product_group' && b.layoutType === 'tabs');
    const totalTabCount = productTabBlock ? (productTabBlock.tabs || []).length : 0;
    const activeColor = productTabBlock ? productTabBlock.activeColor || '#1890ff' : '#1890ff';

    // 임베드 코드에서 widget.js 는 항상 라이브 ychat 서버에서 로드 — 로컬 dev 에서 코드를 복사해도 cafe24 가 정상 동작.
    // 이벤트/상품/카테고리/트래킹 모두 ychat 단일 배포(옵션 A) 사용.
    const widgetOrigin = CAFE24_API_HOST;
    html += `<script src="${widgetOrigin}/widget.js" data-mall-id="${mallId}" data-page-id="${id}" data-api-base="${CAFE24_API_HOST}" data-tab-count="${totalTabCount}" data-active-color="${activeColor}"${
      uniqueCoupons.length > 0 ? ` data-coupon-nos="${uniqueCoupons.join(',')}"` : ''
    }></script>\n`;

    setHtmlCode(html);
    setHtmlModalVisible(true);
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(htmlCode);
    messageApi.success('코드 복사 완료');
    setHtmlModalVisible(false);
  };

  if (!event) {
    return (
      <AppShell>
        <div style={{ padding: 24, textAlign: 'center', color: '#9ca3af' }}>불러오는 중…</div>
      </AppShell>
    );
  }

  const blocksToRender: Block[] =
    event.sections ||
    event.content?.blocks ||
    (event.images || []).map((img) => ({ type: 'image', ...img } as Block));

  return (
    <AppShell>
      <div style={{ padding: 24 }}>
        <Card
          title={event.title}
          extra={
            <Space>
              <Button icon={<UnorderedListOutlined />} onClick={() => router.push('/events/list')}>
                목록
              </Button>
              <Button icon={<EditOutlined />} onClick={() => router.push(`/events/edit/${id}`)}>
                수정
              </Button>
              <Button type="primary" icon={<CodeOutlined />} onClick={handleShowHtml}>
                HTML 코드
              </Button>
            </Space>
          }
        >
          <div style={{ maxWidth: 800, margin: '0 auto' }}>
            {blocksToRender.map((block) => {
              const blockId = block.id || block._id;
              switch (block.type) {
                case 'image':
                  return (
                    <div key={blockId} style={{ position: 'relative', width: '100%', marginBottom: 8 }}>
                      <img src={block.src} alt="이벤트 이미지" style={{ width: '100%' }} />
                      {(block.regions || []).map((r) => {
                        const isCoupon = !!r.coupon;
                        const style: React.CSSProperties = {
                          position: 'absolute',
                          left: `${r.xRatio * 100}%`,
                          top: `${r.yRatio * 100}%`,
                          width: `${r.wRatio * 100}%`,
                          height: `${r.hRatio * 100}%`,
                          border: `2px dashed ${isCoupon ? '#ff6347' : '#1890ff'}`,
                          cursor: 'pointer',
                          background: isCoupon ? 'rgba(255, 99, 71, 0.2)' : 'rgba(24, 144, 255, 0.2)',
                          display: 'flex',
                          alignItems: 'flex-start',
                          justifyContent: 'flex-start',
                        };
                        return (
                          <a
                            key={r.id || r._id}
                            href={isCoupon ? `#coupon-${r.coupon}` : r.href}
                            target={isCoupon ? '_self' : '_blank'}
                            rel="noreferrer"
                            style={style}
                          >
                            <span
                              style={{
                                background: isCoupon ? '#ff6347' : '#1890ff',
                                color: 'white',
                                fontSize: 10,
                                padding: '1px 4px',
                                borderRadius: 2,
                                lineHeight: 1,
                                fontWeight: 'bold',
                                margin: 1,
                              }}
                            >
                              {isCoupon ? '쿠폰' : 'URL'}
                            </span>
                          </a>
                        );
                      })}
                    </div>
                  );
                case 'video':
                  return (
                    <YouTubeEmbed
                      key={blockId}
                      id={block.youtubeId || ''}
                      autoplay={block.autoplay}
                      loop={block.loop}
                      ratioW={block.ratio?.w}
                      ratioH={block.ratio?.h}
                    />
                  );
                case 'text': {
                  const st = block.style || {};
                  return (
                    <div
                      key={blockId}
                      style={{ textAlign: (st.align as React.CSSProperties['textAlign']) || 'center', margin: `${st.mt || 16}px 0 ${st.mb || 16}px` }}
                    >
                      <div
                        style={{
                          fontSize: st.fontSize || 18,
                          fontWeight: st.fontWeight || 'normal',
                          color: st.color || '#333',
                          whiteSpace: 'pre-wrap',
                        }}
                        dangerouslySetInnerHTML={{ __html: escapeHtml(block.text || '').replace(/\n/g, '<br/>') }}
                      />
                    </div>
                  );
                }
                case 'product_group': {
                  const activeTabIndex = previewActiveTabs[blockId || ''] || 0;
                  let productsToDisplay: ProductLite[] = [];
                  if (block.layoutType === 'single') {
                    productsToDisplay = block.directProducts || [];
                  } else if (block.layoutType === 'tabs') {
                    if (block.registerMode === 'direct') {
                      productsToDisplay = (block.tabDirectProducts || {})[activeTabIndex] || [];
                    }
                  }
                  return (
                    <div key={blockId} style={{ padding: '16px 0', fontFamily: "'Noto Sans KR', sans-serif" }}>
                      <Alert message={<strong>상품 블록</strong>} type="info" showIcon />
                      {block.layoutType === 'tabs' && block.tabs && (
                        <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'center' }}>
                          {(block.tabs || []).map((t, i) => (
                            <Button
                              key={i}
                              style={{
                                flex: 1,
                                background: i === activeTabIndex ? block.activeColor || '#1890ff' : undefined,
                                color: i === activeTabIndex ? '#fff' : undefined,
                                borderColor: i === activeTabIndex ? block.activeColor || '#1890ff' : undefined,
                              }}
                              onClick={() => setPreviewActiveTabs((prev) => ({ ...prev, [blockId || '']: i }))}
                            >
                              {t.title || `탭 ${i + 1}`}
                            </Button>
                          ))}
                        </div>
                      )}
                      {block.registerMode === 'category' ? (
                        <div
                          style={{
                            padding: '40px 20px',
                            textAlign: 'center',
                            color: '#888',
                            background: '#fafafa',
                            border: '1px dashed #d9d9d9',
                            borderRadius: 4,
                            marginTop: 24,
                          }}
                        >
                          카테고리 상품의 경우 사이트 등록시
                          <br />
                          등록된 이미지와 가격을 확인하실수 있습니다.
                        </div>
                      ) : (
                        renderGrid(
                          block.layoutType === 'tabs'
                            ? (block.tabGridSizes?.[activeTabIndex] ?? block.gridSize ?? 2)
                            : (block.gridSize || 2),
                          productsToDisplay,
                          { discountPercent: previewDiscountPercent }
                        )
                      )}
                    </div>
                  );
                }
                default:
                  return null;
              }
            })}
          </div>
        </Card>
      </div>

      <Modal
        title="전체 HTML 코드"
        open={htmlModalVisible}
        footer={[
          <Button key="close" onClick={() => setHtmlModalVisible(false)}>
            닫기
          </Button>,
          <Button key="copy" type="primary" icon={<CopyOutlined />} onClick={handleCopy}>
            복사
          </Button>,
        ]}
        onCancel={() => setHtmlModalVisible(false)}
        width={800}
      >
        <Input.TextArea value={htmlCode} rows={20} readOnly style={{ fontFamily: 'monospace', fontSize: 12 }} />
      </Modal>
    </AppShell>
  );
}

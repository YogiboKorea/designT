import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import EventPage from '@/models/EventPage';

export const dynamic = 'force-dynamic';

// 외부 도메인(cafe24 사이트) 의 widget.js 가 cross-origin 으로 fetch 할 수 있도록 CORS 허용.
// GET / OPTIONS 만 공개. PUT/DELETE 는 admin 도메인에서만 호출되므로 CORS 불필요.
const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const CAFE24_API_HOST =
  process.env.NEXT_PUBLIC_CAFE24_API_HOST ||
  'https://port-0-ychat-lzgmwhc4d9883c97.sel4.cloudtype.app';
const DEFAULT_MALL_ID = process.env.NEXT_PUBLIC_CAFE24_MALL_ID || 'yogibo';

// In-process 캐시 — 같은 상품을 짧은 시간 내 반복 fetch 하지 않도록.
const productCache = new Map<string, { data: Record<string, unknown> | null; expires: number }>();
const PRODUCT_CACHE_TTL = 5 * 60 * 1000; // 5분

async function fetchProductDetail(mallId: string, productNo: string | number): Promise<Record<string, unknown> | null> {
  const key = `${mallId}:${productNo}`;
  const cached = productCache.get(key);
  if (cached && cached.expires > Date.now()) return cached.data;
  try {
    const res = await fetch(`${CAFE24_API_HOST}/api/${mallId}/products/${productNo}`, {
      cache: 'no-store',
    });
    if (!res.ok) {
      productCache.set(key, { data: null, expires: Date.now() + PRODUCT_CACHE_TTL });
      return null;
    }
    const json = await res.json();
    productCache.set(key, { data: json, expires: Date.now() + PRODUCT_CACHE_TTL });
    return json;
  } catch {
    productCache.set(key, { data: null, expires: Date.now() + PRODUCT_CACHE_TTL });
    return null;
  }
}

type ProductLike = { product_no?: string | number; summary_description?: string; [k: string]: unknown };

async function enrichProductList(mallId: string, products: ProductLike[]): Promise<ProductLike[]> {
  return Promise.all(
    products.map(async (p) => {
      if (!p || p.product_no == null) return p;
      // 이미 summary_description 이 있으면 skip — 새로 저장된 이벤트(post-MorePrd-fix)는 그대로.
      if (p.summary_description) return p;
      const detail = await fetchProductDetail(mallId, p.product_no);
      if (!detail || typeof detail !== 'object') return p;
      return {
        ...p,
        summary_description: (detail.summary_description as string) || '',
      };
    })
  );
}

// 저장 시점에 summary_description 가 없던 기존 이벤트도 라이브 위젯에서 영문 요약이 노출되도록,
// GET 응답에서 directProducts / tabDirectProducts 에 빠진 summary_description 을 cafe24 detail 로 채움.
async function enrichSections(sections: unknown[], mallId: string): Promise<unknown[]> {
  if (!Array.isArray(sections)) return sections;
  return Promise.all(
    sections.map(async (block) => {
      if (!block || typeof block !== 'object') return block;
      const b = block as Record<string, unknown>;
      if (b.type !== 'product_group' || b.registerMode !== 'direct') return block;

      if (b.layoutType === 'tabs') {
        const tabs = (b.tabDirectProducts as Record<string, ProductLike[]>) || {};
        const enrichedTabs: Record<string, ProductLike[]> = {};
        for (const [key, arr] of Object.entries(tabs)) {
          enrichedTabs[key] = await enrichProductList(mallId, Array.isArray(arr) ? arr : []);
        }
        return { ...b, tabDirectProducts: enrichedTabs };
      }

      // 기본: single layout
      const list = (b.directProducts as ProductLike[]) || [];
      const enriched = await enrichProductList(mallId, Array.isArray(list) ? list : []);
      return { ...b, directProducts: enriched };
    })
  );
}

export async function GET(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    await connectToDatabase();

    const event = await EventPage.findById(params.id).lean();
    if (!event) {
      return NextResponse.json(
        { success: false, message: 'Event not found' },
        { status: 404, headers: CORS_HEADERS }
      );
    }

    // mallId 는 widget.js 가 ?mallId=... 로 전달. 없으면 기본 'yogibo' 사용.
    const url = new URL(req.url);
    const mallId = url.searchParams.get('mallId') || DEFAULT_MALL_ID;

    const eventObj = event as unknown as Record<string, unknown>;
    if (Array.isArray(eventObj.sections)) {
      eventObj.sections = await enrichSections(eventObj.sections, mallId);
    }

    return NextResponse.json({ success: true, data: eventObj }, { headers: CORS_HEADERS });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

export async function PUT(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    const body = await req.json();
    const { title, sections, imageUrl, eventType, couponNos } = body;

    if (!title) {
      return NextResponse.json({ success: false, message: 'Title is required' }, { status: 400 });
    }

    await connectToDatabase();

    const updateData: any = { title, sections };
    if (imageUrl) updateData.imageUrl = imageUrl;
    if (eventType) updateData.eventType = eventType;
    if (Array.isArray(couponNos)) updateData.couponNos = couponNos;

    const updatedEvent = await EventPage.findByIdAndUpdate(params.id, updateData, { new: true });
    if (!updatedEvent) {
      return NextResponse.json({ success: false, message: 'Event not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updatedEvent }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    await connectToDatabase();

    const deletedEvent = await EventPage.findByIdAndDelete(params.id);
    if (!deletedEvent) {
      return NextResponse.json({ success: false, message: 'Event not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Event deleted successfully' }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

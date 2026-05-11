/**
 * GET  /api/products?category=beanbag&active=true   목록 조회
 * POST /api/products                                  단건 등록
 *
 * 제품 사진 라이브러리 관리.
 * 이미지는 FTP에 미리 업로드된 URL 또는 base64 로 받아 자동 업로드.
 */
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Product from '@/models/Product';

export const runtime = 'nodejs';
export const maxDuration = 60;

// ────────────────────────────────────────────────────────────────
// GET — 목록
// ────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const tag = searchParams.get('tag');
    const activeStr = searchParams.get('active');
    const limit = Math.min(Number(searchParams.get('limit') ?? 100), 500);

    const query: any = {};
    if (category) query.category = category;
    if (tag) query.tags = tag;
    if (activeStr === 'true') query.active = true;
    if (activeStr === 'false') query.active = false;

    const items = await Product.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return NextResponse.json({ ok: true, items, count: items.length });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, message: err?.message ?? '실패' },
      { status: 500 },
    );
  }
}

// ────────────────────────────────────────────────────────────────
// POST — 등록
// ────────────────────────────────────────────────────────────────
interface CreateRequest {
  category: 'beanbag' | 'body-pillow' | 'plush';
  variant?: string;
  nameKr: string;
  nameEn: string;
  /** 둘 중 하나 필수 */
  productImageUrl?: string;
  imageBase64?: string;
  /** imageBase64 사용 시 파일명 (FTP 업로드 시 사용) */
  filename?: string;
  thumbnailUrl?: string;
  visualNotes?: string;
  tags?: string[];
  recommendedTool?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as CreateRequest;
    const {
      category,
      variant,
      nameKr,
      nameEn,
      productImageUrl,
      imageBase64,
      filename,
      thumbnailUrl,
      visualNotes,
      tags = [],
      recommendedTool,
    } = body;

    // 검증
    if (!category || !nameKr || !nameEn) {
      return NextResponse.json(
        { ok: false, message: 'category, nameKr, nameEn 은 필수입니다.' },
        { status: 400 },
      );
    }
    if (!productImageUrl && !imageBase64) {
      return NextResponse.json(
        { ok: false, message: 'productImageUrl 또는 imageBase64 중 하나 필수' },
        { status: 400 },
      );
    }

    // 이미지가 base64 라면 FTP 업로드 호출
    let finalImageUrl = productImageUrl;
    if (!finalImageUrl && imageBase64) {
      const safeName = (filename ?? `product_${Date.now()}.jpg`)
        .replace(/[^a-zA-Z0-9가-힣._-]/g, '_');

      // 기존 FTP API 활용 — 같은 base URL 호출
      const baseUrl = req.nextUrl.origin;
      const ftpRes = await fetch(`${baseUrl}/api/ftp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64, filename: safeName }),
      });
      const ftpJson = await ftpRes.json();
      if (!ftpJson.success) {
        return NextResponse.json(
          { ok: false, message: 'FTP 업로드 실패: ' + (ftpJson.message ?? '') },
          { status: 500 },
        );
      }
      finalImageUrl = ftpJson.imageUrl;
    }

    await connectToDatabase();

    // 중복 체크 (URL 기반)
    const existing = await Product.findOne({ productImageUrl: finalImageUrl });
    if (existing) {
      return NextResponse.json({
        ok: true,
        item: existing,
        duplicated: true,
        message: '동일 URL의 제품이 이미 등록되어 있습니다.',
      });
    }

    const validTool = ['chatgpt', 'midjourney', 'gemini', 'fal', 'nanobanana'];
    const created = await Product.create({
      category,
      variant: variant || undefined,
      nameKr,
      nameEn,
      productImageUrl: finalImageUrl,
      thumbnailUrl: thumbnailUrl || undefined,
      visualNotes: visualNotes || '',
      tags,
      recommendedTool:
        recommendedTool && validTool.includes(recommendedTool) ? recommendedTool : undefined,
      active: true,
    });

    return NextResponse.json({ ok: true, item: created });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, message: err?.message ?? '실패' },
      { status: 500 },
    );
  }
}

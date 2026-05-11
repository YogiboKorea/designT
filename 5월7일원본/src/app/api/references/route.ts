import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import ReferenceImage from '@/models/ReferenceImage';

/**
 * 레퍼런스 이미지 API
 * ─────────────────────────────────────────────────────────────────
 * GET  /api/references              — 목록 조회 (카테고리 필터 가능)
 * POST /api/references              — 신규 등록 (FTP 업로드 + DB 저장)
 *
 * POST 본문 (JSON):
 *   {
 *     title:        string;
 *     imageUrl:     string;        // FTP 업로드 후 받은 URL (사전에 /api/ftp 호출)
 *     category:     ReferenceCategory;
 *     platform?:    ReferencePlatform;
 *     tags?:        string[];
 *     visualNotes?: string;
 *   }
 *
 * 업로드 흐름 (UI 측):
 *   1. <input type="file"> 으로 PC 에서 사진 선택
 *   2. FormData 만들어서 /api/ftp 에 업로드 → { imageUrl } 받음
 *   3. 그 imageUrl + 입력 메타데이터를 /api/references 로 POST
 * ─────────────────────────────────────────────────────────────────
 */

export const runtime = 'nodejs';

// GET — 레퍼런스 목록
export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();

    const { searchParams } = req.nextUrl;
    const category = searchParams.get('category');
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '60', 10), 200);
    const includeInactive = searchParams.get('includeInactive') === '1';

    const query: any = {};
    if (!includeInactive) query.active = true;
    if (category) query.category = category;

    const items = await ReferenceImage.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return NextResponse.json({
      ok: true,
      items: items.map((item: any) => ({
        ...item,
        _id: String(item._id),
      })),
    });
  } catch (err: any) {
    console.error('[references GET] error:', err);
    return NextResponse.json(
      { ok: false, message: err?.message ?? 'unknown' },
      { status: 500 },
    );
  }
}

// POST — 신규 등록 (FTP 업로드는 UI 가 /api/ftp 로 먼저 처리, 여기는 메타데이터 저장)
export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();

    const body = await req.json();
    const {
      title,
      imageUrl,
      category = 'web-banner',
      platform = null,
      tags = [],
      visualNotes = '',
    } = body;

    if (!title || !imageUrl) {
      return NextResponse.json(
        { ok: false, message: 'title 과 imageUrl 은 필수입니다.' },
        { status: 400 },
      );
    }

    // 동일 URL 중복 체크
    const existing = await ReferenceImage.findOne({ imageUrl });
    if (existing) {
      return NextResponse.json(
        { ok: false, message: '이미 등록된 이미지 URL 입니다.' },
        { status: 409 },
      );
    }

    const created = await ReferenceImage.create({
      title: String(title).trim(),
      imageUrl: String(imageUrl).trim(),
      category,
      platform,
      tags: Array.isArray(tags) ? tags.map((t) => String(t).trim()).filter(Boolean) : [],
      visualNotes: String(visualNotes).trim(),
      active: true,
    });

    return NextResponse.json({
      ok: true,
      item: { ...created.toObject(), _id: String(created._id) },
    });
  } catch (err: any) {
    console.error('[references POST] error:', err);
    return NextResponse.json(
      { ok: false, message: err?.message ?? 'unknown' },
      { status: 500 },
    );
  }
}

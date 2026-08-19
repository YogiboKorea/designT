import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import GeneratedImage from '@/models/GeneratedImage';
import GeneratedFolder from '@/models/GeneratedFolder';

/**
 * 생성 이미지 API
 * ─────────────────────────────────────────────────────────────────
 * GET  /api/generated-images?folderId=&limit=   — 목록
 * POST /api/generated-images                    — 생성물 등록
 *
 * POST 본문 (FTP 업로드는 호출자가 먼저 /api/ftp 로 끝내고 imageUrl 을 넘긴다):
 *   {
 *     folderId: string;          // 필수
 *     title: string;             // 필수
 *     imageUrl: string;          // 필수 — FTP 업로드 결과
 *     sourceImageUrl?: string;   // 크롭 전 원본
 *     width?, height?: number;
 *     prompt?, model?, provider?: string;
 *     referenceIds?: string[];   // 풍 소스
 *     productId?: string;        // 접목한 제품
 *     elementId?: string;        // Higgsfield Element
 *     textSafeArea?: 'left'|'right'|'top'|'bottom'|'center'|'none';
 *     tags?: string[];
 *     note?: string;
 *   }
 *
 * 업로드 흐름은 이 저장소의 기존 규칙을 그대로 따른다:
 *   ① 이미지 바이트 → POST /api/ftp → { imageUrl }
 *   ② 그 imageUrl + 메타데이터 → POST /api/generated-images
 * ─────────────────────────────────────────────────────────────────
 */

export const runtime = 'nodejs';

// GET — 생성 이미지 목록
export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();

    const { searchParams } = req.nextUrl;
    const folderId = searchParams.get('folderId');
    const tag = searchParams.get('tag');
    const includeInactive = searchParams.get('includeInactive') === '1';
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '100', 10), 300);

    const query: any = {};
    if (!includeInactive) query.active = true;
    if (folderId) query.folderId = folderId;
    if (tag) query.tags = tag;

    const items = await GeneratedImage.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return NextResponse.json({
      ok: true,
      items: items.map((item: any) => ({
        ...item,
        _id: String(item._id),
        folderId: String(item.folderId),
        productId: item.productId ? String(item.productId) : null,
        referenceIds: (item.referenceIds ?? []).map((r: any) => String(r)),
      })),
    });
  } catch (err: any) {
    console.error('[generated-images GET] error:', err);
    return NextResponse.json(
      { ok: false, message: err?.message ?? '목록 조회 실패' },
      { status: 500 },
    );
  }
}

// POST — 생성물 등록
export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();

    const body = await req.json();
    const { folderId, title, imageUrl } = body ?? {};

    if (!folderId || !title || !imageUrl) {
      return NextResponse.json(
        { ok: false, message: 'folderId, title, imageUrl 은 필수입니다.' },
        { status: 400 },
      );
    }

    // 폴더 실존 확인 — 없는 폴더로 등록되면 목록에서 영영 안 보인다
    const folder = await GeneratedFolder.findById(folderId).lean();
    if (!folder) {
      return NextResponse.json(
        { ok: false, message: `폴더를 찾을 수 없습니다 (${folderId})` },
        { status: 404 },
      );
    }

    const created = await GeneratedImage.create({
      folderId,
      title: String(title).trim(),
      imageUrl,
      sourceImageUrl: body.sourceImageUrl ?? '',
      width: body.width ?? 0,
      height: body.height ?? 0,
      prompt: body.prompt ?? '',
      model: body.model ?? '',
      provider: body.provider ?? 'higgsfield',
      referenceIds: body.referenceIds ?? [],
      productId: body.productId || null,
      elementId: body.elementId ?? '',
      textSafeArea: body.textSafeArea ?? 'left',
      tags: body.tags ?? [],
      note: body.note ?? '',
    });

    // 폴더 카드가 updatedAt 역순이라, 등록되면 그 폴더가 위로 올라오게 한다
    await GeneratedFolder.findByIdAndUpdate(folderId, { $set: { updatedAt: new Date() } });

    return NextResponse.json({
      ok: true,
      item: { ...created.toObject(), _id: String(created._id) },
    });
  } catch (err: any) {
    console.error('[generated-images POST] error:', err);
    return NextResponse.json(
      { ok: false, message: err?.message ?? '등록 실패' },
      { status: 500 },
    );
  }
}

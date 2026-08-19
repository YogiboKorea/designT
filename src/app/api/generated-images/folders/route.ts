import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import GeneratedFolder from '@/models/GeneratedFolder';
import GeneratedImage from '@/models/GeneratedImage';

/**
 * 생성 이미지 폴더 API
 * ─────────────────────────────────────────────────────────────────
 * GET  /api/generated-images/folders   — 폴더 목록 (각 폴더의 이미지 수 포함)
 * POST /api/generated-images/folders   — 폴더 생성
 *
 * POST 본문:
 *   { name: string; emoji?: string; color?: string; description?: string }
 *
 * slug 는 서버가 name 에서 자동 생성한다.
 * 한글 폴더명은 FTP 경로에 못 쓰기 때문에(cafe24 nginx 403),
 * 항상 ASCII slug 를 따로 만들어 업로드 파일명 프리픽스로 쓴다.
 * ─────────────────────────────────────────────────────────────────
 */

export const runtime = 'nodejs';

/** 한글/특수문자 폴더명 → FTP 에 쓸 수 있는 ASCII slug */
function toSlug(name: string): string {
  const ascii = name
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
    .slice(0, 24);
  // 한글만으로 된 이름이면 ascii 가 비므로 타임스탬프로 대체
  return ascii || `folder-${Date.now().toString(36)}`;
}

// GET — 폴더 목록 + 폴더별 이미지 수
export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();

    const { searchParams } = req.nextUrl;
    const includeInactive = searchParams.get('includeInactive') === '1';

    const query: any = {};
    if (!includeInactive) query.active = true;

    const folders = await GeneratedFolder.find(query)
      .sort({ updatedAt: -1 })
      .limit(200)
      .lean();

    // 폴더별 이미지 수 — 목록 카드에 바로 보여주기 위해 한 번에 집계
    const counts = await GeneratedImage.aggregate([
      { $match: { active: true } },
      { $group: { _id: '$folderId', count: { $sum: 1 } } },
    ]);
    const countMap = new Map<string, number>(
      counts.map((c: any) => [String(c._id), c.count]),
    );

    return NextResponse.json({
      ok: true,
      items: folders.map((f: any) => ({
        ...f,
        _id: String(f._id),
        imageCount: countMap.get(String(f._id)) ?? 0,
      })),
    });
  } catch (err: any) {
    console.error('[generated-folders GET] error:', err);
    return NextResponse.json(
      { ok: false, message: err?.message ?? '폴더 목록 조회 실패' },
      { status: 500 },
    );
  }
}

// POST — 폴더 생성
export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();

    const body = await req.json();
    const name = String(body?.name ?? '').trim();

    if (!name) {
      return NextResponse.json(
        { ok: false, message: '폴더명은 필수입니다.' },
        { status: 400 },
      );
    }

    // slug 충돌 회피 — 같은 slug 가 있으면 뒤에 짧은 suffix 를 붙인다
    let slug = toSlug(name);
    if (await GeneratedFolder.exists({ slug })) {
      slug = `${slug}-${Date.now().toString(36).slice(-4)}`;
    }

    const created = await GeneratedFolder.create({
      name,
      slug,
      emoji: body?.emoji || '📁',
      color: body?.color || '#fe6326',
      description: body?.description || '',
    });

    return NextResponse.json({
      ok: true,
      item: { ...created.toObject(), _id: String(created._id), imageCount: 0 },
    });
  } catch (err: any) {
    console.error('[generated-folders POST] error:', err);
    return NextResponse.json(
      { ok: false, message: err?.message ?? '폴더 생성 실패' },
      { status: 500 },
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import GeneratedFolder from '@/models/GeneratedFolder';
import GeneratedImage from '@/models/GeneratedImage';

/**
 * 생성 이미지 폴더 단건 API
 * ─────────────────────────────────────────────────────────────────
 * PATCH  /api/generated-images/folders/[id]  — 이름/이모지/색/설명 수정
 * DELETE /api/generated-images/folders/[id]  — 소프트 삭제 (active:false)
 *
 * 삭제는 소프트로만 한다. 폴더를 지워도 그 안의 이미지는 이미 FTP 에 올라가
 * 이벤트 페이지·배너에서 참조 중일 수 있어서, 레코드를 날리면 추적이 끊긴다.
 * (이 저장소는 references 가 소프트, products/presets 가 하드라 규칙이 갈리는데
 *  생성물은 외부에서 참조되므로 소프트가 맞다)
 * ─────────────────────────────────────────────────────────────────
 */

export const runtime = 'nodejs';

const ALLOWED = ['name', 'emoji', 'color', 'description', 'active'] as const;

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await connectToDatabase();
    const { id } = await params;

    const body = await req.json();
    const update: Record<string, any> = {};
    for (const key of ALLOWED) {
      if (body[key] !== undefined) update[key] = body[key];
    }
    if (typeof update.name === 'string') update.name = update.name.trim();

    if (!Object.keys(update).length) {
      return NextResponse.json(
        { ok: false, message: '수정할 항목이 없습니다.' },
        { status: 400 },
      );
    }

    const updated = await GeneratedFolder.findByIdAndUpdate(id, update, { new: true }).lean();
    if (!updated) {
      return NextResponse.json(
        { ok: false, message: '폴더를 찾을 수 없습니다.' },
        { status: 404 },
      );
    }

    return NextResponse.json({
      ok: true,
      item: { ...(updated as any), _id: String((updated as any)._id) },
    });
  } catch (err: any) {
    console.error('[generated-folders PATCH] error:', err);
    return NextResponse.json(
      { ok: false, message: err?.message ?? '폴더 수정 실패' },
      { status: 500 },
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await connectToDatabase();
    const { id } = await params;

    // 안에 이미지가 남아 있으면 알려준다 (막지는 않되, 몇 장인지 응답에 담는다)
    const imageCount = await GeneratedImage.countDocuments({ folderId: id, active: true });

    const updated = await GeneratedFolder.findByIdAndUpdate(
      id,
      { active: false },
      { new: true },
    ).lean();
    if (!updated) {
      return NextResponse.json(
        { ok: false, message: '폴더를 찾을 수 없습니다.' },
        { status: 404 },
      );
    }

    return NextResponse.json({ ok: true, imageCount });
  } catch (err: any) {
    console.error('[generated-folders DELETE] error:', err);
    return NextResponse.json(
      { ok: false, message: err?.message ?? '폴더 삭제 실패' },
      { status: 500 },
    );
  }
}

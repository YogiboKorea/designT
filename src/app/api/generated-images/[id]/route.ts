import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import GeneratedImage from '@/models/GeneratedImage';

/**
 * 생성 이미지 단건 API
 * ─────────────────────────────────────────────────────────────────
 * PATCH  /api/generated-images/[id]  — 제목/태그/메모/입력이미지 등 수정
 * DELETE /api/generated-images/[id]  — 소프트 삭제 (active:false)
 *
 * imageUrl 은 수정 대상에서 뺀다. 이미 이벤트 페이지·배너가 그 URL 을
 * 참조하고 있을 수 있어서, 바꾸려면 새 레코드를 만드는 게 맞다.
 * ─────────────────────────────────────────────────────────────────
 */

export const runtime = 'nodejs';

const ALLOWED = [
  'title',
  'prompt',
  'tags',
  'note',
  'textSafeArea',
  'inputImages',
  'referenceIds',
  'productId',
  'elementId',
  'sourceImageUrl',
  'model',
  'provider',
  'width',
  'height',
  'active',
] as const;

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

    if (!Object.keys(update).length) {
      return NextResponse.json(
        { ok: false, message: '수정할 항목이 없습니다.' },
        { status: 400 },
      );
    }

    const updated = await GeneratedImage.findByIdAndUpdate(id, update, { new: true }).lean();
    if (!updated) {
      return NextResponse.json(
        { ok: false, message: '이미지를 찾을 수 없습니다.' },
        { status: 404 },
      );
    }

    return NextResponse.json({
      ok: true,
      item: { ...(updated as any), _id: String((updated as any)._id) },
    });
  } catch (err: any) {
    console.error('[generated-images PATCH] error:', err);
    return NextResponse.json(
      { ok: false, message: err?.message ?? '수정 실패' },
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

    const updated = await GeneratedImage.findByIdAndUpdate(
      id,
      { active: false },
      { new: true },
    ).lean();
    if (!updated) {
      return NextResponse.json(
        { ok: false, message: '이미지를 찾을 수 없습니다.' },
        { status: 404 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('[generated-images DELETE] error:', err);
    return NextResponse.json(
      { ok: false, message: err?.message ?? '삭제 실패' },
      { status: 500 },
    );
  }
}

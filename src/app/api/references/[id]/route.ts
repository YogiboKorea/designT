/**
 * GET    /api/references/[id]   → 단건 조회
 * PATCH  /api/references/[id]   → 메타 수정 (태그/메모/제목 등)
 * DELETE /api/references/[id]   → 삭제
 */
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import ReferenceImage from '@/models/ReferenceImage';

export const runtime = 'nodejs';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    await connectToDatabase();
    const item = await ReferenceImage.findById(id).lean();
    if (!item) {
      return NextResponse.json(
        { ok: false, message: '레퍼런스를 찾을 수 없습니다.' },
        { status: 404 },
      );
    }
    return NextResponse.json({ ok: true, item });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, message: err?.message ?? '실패' },
      { status: 500 },
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await req.json();
    await connectToDatabase();

    const allowed = ['title', 'tags', 'source', 'note', 'extractedTokens'];
    const update: any = {};
    for (const k of allowed) {
      if (body[k] !== undefined) update[k] = body[k];
    }

    const updated = await ReferenceImage.findByIdAndUpdate(id, update, { new: true });
    if (!updated) {
      return NextResponse.json(
        { ok: false, message: '레퍼런스를 찾을 수 없습니다.' },
        { status: 404 },
      );
    }
    return NextResponse.json({ ok: true, item: updated });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, message: err?.message ?? '실패' },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    await connectToDatabase();
    const deleted = await ReferenceImage.findByIdAndDelete(id);
    if (!deleted) {
      return NextResponse.json(
        { ok: false, message: '레퍼런스를 찾을 수 없습니다.' },
        { status: 404 },
      );
    }
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, message: err?.message ?? '실패' },
      { status: 500 },
    );
  }
}

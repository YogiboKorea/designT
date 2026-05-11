import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import ReferenceImage from '@/models/ReferenceImage';

export const runtime = 'nodejs';

/**
 * GET /api/references/:id   — 단일 조회
 * PATCH /api/references/:id — 일부 필드 수정 (제목/카테고리/플랫폼/태그/메모/활성)
 * DELETE /api/references/:id — 삭제 (소프트: active=false)
 */

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    await connectToDatabase();
    const { id } = await ctx.params;
    const item = await ReferenceImage.findById(id).lean();
    if (!item) {
      return NextResponse.json({ ok: false, message: 'not found' }, { status: 404 });
    }
    return NextResponse.json({ ok: true, item: { ...item, _id: String((item as any)._id) } });
  } catch (err: any) {
    return NextResponse.json({ ok: false, message: err?.message ?? 'unknown' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    await connectToDatabase();
    const { id } = await ctx.params;

    const body = await req.json();
    const allowed = ['title', 'category', 'platform', 'tags', 'visualNotes', 'active'];
    const update: Record<string, any> = {};
    for (const k of allowed) {
      if (k in body) update[k] = body[k];
    }

    const updated = await ReferenceImage.findByIdAndUpdate(id, update, { new: true }).lean();
    if (!updated) {
      return NextResponse.json({ ok: false, message: 'not found' }, { status: 404 });
    }
    return NextResponse.json({ ok: true, item: { ...updated, _id: String((updated as any)._id) } });
  } catch (err: any) {
    return NextResponse.json({ ok: false, message: err?.message ?? 'unknown' }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    await connectToDatabase();
    const { id } = await ctx.params;
    // 소프트 삭제 (active = false)
    const updated = await ReferenceImage.findByIdAndUpdate(
      id,
      { active: false },
      { new: true },
    ).lean();
    if (!updated) {
      return NextResponse.json({ ok: false, message: 'not found' }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ ok: false, message: err?.message ?? 'unknown' }, { status: 500 });
  }
}

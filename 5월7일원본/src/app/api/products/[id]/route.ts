/**
 * GET    /api/products/[id]
 * PATCH  /api/products/[id]
 * DELETE /api/products/[id]
 */
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Product from '@/models/Product';

export const runtime = 'nodejs';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    await connectToDatabase();
    const item = await Product.findById(id).lean();
    if (!item) {
      return NextResponse.json(
        { ok: false, message: '제품을 찾을 수 없습니다.' },
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

    const allowed = [
      'category',
      'variant',
      'nameKr',
      'nameEn',
      'thumbnailUrl',
      'visualNotes',
      'tags',
      'recommendedTool',
      'active',
    ];
    const update: any = {};
    for (const k of allowed) {
      if (body[k] !== undefined) update[k] = body[k];
    }

    const updated = await Product.findByIdAndUpdate(id, update, { new: true });
    if (!updated) {
      return NextResponse.json(
        { ok: false, message: '제품을 찾을 수 없습니다.' },
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
    const deleted = await Product.findByIdAndDelete(id);
    if (!deleted) {
      return NextResponse.json(
        { ok: false, message: '제품을 찾을 수 없습니다.' },
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

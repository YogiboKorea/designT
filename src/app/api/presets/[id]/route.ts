import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/mongodb';
import BannerPreset from '@/models/BannerPreset';

export const dynamic = 'force-dynamic';

/**
 * GET /api/presets/[id] — 단일 프리셋 조회 (디버그/편집용)
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ ok: false, message: 'invalid id' }, { status: 400 });
    }
    await connectToDatabase();
    const item = await BannerPreset.findById(id);
    if (!item) {
      return NextResponse.json({ ok: false, message: 'not found' }, { status: 404 });
    }
    return NextResponse.json({ ok: true, item });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, message: error?.message ?? 'unknown error' },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/presets/[id] — 이름/썸네일/데이터 수정
 *   주로 "프리셋 이름 바꾸기" 또는 "데이터 갱신" 시 사용.
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ ok: false, message: 'invalid id' }, { status: 400 });
    }

    const body = await req.json();
    const update: any = {};
    if (typeof body.name === 'string') update.name = body.name.trim().slice(0, 100);
    if (typeof body.thumbnail === 'string') update.thumbnail = body.thumbnail;
    if (body.data && typeof body.data === 'object') update.data = body.data;

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ ok: false, message: 'no fields to update' }, { status: 400 });
    }

    await connectToDatabase();
    const item = await BannerPreset.findByIdAndUpdate(id, update, { new: true });
    if (!item) {
      return NextResponse.json({ ok: false, message: 'not found' }, { status: 404 });
    }
    return NextResponse.json({ ok: true, item });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, message: error?.message ?? 'unknown error' },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/presets/[id] — 프리셋 삭제
 *   카드 그리드에서 ✕ 버튼으로 호출.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ ok: false, message: 'invalid id' }, { status: 400 });
    }
    await connectToDatabase();
    const result = await BannerPreset.findByIdAndDelete(id);
    if (!result) {
      return NextResponse.json({ ok: false, message: 'not found' }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, message: error?.message ?? 'unknown error' },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/events/[id]/reference
 * ─────────────────────────────────────────────────────────────────
 * 빌더에서 ⭐ 토글 버튼으로 EventPage 의 isReference 를 ON/OFF.
 *
 * 입력:
 *   { isReference: boolean, tags?: string[], note?: string }
 * ─────────────────────────────────────────────────────────────────
 */
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import EventPage from '@/models/EventPage';

export const runtime = 'nodejs';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await req.json();

    if (typeof body.isReference !== 'boolean') {
      return NextResponse.json(
        { ok: false, message: 'isReference (boolean) 필수' },
        { status: 400 },
      );
    }

    await connectToDatabase();

    const update: any = { isReference: body.isReference };
    if (Array.isArray(body.tags)) update.referenceTags = body.tags;
    if (typeof body.note === 'string') update.referenceNote = body.note;

    const updated = await EventPage.findByIdAndUpdate(id, update, { new: true });
    if (!updated) {
      return NextResponse.json(
        { ok: false, message: '이벤트 페이지를 찾을 수 없습니다.' },
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

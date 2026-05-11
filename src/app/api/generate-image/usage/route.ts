/**
 * GET   /api/generate-image/usage         → 현재 카운트/한도 조회
 * PATCH /api/generate-image/usage         → 한도 변경 또는 카운트 리셋
 *   body: { limit?: number, reset?: boolean }
 *
 * 직원 테스트 환경에서 fal.ai 사용량을 보고 관리자가 한도 조절.
 */
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import ApiUsage from '@/models/ApiUsage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const USAGE_KEY = 'fal-flux-pro-1.1';
const DEFAULT_LIMIT = Number(process.env.FAL_USAGE_LIMIT) || 100;

export async function GET() {
  try {
    await connectToDatabase();
    const usage = await ApiUsage.findOneAndUpdate(
      { key: USAGE_KEY },
      { $setOnInsert: { count: 0, limit: DEFAULT_LIMIT } },
      { upsert: true, new: true },
    );
    return NextResponse.json({
      ok: true,
      key: USAGE_KEY,
      count: usage.count,
      limit: usage.limit,
      remaining: Math.max(0, usage.limit - usage.count),
      estimatedCostUsd: usage.count * 0.04,
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'unknown' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await connectToDatabase();
    const body = await req.json().catch(() => ({}));
    const update: Record<string, unknown> = {};
    if (typeof body.limit === 'number' && body.limit >= 0) update.limit = body.limit;
    if (body.reset === true) update.count = 0;

    if (Object.keys(update).length === 0) {
      return NextResponse.json(
        { ok: false, error: 'limit (number) 또는 reset (true) 중 하나를 보내주세요.' },
        { status: 400 },
      );
    }

    const usage = await ApiUsage.findOneAndUpdate(
      { key: USAGE_KEY },
      { $set: update },
      { upsert: true, new: true },
    );

    return NextResponse.json({
      ok: true,
      count: usage.count,
      limit: usage.limit,
      remaining: Math.max(0, usage.limit - usage.count),
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'unknown' }, { status: 500 });
  }
}

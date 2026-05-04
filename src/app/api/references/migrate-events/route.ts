/**
 * POST /api/references/migrate-events
 * ─────────────────────────────────────────────────────────────────
 * 기존 EventPage 컬렉션의 작업물을 일괄로 isReference=true 표시.
 * 작년 작업물이 이미 빌더 DB 에 있을 때 사용.
 *
 * 입력:
 *   {
 *     filter: 'all' | { from: string; to: string } | { recentMonths: number },
 *     autoTag?: boolean,    // 제목 + 작성월 기반 자동 태깅
 *     dryRun?:  boolean,    // 실제 업데이트 없이 시뮬레이션만
 *   }
 *
 * 응답:
 *   { ok: true, updated, total, sample? }
 * ─────────────────────────────────────────────────────────────────
 */
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import EventPage from '@/models/EventPage';

export const runtime = 'nodejs';
export const maxDuration = 120;

interface MigrateRequest {
  filter: 'all' | { from: string; to: string } | { recentMonths: number };
  autoTag?: boolean;
  dryRun?: boolean;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as MigrateRequest;
    const { filter, autoTag = true, dryRun = false } = body;

    await connectToDatabase();

    // ── 쿼리 빌드 ───────────────────────────────────────────
    const query: any = { eventType: 'event' };
    if (filter === 'all') {
      // no-op
    } else if (typeof filter === 'object' && 'from' in filter) {
      query.createdAt = {
        $gte: new Date(filter.from),
        $lte: new Date(filter.to),
      };
    } else if (typeof filter === 'object' && 'recentMonths' in filter) {
      const since = new Date();
      since.setMonth(since.getMonth() - filter.recentMonths);
      query.createdAt = { $gte: since };
    } else {
      return NextResponse.json(
        { ok: false, message: 'filter 형식 오류' },
        { status: 400 },
      );
    }

    const targets = await EventPage.find(query).lean();

    if (dryRun) {
      return NextResponse.json({
        ok: true,
        dryRun: true,
        wouldUpdate: targets.length,
        sample: targets.slice(0, 5).map((t: any) => ({
          id: String(t._id),
          title: t.title,
          createdAt: t.createdAt,
          alreadyReference: t.isReference === true,
        })),
      });
    }

    // ── 일괄 업데이트 ───────────────────────────────────────
    let updated = 0;
    let alreadyMarked = 0;
    for (const doc of targets) {
      const d = doc as any;
      if (d.isReference) {
        alreadyMarked++;
        continue;
      }
      const tags = autoTag ? inferTagsFromTitle(d.title, d.createdAt) : [];
      await EventPage.findByIdAndUpdate(d._id, {
        isReference: true,
        referenceTags: tags,
      });
      updated++;
    }

    return NextResponse.json({
      ok: true,
      updated,
      alreadyMarked,
      total: targets.length,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, message: err?.message ?? '실패' },
      { status: 500 },
    );
  }
}

// ────────────────────────────────────────────────────────────────
// 자동 태깅 휴리스틱
// ────────────────────────────────────────────────────────────────
function inferTagsFromTitle(title: string, createdAt: Date): string[] {
  const tags: string[] = [];
  const t = (title ?? '').toLowerCase();

  // 시즌 키워드
  if (/봄|spring|벚꽃|꽃/.test(t)) tags.push('spring');
  if (/여름|summer|시원|쿨|더위/.test(t)) tags.push('summer');
  if (/가을|autumn|fall|단풍/.test(t)) tags.push('autumn');
  if (/겨울|winter|크리스마스|연말|christmas/.test(t)) tags.push('winter');

  // 캠페인 유형
  if (/세일|sale|할인/.test(t)) tags.push('sale');
  if (/신상|신제품|new|launch|런칭/.test(t)) tags.push('new');
  if (/타임|time|한정|limited/.test(t)) tags.push('limited');
  if (/쿠폰|coupon/.test(t)) tags.push('coupon');
  if (/오픈|open|그랜드/.test(t)) tags.push('open');

  // 월 기반 시즌 보정 (시즌 키워드가 없을 때)
  const month = new Date(createdAt).getMonth() + 1;
  const hasSeason = tags.some((t) =>
    ['spring', 'summer', 'autumn', 'winter'].includes(t),
  );
  if (!hasSeason) {
    if (month >= 3 && month <= 5) tags.push('spring');
    else if (month >= 6 && month <= 8) tags.push('summer');
    else if (month >= 9 && month <= 11) tags.push('autumn');
    else tags.push('winter');
  }

  // 연도 태그
  const year = String(new Date(createdAt).getFullYear());
  tags.push(year);

  return Array.from(new Set(tags));
}

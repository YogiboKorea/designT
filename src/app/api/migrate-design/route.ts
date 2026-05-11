/**
 * 일회성 마이그레이션 API
 * ────────────────────────────────────────────────────────────────
 * 옛 test.design 컬렉션의 문서를 yogibo.eventTemple 컬렉션으로 복사.
 *
 *   POST /api/migrate-design          → 전체 마이그레이션 실행
 *   POST /api/migrate-design?dry=1    → dry-run (개수만 리턴, 실제 insert 없음)
 *
 * 동작:
 *   1) test.design 의 모든 문서를 읽음
 *   2) 각 문서에 mallId 가 없으면 'yogibo' 로 설정
 *   3) yogibo.eventTemple 에 _id 그대로 upsert (중복 시 skip)
 *
 * 마이그레이션 후 옛 컬렉션(test.design)은 그대로 둠 — 안전 차원.
 * 모두 정상 보이면 MongoDB 에서 직접 drop 하면 됨.
 * ────────────────────────────────────────────────────────────────
 */
import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/mongodb';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    await connectToDatabase();

    const url = new URL(req.url);
    const dryRun = url.searchParams.get('dry') === '1';
    // ?source=  (옵션) — 다른 컬렉션을 source 로 지정. 기본 'design'.
    const sourceCollName = url.searchParams.get('source') || 'design';

    // source: test DB 의 지정 컬렉션
    const sourceConn = mongoose.connection.useDb('test', { useCache: true });
    const sourceDb = sourceConn.db;
    if (!sourceDb) throw new Error('source DB connection not ready');

    // target: yogibo DB 의 eventTemple
    const targetConn = mongoose.connection.useDb('yogibo', { useCache: true });
    const targetDb = targetConn.db;
    if (!targetDb) throw new Error('target DB connection not ready');

    const sourceColl = sourceDb.collection(sourceCollName);
    const targetColl = targetDb.collection('eventTemple');

    const total = await sourceColl.countDocuments();
    if (total === 0) {
      return NextResponse.json({
        success: true,
        message: `test.${sourceCollName} 에 마이그레이션할 문서가 없습니다.`,
        total: 0, copied: 0, skipped: 0,
      });
    }

    // 대상에 이미 있는 _id 미리 수집해서 중복 방지
    const existingIds = new Set<string>();
    const existingCursor = targetColl.find({}, { projection: { _id: 1 } });
    for await (const doc of existingCursor) {
      existingIds.add(String(doc._id));
    }

    let copied = 0;
    let skipped = 0;
    const skippedIds: string[] = [];

    const sourceCursor = sourceColl.find({});
    for await (const doc of sourceCursor) {
      const idStr = String(doc._id);
      if (existingIds.has(idStr)) {
        skipped++;
        skippedIds.push(idStr);
        continue;
      }
      const toInsert = {
        ...doc,
        mallId: doc.mallId || 'yogibo',
      };
      if (!dryRun) {
        try {
          await targetColl.insertOne(toInsert);
          copied++;
        } catch (e) {
          console.warn('[migrate-design] insert 실패:', idStr, (e as Error).message);
          skipped++;
        }
      } else {
        copied++; // dry-run 에선 카운트만
      }
    }

    return NextResponse.json({
      success: true,
      dryRun,
      total,
      copied,
      skipped,
      message: dryRun
        ? `[DRY RUN] ${total}건 발견 — 실제 insert 안 함. copied=${copied}, skipped(이미존재)=${skipped}`
        : `${copied}건 복사 완료. ${skipped}건은 이미 존재해서 skip.`,
      skippedIdsSample: skippedIds.slice(0, 10),
    });
  } catch (err: any) {
    console.error('[migrate-design ERROR]', err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: '이 엔드포인트는 POST 로 호출하세요. POST /api/migrate-design (또는 ?dry=1 로 미리보기)',
  });
}

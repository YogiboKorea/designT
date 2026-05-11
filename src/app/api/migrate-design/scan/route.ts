/**
 * test / yogibo 두 DB 의 모든 컬렉션과 문서 수를 나열.
 * 어디에 데이터가 있는지 찾기 위한 진단 API.
 *
 *   GET /api/migrate-design/scan
 */
import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/mongodb';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await connectToDatabase();
    const adminDb = mongoose.connection.db?.admin();
    if (!adminDb) throw new Error('admin connection not ready');

    const dbsToScan = ['test', 'yogibo'];
    const result: Record<string, Array<{ name: string; count: number }>> = {};

    for (const dbName of dbsToScan) {
      const conn = mongoose.connection.useDb(dbName, { useCache: true });
      if (!conn.db) continue;
      const colls = await conn.db.listCollections().toArray();
      const counts: Array<{ name: string; count: number }> = [];
      for (const c of colls) {
        try {
          const count = await conn.db.collection(c.name).countDocuments();
          counts.push({ name: c.name, count });
        } catch {
          counts.push({ name: c.name, count: -1 });
        }
      }
      counts.sort((a, b) => b.count - a.count);
      result[dbName] = counts;
    }

    return NextResponse.json({ success: true, dbs: result });
  } catch (err: any) {
    console.error('[scan ERROR]', err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

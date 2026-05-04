/**
 * GET  /api/references          → 목록 조회 (페이징)
 * POST /api/references          → 단건 등록 (이미지 업로드 또는 URL)
 *
 * 외부 이미지 레퍼런스 관리.
 * 일괄 등록은 /scan-ftp, /bulk-url, /migrate-events 참고.
 */
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import ReferenceImage from '@/models/ReferenceImage';
import { extractTokensFromBase64, extractTokensFromUrl } from '@/lib/ai-vision';
import crypto from 'crypto';

export const runtime = 'nodejs';
export const maxDuration = 60;

// ────────────────────────────────────────────────────────────────
// GET — 목록 조회
// ────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const tag = searchParams.get('tag');
    const source = searchParams.get('source');
    const limit = Math.min(Number(searchParams.get('limit') ?? 50), 200);
    const skip = Number(searchParams.get('skip') ?? 0);

    const query: any = {};
    if (tag) query.tags = tag;
    if (source) query.source = source;

    const [items, total] = await Promise.all([
      ReferenceImage.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      ReferenceImage.countDocuments(query),
    ]);

    return NextResponse.json({ ok: true, items, total, limit, skip });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, message: err?.message ?? '실패' },
      { status: 500 },
    );
  }
}

// ────────────────────────────────────────────────────────────────
// POST — 단건 등록
// ────────────────────────────────────────────────────────────────
interface CreateRequest {
  title: string;
  /** 둘 중 하나 필수 */
  imageBase64?: string;
  mediaType?: string;
  imageUrl?: string;

  source?: string;
  tags?: string[];
  note?: string;
  /** AI 분석 즉시 실행 여부 (기본 true) */
  analyzeWithAI?: boolean;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as CreateRequest;
    const {
      title,
      imageBase64,
      mediaType,
      imageUrl,
      source = 'other',
      tags = [],
      note = '',
      analyzeWithAI = true,
    } = body;

    if (!title?.trim()) {
      return NextResponse.json(
        { ok: false, message: 'title 은 필수' },
        { status: 400 },
      );
    }
    if (!imageBase64 && !imageUrl) {
      return NextResponse.json(
        { ok: false, message: 'imageBase64 또는 imageUrl 중 하나 필수' },
        { status: 400 },
      );
    }

    await connectToDatabase();

    // 중복 체크 (URL 또는 hash 기반)
    let hash: string | undefined;
    if (imageBase64) {
      const cleanBase64 = imageBase64.replace(/^data:[^;]+;base64,/, '');
      hash = crypto.createHash('sha256').update(cleanBase64).digest('hex');
      const exists = await ReferenceImage.findOne({ hash });
      if (exists) {
        return NextResponse.json({
          ok: true,
          item: exists,
          duplicated: true,
          message: '동일 이미지가 이미 등록되어 있습니다.',
        });
      }
    } else if (imageUrl) {
      const exists = await ReferenceImage.findOne({ imageUrl });
      if (exists) {
        return NextResponse.json({
          ok: true,
          item: exists,
          duplicated: true,
        });
      }
    }

    // AI 분석
    let extractedTokens: any = undefined;
    if (analyzeWithAI) {
      try {
        if (imageBase64) {
          extractedTokens = await extractTokensFromBase64(
            imageBase64,
            mediaType ?? 'image/jpeg',
          );
        } else if (imageUrl) {
          extractedTokens = await extractTokensFromUrl(imageUrl);
        }
      } catch (err: any) {
        // 분석 실패해도 등록은 진행 — 야간 배치로 백필 가능
        console.warn('[references POST] AI 분석 실패:', err.message);
      }
    }

    // imageBase64 인 경우 — 일단 데이터 URI 로 저장 (소규모 사용 가정)
    // 대량/장기 운영 시에는 FTP API 호출로 업로드 후 URL 받는 걸 권장
    const finalImageUrl = imageUrl ?? `data:${mediaType ?? 'image/jpeg'};base64,${imageBase64!.replace(/^data:[^;]+;base64,/, '')}`;

    const created = await ReferenceImage.create({
      title,
      imageUrl: finalImageUrl,
      source: ['designer', 'external', 'competitor', 'archive', 'other'].includes(source)
        ? source
        : 'other',
      tags,
      note,
      hash,
      extractedTokens,
    });

    return NextResponse.json({ ok: true, item: created });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, message: err?.message ?? '실패' },
      { status: 500 },
    );
  }
}

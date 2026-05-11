/**
 * POST /api/references/bulk-url
 * ─────────────────────────────────────────────────────────────────
 * 줄바꿈 또는 쉼표로 구분된 URL 목록을 일괄 등록.
 * 외부 CDN 또는 다른 사이트의 이미지를 레퍼런스로 추가할 때 사용.
 *
 * 입력:
 *   {
 *     urls:           string | string[],   // 줄바꿈/쉼표 구분 또는 배열
 *     defaultTags?:   string[],
 *     source?:        string,              // 'designer'|'external'|'competitor'|'archive'|'other'
 *     analyzeWithAI?: boolean,             // 기본 false
 *     skipExisting?:  boolean,             // 기본 true
 *   }
 * ─────────────────────────────────────────────────────────────────
 */
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import ReferenceImage from '@/models/ReferenceImage';
import { extractTokensFromUrl } from '@/lib/ai-vision';

export const runtime = 'nodejs';
export const maxDuration = 300;

interface BulkUrlRequest {
  urls: string | string[];
  defaultTags?: string[];
  source?: string;
  analyzeWithAI?: boolean;
  skipExisting?: boolean;
  dryRun?: boolean;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as BulkUrlRequest;
    const {
      defaultTags = [],
      source = 'external',
      analyzeWithAI = false,
      skipExisting = true,
      dryRun = false,
    } = body;

    // ── 입력 정규화 ────────────────────────────────────────
    let urls: string[] = [];
    if (Array.isArray(body.urls)) {
      urls = body.urls.map((s) => s.trim());
    } else if (typeof body.urls === 'string') {
      urls = body.urls
        .split(/[\n,]+/)
        .map((s) => s.trim())
        .filter(Boolean);
    }

    urls = urls.filter((u) => /^https?:\/\//i.test(u));
    urls = Array.from(new Set(urls)); // 동일 입력 내 중복 제거

    if (urls.length === 0) {
      return NextResponse.json(
        { ok: false, message: '유효한 URL 이 없습니다.' },
        { status: 400 },
      );
    }

    if (dryRun) {
      return NextResponse.json({
        ok: true,
        dryRun: true,
        wouldRegister: urls.length,
        sample: urls.slice(0, 5),
      });
    }

    // ── 등록 ───────────────────────────────────────────────
    await connectToDatabase();
    const validSource = ['designer', 'external', 'competitor', 'archive', 'other'].includes(source)
      ? source
      : 'external';

    let registered = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const url of urls) {
      try {
        if (skipExisting) {
          const exists = await ReferenceImage.findOne({ imageUrl: url });
          if (exists) {
            skipped++;
            continue;
          }
        }

        let extractedTokens: any = undefined;
        if (analyzeWithAI) {
          try {
            extractedTokens = await extractTokensFromUrl(url);
            await new Promise((r) => setTimeout(r, 1500)); // Claude RPM 보호 (분당 40장)
          } catch (err: any) {
            errors.push(`${url}: AI 분석 실패 — ${err.message}`);
          }
        }

        await ReferenceImage.create({
          title: titleFromUrl(url),
          imageUrl: url,
          source: validSource,
          tags: defaultTags,
          extractedTokens,
        });
        registered++;
      } catch (err: any) {
        errors.push(`${url}: ${err.message}`);
      }
    }

    return NextResponse.json({
      ok: true,
      total: urls.length,
      registered,
      skipped,
      errorCount: errors.length,
      errors: errors.slice(0, 10),
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, message: err?.message ?? '실패' },
      { status: 500 },
    );
  }
}

function titleFromUrl(url: string): string {
  try {
    const u = new URL(url);
    const name = u.pathname.split('/').pop() || u.hostname;
    return name
      .replace(/\.[^.]+$/, '')
      .replace(/[_-]+/g, ' ')
      .trim();
  } catch {
    return url;
  }
}

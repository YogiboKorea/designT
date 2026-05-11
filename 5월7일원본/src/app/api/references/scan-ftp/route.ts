/**
 * POST /api/references/scan-ftp
 * ─────────────────────────────────────────────────────────────────
 * 지정된 FTP 디렉토리의 이미지 파일을 일괄 스캔해 ReferenceImage 로 등록.
 * 작년 작업물이 FTP 서버에 이미지로만 존재할 때 사용.
 *
 * 환경변수: 기존 /api/ftp 와 동일하게 FTP_HOST, FTP_USER, FTP_PASS 사용.
 *
 * 입력:
 *   {
 *     remoteDir:    string,          // FTP 절대 경로 (예: '/web/img/design/2024/')
 *     baseUrl:      string,          // 공개 베이스 URL
 *     skipExisting?: boolean,        // 기본 true
 *     analyzeWithAI?: boolean,       // 기본 false (대량일 때 비용/시간 고려)
 *     limit?:        number,         // 한 번에 처리할 최대 개수 (기본 100)
 *     dryRun?:       boolean,
 *     defaultTags?:  string[],
 *   }
 * ─────────────────────────────────────────────────────────────────
 */
import { NextRequest, NextResponse } from 'next/server';
import ftp from 'basic-ftp';
import { connectToDatabase } from '@/lib/mongodb';
import ReferenceImage from '@/models/ReferenceImage';
import { extractTokensFromUrl } from '@/lib/ai-vision';

export const runtime = 'nodejs';
export const maxDuration = 300;

interface ScanRequest {
  remoteDir: string;
  baseUrl: string;
  skipExisting?: boolean;
  analyzeWithAI?: boolean;
  limit?: number;
  dryRun?: boolean;
  defaultTags?: string[];
}

export async function POST(req: NextRequest) {
  const client = new ftp.Client();
  client.ftp.verbose = false;

  try {
    const body = (await req.json()) as ScanRequest;
    const {
      remoteDir,
      baseUrl,
      skipExisting = true,
      analyzeWithAI = false,
      limit = 100,
      dryRun = false,
      defaultTags = [],
    } = body;

    if (!remoteDir || !baseUrl) {
      return NextResponse.json(
        { ok: false, message: 'remoteDir, baseUrl 필수' },
        { status: 400 },
      );
    }

    // baseUrl 끝 슬래시 정규화
    const normBaseUrl = baseUrl.endsWith('/') ? baseUrl : baseUrl + '/';

    // ── FTP 접속 + 목록 ────────────────────────────────────
    await client.access({
      host: process.env.FTP_HOST || 'yogibo.ftp.cafe24.com',
      port: process.env.FTP_PORT ? Number(process.env.FTP_PORT) : 21,
      user: process.env.FTP_USER || '',
      password: process.env.FTP_PASS || '',
      secure: false,
    });

    const list = await client.list(remoteDir);

    // 이미지 파일만 필터링
    const images = list
      .filter(
        (f) =>
          f.isFile && /\.(jpe?g|png|webp|gif)$/i.test(f.name) && f.size > 0,
      )
      .slice(0, limit);

    if (dryRun) {
      return NextResponse.json({
        ok: true,
        dryRun: true,
        found: images.length,
        sample: images.slice(0, 5).map((f) => ({
          name: f.name,
          size: f.size,
          modifiedAt: f.modifiedAt,
          url: normBaseUrl + f.name,
        })),
      });
    }

    // ── 등록 처리 ──────────────────────────────────────────
    await connectToDatabase();
    let registered = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const file of images) {
      try {
        const url = normBaseUrl + file.name;

        if (skipExisting) {
          const existing = await ReferenceImage.findOne({ imageUrl: url });
          if (existing) {
            skipped++;
            continue;
          }
        }

        let extractedTokens: any = undefined;
        if (analyzeWithAI) {
          try {
            extractedTokens = await extractTokensFromUrl(url);
            // Claude RPM 보호 — 1.5초 간격 (분당 40장, Haiku 4.5 RPM 50 안전 마진)
            await new Promise((r) => setTimeout(r, 1500));
          } catch (err: any) {
            errors.push(`${file.name}: AI 분석 실패 — ${err.message}`);
          }
        }

        await ReferenceImage.create({
          title: titleFromFilename(file.name),
          imageUrl: url,
          source: 'archive',
          tags: [...defaultTags, ...tagsFromPath(remoteDir, file.name)],
          extractedTokens,
          note: `자동 임포트: ${remoteDir}`,
        });

        registered++;
      } catch (err: any) {
        errors.push(`${file.name}: ${err.message}`);
      }
    }

    return NextResponse.json({
      ok: true,
      scanned: images.length,
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
  } finally {
    client.close();
  }
}

// ────────────────────────────────────────────────────────────────
// 헬퍼
// ────────────────────────────────────────────────────────────────
function titleFromFilename(name: string): string {
  return name
    .replace(/\.[^.]+$/, '')
    .replace(/[_-]+/g, ' ')
    .trim();
}

function tagsFromPath(dir: string, filename: string): string[] {
  const tags = new Set<string>();
  const path = (dir + filename).toLowerCase();

  // 연도
  const yearMatch = path.match(/20\d{2}/);
  if (yearMatch) tags.add(yearMatch[0]);

  // 시즌
  if (/spring|봄/.test(path)) tags.add('spring');
  if (/summer|여름/.test(path)) tags.add('summer');
  if (/autumn|fall|가을/.test(path)) tags.add('autumn');
  if (/winter|겨울/.test(path)) tags.add('winter');

  // 유형
  if (/sale|세일|할인/.test(path)) tags.add('sale');
  if (/event|이벤트/.test(path)) tags.add('event');
  if (/banner|배너/.test(path)) tags.add('banner');
  if (/coupon|쿠폰/.test(path)) tags.add('coupon');
  if (/new|신상/.test(path)) tags.add('new');

  return Array.from(tags);
}

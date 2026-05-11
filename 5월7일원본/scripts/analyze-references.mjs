/**
 * scripts/analyze-references.mjs  (v2 — Claude 기반)
 * ─────────────────────────────────────────────────────────────────
 * 야간 배치 — extractedTokens 가 없는 ReferenceImage 를 일괄 분석.
 *
 * 일괄 등록 시 analyzeWithAI=false 로 빠르게 등록한 뒤,
 * 이 스크립트로 천천히 백필.
 *
 * 실행:
 *   node scripts/analyze-references.mjs                # 200건 처리
 *   node scripts/analyze-references.mjs --limit 50    # 50건만
 *   node scripts/analyze-references.mjs --dry-run     # 실제 호출 없이 확인
 *
 * 비용 (Haiku 4.5 기준):
 *   · 이미지 1장 + 프롬프트 ≒ 1700 입력 토큰 → $0.0017
 *   · 출력 JSON ≒ 200 토큰 → $0.001
 *   · 합계 약 $0.003 / 장
 *   · 100장 = $0.3
 *
 * Claude 레이트 리밋 (Tier 1 기본):
 *   · Haiku 4.5: RPM 50, ITPM 50,000, OTPM 10,000
 *   · 이미지 1장 ≒ 1500 토큰 → ITPM 기준 분당 33장 가능
 *   · 안전 마진 두고 1.5초 간격 (분당 40장)
 * ─────────────────────────────────────────────────────────────────
 */

// .env.local → .env → .env.development 순서로 시도 (Next.js 우선순위)
import dotenv from 'dotenv';
import path from 'path';
import { existsSync } from 'fs';
const candidates = ['.env.local', '.env.development.local', '.env.development', '.env'];
for (const f of candidates) {
  const fp = path.resolve(process.cwd(), f);
  if (existsSync(fp)) {
    dotenv.config({ path: fp });
    console.log(`📄 환경 파일 로드: ${f}`);
    break;
  }
}

import mongoose from 'mongoose';

// 인자 파싱
const args = process.argv.slice(2);
const limitIdx = args.indexOf('--limit');
const LIMIT =
  limitIdx >= 0 && args[limitIdx + 1] ? Number(args[limitIdx + 1]) : 200;
const DRY_RUN = args.includes('--dry-run');
const RPM_DELAY_MS = 1500;

const MONGODB_URI = process.env.MONGODB_URI;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = process.env.CLAUDE_VISION_MODEL || 'claude-haiku-4-5';

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI 미설정');
  process.exit(1);
}
if (!ANTHROPIC_API_KEY && !DRY_RUN) {
  console.error('❌ ANTHROPIC_API_KEY 미설정');
  process.exit(1);
}

// 모델 정의
const ReferenceImageSchema = new mongoose.Schema(
  {
    title: String,
    imageUrl: String,
    thumbnailUrl: String,
    source: String,
    tags: [String],
    note: String,
    hash: String,
    extractedTokens: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true },
);

const ReferenceImage =
  mongoose.models.ReferenceImage ||
  mongoose.model('ReferenceImage', ReferenceImageSchema, 'reference_images');

// ─────────────────────────────────────────────────────────────────
// Claude 호출
// ─────────────────────────────────────────────────────────────────
const PROMPT = `이 이커머스 이벤트 페이지/배너 이미지를 분석해 디자인 토큰을 추출하세요.
설명·마크다운·코드블록 금지. JSON 객체 하나만 출력.

스키마:
{
  "colors": { "primary": "#xxxxxx", "secondary": "#xxxxxx", "accent": "#xxxxxx", "background": "#xxxxxx" },
  "typography": { "headingScale": [48, 32, 24], "bodySize": 16 },
  "layout": "<레이아웃 구조 요약>",
  "tone": ["<3~5 키워드>"],
  "rationale": "<한 줄 설명>"
}`;

async function extractTokensFromUrl(url) {
  const imgRes = await fetch(url);
  if (!imgRes.ok) throw new Error(`다운로드 실패 (${imgRes.status})`);
  const buffer = Buffer.from(await imgRes.arrayBuffer());
  const base64 = buffer.toString('base64');
  let mediaType = (imgRes.headers.get('content-type') ?? 'image/jpeg')
    .split(';')[0]
    .trim()
    .toLowerCase();
  if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(mediaType)) {
    mediaType = 'image/jpeg';
  }

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1500,
      temperature: 0.3,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType, data: base64 },
            },
            { type: 'text', text: PROMPT },
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Claude 실패 (${res.status}): ${detail.slice(0, 200)}`);
  }

  const data = await res.json();
  const text = (data?.content ?? [])
    .filter((b) => b?.type === 'text')
    .map((b) => b.text ?? '')
    .join('\n');

  if (!text) throw new Error('Claude 응답이 비어 있습니다');

  // JSON 파싱 (코드블록/잡음 제거)
  const cleaned = text
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```\s*$/, '')
    .trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  const json = start >= 0 && end > start ? cleaned.slice(start, end + 1) : cleaned;
  return { tokens: JSON.parse(json), usage: data?.usage };
}

// ─────────────────────────────────────────────────────────────────
// 메인
// ─────────────────────────────────────────────────────────────────
async function main() {
  console.log('🔌 MongoDB 연결 중…');
  await mongoose.connect(MONGODB_URI);
  console.log('✅ 연결됨');

  const targets = await ReferenceImage.find({
    $or: [
      { extractedTokens: { $exists: false } },
      { extractedTokens: null },
    ],
  })
    .sort({ createdAt: 1 })
    .limit(LIMIT);

  console.log(`📋 미분석 레퍼런스: ${targets.length}건 (모델: ${MODEL})`);

  if (DRY_RUN) {
    console.log('--- DRY RUN ---');
    targets.slice(0, 5).forEach((t, i) => {
      console.log(`  ${i + 1}. ${t.title} (${t.imageUrl})`);
    });
    await mongoose.disconnect();
    return;
  }

  let success = 0;
  let failed = 0;
  let totalIn = 0;
  let totalOut = 0;

  for (let i = 0; i < targets.length; i++) {
    const item = targets[i];
    const progress = `[${i + 1}/${targets.length}]`;
    try {
      console.log(`${progress} 분석 중: ${item.title}`);
      const { tokens, usage } = await extractTokensFromUrl(item.imageUrl);
      item.extractedTokens = tokens;
      await item.save();
      success++;
      totalIn += usage?.input_tokens ?? 0;
      totalOut += usage?.output_tokens ?? 0;
      console.log(
        `${progress} ✅ 완료 (tone: ${tokens.tone?.join(', ')}) — ` +
          `${usage?.input_tokens ?? 0} in / ${usage?.output_tokens ?? 0} out`,
      );
    } catch (err) {
      failed++;
      console.error(`${progress} ❌ 실패: ${err.message}`);
    }

    if (i < targets.length - 1) {
      await new Promise((r) => setTimeout(r, RPM_DELAY_MS));
    }
  }

  // 비용 추정 (Haiku 4.5 기준: $1/$5)
  const estCost = (totalIn / 1_000_000) * 1 + (totalOut / 1_000_000) * 5;

  console.log('');
  console.log('═══════════════════════════════════');
  console.log(`✅ 성공: ${success}건`);
  console.log(`❌ 실패: ${failed}건`);
  console.log(`📊 토큰: 입력 ${totalIn} / 출력 ${totalOut}`);
  console.log(`💰 추정 비용: $${estCost.toFixed(4)} (모델: ${MODEL})`);
  console.log('═══════════════════════════════════');

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('💥 치명적 오류:', err);
  process.exit(1);
});

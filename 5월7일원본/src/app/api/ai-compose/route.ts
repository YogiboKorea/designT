/**
 * POST /api/ai-compose  (v2 — Claude 기반)
 * ─────────────────────────────────────────────────────────────────
 * 입력: { mainText, discount, sectionType?, referenceCount? }
 * 처리:
 *   1. EventPage 에서 isReference=true 작업물 N개 조회 (Tier 1)
 *   2. ReferenceImage 에서 추출된 토큰 M개 조회 (Tier 2)
 *   3. Claude 에 두 가지를 모두 전달해 SectionData 생성
 *   4. id 재할당 + 안전장치 후 반환
 * 응답: { ok: true, section: SectionData, usedReferences: { tier1, tier2 } }
 *
 * 모델 선택:
 *   - Sonnet 4.6 ($3/$15 per MTok) — JSON 구조 생성 품질이 Haiku 보다 안정적
 *   - 환경변수 CLAUDE_COMPOSE_MODEL 로 변경 가능 (예: claude-haiku-4-5)
 *
 * 비용 추정 (월 500건 기준, 캐싱/배치 미적용):
 *   · 입력: 레퍼런스 5개 × 평균 800토큰 = 4000 토큰
 *   · 출력: 평균 600 토큰
 *   · 건당: (4000 × $3 + 600 × $15) / 1M = $0.021
 *   · 월: $0.021 × 500 = $10.5
 * ─────────────────────────────────────────────────────────────────
 */
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import EventPage from '@/models/EventPage';
import ReferenceImage from '@/models/ReferenceImage';

export const runtime = 'nodejs';
export const maxDuration = 60;

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';

interface ComposeRequest {
  mainText: string;
  discount: number;
  sectionType?: 'main' | 'coupon' | 'product';
  referenceCount?: number;
  filterTags?: string[];
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { ok: false, message: 'ANTHROPIC_API_KEY 미설정 (.env.local)' },
        { status: 500 },
      );
    }

    const body = (await req.json()) as ComposeRequest;
    const {
      mainText,
      discount,
      sectionType = 'main',
      referenceCount = 5,
      filterTags = [],
    } = body;

    if (!mainText?.trim() || typeof discount !== 'number') {
      return NextResponse.json(
        { ok: false, message: 'mainText, discount 는 필수입니다.' },
        { status: 400 },
      );
    }

    await connectToDatabase();

    // ── Tier 1: 빌더 작업물 (정확한 SectionData) ──────────────
    const tier1Query: any = { isReference: true };
    if (filterTags.length) {
      tier1Query.referenceTags = { $in: filterTags };
    }
    const refDocs = await EventPage.find(tier1Query)
      .sort({ updatedAt: -1 })
      .limit(referenceCount)
      .lean();

    const referenceSections = refDocs
      .flatMap((p: any) => p.sections ?? [])
      .filter((s: any) => s.type === sectionType)
      .slice(0, referenceCount);

    // ── Tier 2: 외부 이미지 레퍼런스의 토큰 ──────────────────
    const tier2Query: any = { extractedTokens: { $exists: true, $ne: null } };
    if (filterTags.length) {
      tier2Query.tags = { $in: filterTags };
    }
    const tier2Docs = await ReferenceImage.find(tier2Query)
      .sort({ createdAt: -1 })
      .limit(3)
      .lean();
    const externalTokens = tier2Docs
      .map((r: any) => r.extractedTokens)
      .filter(Boolean);

    if (referenceSections.length === 0 && externalTokens.length === 0) {
      return NextResponse.json(
        {
          ok: false,
          message:
            '레퍼런스가 없습니다. /references/import 에서 작년 작업물 또는 외부 이미지를 먼저 등록해주세요.',
        },
        { status: 404 },
      );
    }

    // ── Claude 호출 ──────────────────────────────────────────
    const { systemPrompt, userPrompt } = buildComposePrompts({
      mainText,
      discount,
      references: referenceSections,
      externalTokens,
      sectionType,
    });

    const model = process.env.CLAUDE_COMPOSE_MODEL || 'claude-sonnet-4-6';

    const claudeRes = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': ANTHROPIC_VERSION,
      },
      body: JSON.stringify({
        model,
        max_tokens: 4000,
        temperature: 0.6,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });

    if (!claudeRes.ok) {
      const detail = await claudeRes.text();
      let friendly = `Claude 호출 실패 (${claudeRes.status})`;
      if (claudeRes.status === 429) {
        friendly = 'Claude API 레이트 리밋 초과. 잠시 후 다시 시도하세요.';
      } else if (claudeRes.status === 529) {
        friendly = 'Claude API 일시 과부하. 1~2분 후 다시 시도하세요.';
      } else if (claudeRes.status === 401) {
        friendly = 'ANTHROPIC_API_KEY 가 유효하지 않습니다.';
      } else if (claudeRes.status === 400) {
        friendly = '요청 형식 오류. detail 을 확인하세요.';
      }
      return NextResponse.json(
        { ok: false, message: friendly, detail },
        { status: 502 },
      );
    }

    const data = await claudeRes.json();
    const raw = (data?.content ?? [])
      .filter((b: any) => b?.type === 'text')
      .map((b: any) => b.text ?? '')
      .join('\n');

    if (!raw) {
      return NextResponse.json(
        { ok: false, message: 'Claude 응답이 비어 있습니다.' },
        { status: 500 },
      );
    }

    let composed: any;
    try {
      composed = parseJsonStrict(raw);
    } catch {
      return NextResponse.json(
        { ok: false, message: 'AI 응답 JSON 파싱 실패', raw },
        { status: 500 },
      );
    }

    // ── 후처리 — id 재할당 + 안전장치 ────────────────────────
    const baseId = Date.now().toString();
    const finalSection: any = {
      ...composed,
      type: sectionType,
      id: baseId,
      texts: (composed.texts ?? []).map((t: any, i: number) => ({
        ...t,
        id: `${baseId}-t${i + 1}`,
        text: i === 0 ? mainText : (t.text ?? ''),
      })),
      stickers: [],
      templateVars: {
        ...(composed.templateVars ?? {}),
        discount,
      },
    };

    if (sectionType === 'main') {
      finalSection.bgImage = finalSection.bgImage ?? '';
    } else if (sectionType === 'coupon') {
      finalSection.bgColor = finalSection.bgColor ?? '#ffffff';
      finalSection.bgImage = finalSection.bgImage ?? '';
      finalSection.coupons = finalSection.coupons ?? [];
    } else if (sectionType === 'product') {
      finalSection.layout = finalSection.layout ?? 'uniform';
      finalSection.columns = finalSection.columns ?? 2;
      finalSection.products = finalSection.products ?? [];
    }

    return NextResponse.json({
      ok: true,
      section: finalSection,
      usedReferences: {
        tier1: referenceSections.length,
        tier2: externalTokens.length,
      },
      usage: data?.usage,
    });
  } catch (err: any) {
    console.error('[ai-compose] 오류:', err);
    return NextResponse.json(
      { ok: false, message: err?.message ?? '알 수 없는 오류' },
      { status: 500 },
    );
  }
}

// ════════════════════════════════════════════════════════════════
// 프롬프트 빌더 — Claude 의 system / user 분리 구조 활용
// ════════════════════════════════════════════════════════════════
function buildComposePrompts(args: {
  mainText: string;
  discount: number;
  references: any[];
  externalTokens: any[];
  sectionType: string;
}) {
  const { mainText, discount, references, externalTokens, sectionType } = args;

  const compressedRefs = references.map((s, i) => ({
    ref_index: i + 1,
    templateId: s.templateId,
    bgColor: s.bgColor,
    bgGradient: s.bgGradient,
    texts: (s.texts ?? []).map((t: any) => ({
      text: t.text,
      position: t.position,
      style: {
        color: t.style?.color,
        fontSize: t.style?.fontSize,
        fontWeight: t.style?.fontWeight,
        textAlign: t.style?.textAlign,
        backgroundColor: t.style?.backgroundColor,
        isPill: t.style?.isPill,
        width: t.style?.width,
      },
    })),
    templateVars: s.templateVars,
  }));

  const systemPrompt = `당신은 이커머스 이벤트 페이지 디자인 자동화 엔지니어입니다.
과거 채택된 작업물의 디자인 패턴을 학습한 뒤, 새로운 입력으로 동일한 톤의 신규 섹션을 생성합니다.

[규칙]
1. Tier 1 의 텍스트 위치(position.x/y), 스타일(color/fontSize/fontWeight/textAlign) 평균값을 따라 신규 텍스트를 배치한다.
2. Tier 2 의 컬러 팔레트와 톤 키워드는 보조 가이드로 활용한다 (Tier 1 우선).
3. 신규 섹션은 1~3개 텍스트만 생성 (대표 텍스트 + 필요시 보조 + CTA).
4. 첫 번째 텍스트는 사용자가 입력한 대표 텍스트를 그대로 사용한다.
5. 할인율은 templateVars.discount 에 주입.
6. 스티커는 자동 추가하지 않는다.
7. templateId 는 Tier 1 에서 가장 빈도 높은 것. 모두 다르거나 비어있으면 빈 문자열.
8. 출력은 SectionData JSON 객체 하나만. 설명·마크다운·코드블록 일체 금지.`;

  const userPrompt = `[Tier 1 — 빌더 작업물 ${references.length}개 (정확한 SectionData)]
${JSON.stringify(compressedRefs, null, 2)}

[Tier 2 — 외부 이미지 레퍼런스에서 추출된 톤 가이드 ${externalTokens.length}개]
${JSON.stringify(externalTokens, null, 2)}

[새로운 입력]
- sectionType: "${sectionType}"
- mainText:    "${mainText}"
- discount:    ${discount}

[출력 스키마]
{
  "type": "${sectionType}",
  "id": "",
  "templateId": "",
  "bgImage": "",
  "bgColor": "#ffffff",
  "bgGradient": "",
  "texts": [
    {
      "id": "",
      "text": "${mainText}",
      "position": { "x": 100, "y": 80 },
      "style": {
        "color": "#252525",
        "fontSize": 48,
        "fontWeight": 800,
        "textAlign": "left",
        "width": 600
      }
    }
  ],
  "stickers": [],
  "templateVars": { "discount": ${discount} }
}

위 스키마에 맞춰 JSON 객체 하나만 출력하시오.`;

  return { systemPrompt, userPrompt };
}

function parseJsonStrict(raw: string): any {
  const cleaned = raw
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```\s*$/, '')
    .trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  const json = start >= 0 && end > start ? cleaned.slice(start, end + 1) : cleaned;
  return JSON.parse(json);
}

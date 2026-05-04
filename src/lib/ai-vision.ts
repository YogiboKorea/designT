/**
 * Claude Vision 공통 모듈.
 * ──────────────────────────────────────────────────────────────────
 * Gemini → Claude Haiku 4.5 로 전환 (v2).
 *
 * 모델 선택:
 *   - Haiku 4.5 ($1/$5 per MTok) — 이미지 분석 정도엔 충분, 가장 저렴
 *   - 필요 시 Sonnet 4.6 으로 변경 가능 (CLAUDE_VISION_MODEL 환경변수)
 *
 * 무료티어 없음 — 모든 호출이 과금되지만, 이미지 1장당 ~0.001 USD 수준
 *   · 입력: 이미지 1장 ≒ 1500 토큰 + 프롬프트 200 토큰 = 1700 → $0.0017
 *   · 출력: JSON 약 200 토큰 → $0.001
 *   · 합산 약 0.003 USD, 100건 분석해도 0.3 USD
 *
 * 환경변수:
 *   ANTHROPIC_API_KEY      — 필수
 *   CLAUDE_VISION_MODEL    — 선택, 기본 'claude-haiku-4-5'
 *
 * 주의:
 *   기존 GEMINI_API_KEY 는 더 이상 사용하지 않음.
 *   유출된 키는 Google AI Studio 에서 즉시 폐기 권장.
 * ──────────────────────────────────────────────────────────────────
 */

export interface ExtractedDesignTokens {
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
  };
  typography: {
    headingScale: number[];
    bodySize: number;
  };
  layout: string;
  tone: string[];
  rationale: string;
}

const TOKEN_EXTRACTION_PROMPT = `이 이커머스 이벤트 페이지/배너 이미지를 분석해 디자인 토큰을 추출하세요.
설명·마크다운·코드블록 금지. 반드시 JSON 객체 하나만 출력합니다.

스키마:
{
  "colors": {
    "primary":    "#xxxxxx",
    "secondary":  "#xxxxxx",
    "accent":     "#xxxxxx",
    "background": "#xxxxxx"
  },
  "typography": {
    "headingScale": [48, 32, 24],
    "bodySize": 16
  },
  "layout": "<예: left-text-right-product, centered, top-banner-bottom-text>",
  "tone": ["<3~5개 키워드>"],
  "rationale": "<한 줄 분석 코멘트>"
}`;

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';

function getModel() {
  return process.env.CLAUDE_VISION_MODEL || 'claude-haiku-4-5';
}

/**
 * URL 로부터 이미지를 받아 디자인 토큰 추출.
 */
export async function extractTokensFromUrl(
  url: string,
): Promise<ExtractedDesignTokens> {
  const imgRes = await fetch(url);
  if (!imgRes.ok) {
    throw new Error(`이미지 다운로드 실패 (${imgRes.status}): ${url}`);
  }
  const buffer = Buffer.from(await imgRes.arrayBuffer());
  const base64 = buffer.toString('base64');
  const mediaType = imgRes.headers.get('content-type') ?? 'image/jpeg';
  return extractTokensFromBase64(base64, mediaType);
}

/**
 * Base64 이미지 → 디자인 토큰 추출.
 */
export async function extractTokensFromBase64(
  base64: string,
  mediaType: string,
): Promise<ExtractedDesignTokens> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY 미설정');

  const cleanBase64 = base64.replace(/^data:[^;]+;base64,/, '');

  // Claude Vision 은 image/jpeg, image/png, image/gif, image/webp 만 허용
  let cleanType = mediaType.split(';')[0].trim().toLowerCase();
  if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(cleanType)) {
    cleanType = 'image/jpeg';
  }

  const requestBody = {
    model: getModel(),
    max_tokens: 1500,
    temperature: 0.3,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: cleanType,
              data: cleanBase64,
            },
          },
          { type: 'text', text: TOKEN_EXTRACTION_PROMPT },
        ],
      },
    ],
  };

  const callClaude = async () =>
    fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': ANTHROPIC_VERSION,
      },
      body: JSON.stringify(requestBody),
    });

  // 재시도: 즉시 → 1초 → 3초 (overload, rate-limit 대비)
  const delays = [0, 1000, 3000];
  let lastErr = '';

  for (const delay of delays) {
    if (delay) await new Promise((r) => setTimeout(r, delay));
    const res = await callClaude();

    if (res.ok) {
      const data = await res.json();
      const text = extractTextFromResponse(data);
      if (!text) throw new Error('Claude 응답이 비어 있습니다');
      return parseJsonStrict(text);
    }

    lastErr = `${res.status} — ${await res.text().catch(() => '')}`;
    // 재시도 가능한 상태만 재시도
    if (![429, 500, 502, 503, 529].includes(res.status)) break;
  }

  throw new Error(`Claude Vision 분석 실패: ${lastErr}`);
}

/**
 * Claude messages 응답에서 텍스트 블록만 합쳐서 반환.
 */
function extractTextFromResponse(data: any): string {
  const blocks = data?.content;
  if (!Array.isArray(blocks)) return '';
  return blocks
    .filter((b: any) => b?.type === 'text')
    .map((b: any) => b.text ?? '')
    .join('\n');
}

/**
 * 모델이 가끔 ```json ... ``` 로 감쌀 수 있으므로 정리 후 파싱.
 */
function parseJsonStrict(raw: string): ExtractedDesignTokens {
  const cleaned = raw
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```\s*$/, '')
    .trim();

  // 첫 { 부터 마지막 } 까지로 자르기 (모델이 부가 텍스트 붙였을 때 보호)
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  const json = start >= 0 && end > start ? cleaned.slice(start, end + 1) : cleaned;

  return JSON.parse(json);
}

/**
 * 단순 hex 정규화. 6자리 또는 3자리만 허용, 그 외엔 fallback.
 */
export function normalizeHex(input: string | undefined, fallback: string): string {
  if (!input) return fallback;
  const v = input.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(v)) return v.toUpperCase();
  if (/^#[0-9a-fA-F]{3}$/.test(v)) {
    const c = v.slice(1);
    return ('#' + c.split('').map((x) => x + x).join('')).toUpperCase();
  }
  return fallback;
}

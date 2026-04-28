/**
 * POST /api/ai-layout
 * ─────────────────────────────────────────────────────────────────
 * 이미지를 분석해 메인 비주얼 레이아웃·색상 스펙을 JSON 으로 반환한다.
 *
 *  사용 모델: Google Gemini 2.5 Flash (무료 티어)
 *    · GEMINI_API_KEY 환경변수 필요 (.env.local)
 *    · 무료 티어 한도 (2026.04 기준): 10 RPM, 250 RPD, 250,000 TPM
 *    · 신용카드 등록 불필요 — https://aistudio.google.com 에서 키 발급
 *
 *  요청 바디:
 *    {
 *      imageBase64: string,
 *      mediaType:   string,
 *      device:      'mobile' | 'web',
 *      canvas:      { width: number, height: number },
 *      textCount:   number,
 *    }
 *
 *  응답:
 *    { ok: true, layout: AILayoutSpec }  또는
 *    { ok: false, message: string }
 * ─────────────────────────────────────────────────────────────────
 */
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 60;

// ============================================================================
// 응답 스펙
// ============================================================================
export interface AILayoutTextSlot {
  x: number;
  y: number;
  width: number;
  fontSize: number;
  fontWeight: number;
  color: string;
  textAlign: 'left' | 'center' | 'right';
  role: 'subtitle' | 'title' | 'description' | 'cta' | 'other';
}

export interface AILayoutSpec {
  subjectBox: { x: number; y: number; width: number; height: number };
  textZone: 'top' | 'bottom' | 'left' | 'right' | 'center';
  palette: { primary: string; secondary: string; accent: string };
  gradient: { angle: number; color: string };
  textSlots: AILayoutTextSlot[];
  rationale?: string;
}

// ============================================================================
// 프롬프트
// ============================================================================
function buildPrompt(canvasW: number, canvasH: number, textCount: number) {
  return `너는 이커머스 메인 비주얼 배너의 비주얼 디자이너다.
업로드된 상품/제품 이미지를 분석해, ${canvasW}×${canvasH}px 캔버스에 들어갈 레이아웃 스펙을 JSON 으로만 반환한다.

목표:
  1. 이미지에서 피사체(상품)가 차지하는 영역을 추정한다 (정규화 0~1 좌표).
  2. 피사체 반대편 빈 공간에 텍스트를 배치하라. 피사체 위에 글자 겹치지 마라.
  3. 텍스트 색상은 배경(피사체 주변/그라데이션)과 충분한 명도 대비(WCAG AA 이상)를 갖도록 정한다.
  4. 텍스트 슬롯은 정확히 ${textCount}개를 반환하라. 보통 순서는 [subtitle → title → description → cta].
  5. 폰트 크기 위계: title(60~96px) > subtitle(28~42px) ≈ description(22~32px) > cta(24~30px).
  6. 색상은 이미지에서 실제로 추출된 색을 우선 사용한다. 배경이 어두우면 텍스트 흰색, 밝으면 진한 회색(#252525) 권장.

엄격한 출력 규칙:
  - JSON 외 어떠한 텍스트도 절대 출력하지 않는다.
  - subjectBox 의 x/y/width/height 는 0~1 사이 소수.
  - textSlots[i].x, .y, .width 는 정수 px (캔버스 ${canvasW}×${canvasH} 안).
  - 모든 hex 컬러는 #RRGGBB 6자리.

반환 JSON 스키마:
{
  "subjectBox": { "x": 0.5, "y": 0.3, "width": 0.4, "height": 0.5 },
  "textZone": "left",
  "palette": { "primary": "#xxxxxx", "secondary": "#xxxxxx", "accent": "#xxxxxx" },
  "gradient": { "angle": 90, "color": "#xxxxxx" },
  "textSlots": [
    {
      "x": 80, "y": 120, "width": 480,
      "fontSize": 38, "fontWeight": 700,
      "color": "#xxxxxx", "textAlign": "left",
      "role": "subtitle"
    }
  ],
  "rationale": "한 줄 분석 코멘트"
}

${canvasW}×${canvasH} 캔버스용 레이아웃 JSON 을 ${textCount}개의 textSlots 로 반환하라. JSON 만 출력.`;
}

// ============================================================================
// POST 핸들러
// ============================================================================
export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          ok: false,
          message:
            'GEMINI_API_KEY 가 설정되지 않았습니다. .env.local 에 GEMINI_API_KEY=... 추가 후 dev 서버를 재시작하세요. 키 발급: https://aistudio.google.com',
        },
        { status: 500 },
      );
    }

    const body = await req.json();
    const {
      imageBase64,
      mediaType = 'image/png',
      canvas,
      textCount = 4,
    } = body as {
      imageBase64: string;
      mediaType?: string;
      device?: 'mobile' | 'web';
      canvas: { width: number; height: number };
      textCount?: number;
    };

    if (!imageBase64 || !canvas?.width || !canvas?.height) {
      return NextResponse.json(
        { ok: false, message: 'imageBase64, canvas.width, canvas.height 는 필수입니다.' },
        { status: 400 },
      );
    }

    const cleanBase64 = imageBase64.replace(/^data:[^;]+;base64,/, '');

    // ─── Gemini API 호출 (자동 재시도 + 모델 폴백) ────────────────
    //  503 (UNAVAILABLE) 은 서버 과부하 — 재시도하면 거의 해결됨.
    //  Exponential backoff: 1s → 2s → 4s → 마지막엔 lite 모델로 폴백.
    const prompt = buildPrompt(canvas.width, canvas.height, textCount);

    const requestBody = {
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                mimeType: mediaType,
                data: cleanBase64,
              },
            },
            { text: prompt },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.4,
        maxOutputTokens: 2000,
      },
    };

    const callGemini = async (modelName: string) => {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${encodeURIComponent(apiKey)}`;
      return fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });
    };

    // 시도 순서: flash → flash (재시도) → flash (재시도) → flash-lite (폴백)
    const attempts: Array<{ model: string; delay: number; label: string }> = [
      { model: 'gemini-2.5-flash',      delay: 0,    label: '1차' },
      { model: 'gemini-2.5-flash',      delay: 1000, label: '2차 재시도' },
      { model: 'gemini-2.5-flash',      delay: 2000, label: '3차 재시도' },
      { model: 'gemini-2.5-flash-lite', delay: 2000, label: 'Lite 폴백' },
    ];

    let geminiRes: Response | null = null;
    let lastErrText = '';
    let lastStatus = 0;

    for (const attempt of attempts) {
      if (attempt.delay > 0) {
        await new Promise((r) => setTimeout(r, attempt.delay));
      }
      console.log(`[ai-layout] Gemini 호출 ${attempt.label} (${attempt.model})`);
      const res = await callGemini(attempt.model);

      // 200 OK 면 즉시 종료
      if (res.ok) {
        geminiRes = res;
        break;
      }

      lastStatus = res.status;
      lastErrText = await res.text();

      // 503 / 429 / 500 만 재시도 — 그 외(400 키 오류 등)는 즉시 중단
      const retryable = res.status === 503 || res.status === 429 || res.status === 500;
      if (!retryable) {
        geminiRes = res;
        // body 는 이미 read 했으니 새 Response 로 감싸 다시 사용 가능하게
        geminiRes = new Response(lastErrText, { status: res.status, statusText: res.statusText });
        break;
      }
      console.log(`[ai-layout] ${attempt.label} 실패 (${res.status}), 다음 시도 진행`);
    }

    // 모든 시도 실패
    if (!geminiRes || !geminiRes.ok) {
      const status = geminiRes?.status ?? lastStatus;
      const errText = geminiRes ? (geminiRes.ok ? '' : await geminiRes.text().catch(() => lastErrText)) : lastErrText;

      let friendly = `Gemini API 호출 실패 (${status})`;
      if (status === 400 && errText.includes('API key not valid')) {
        friendly = 'GEMINI_API_KEY 가 유효하지 않습니다. https://aistudio.google.com 에서 키를 다시 발급받아주세요.';
      } else if (status === 429) {
        friendly = 'Gemini 무료 티어 사용량 한도 초과 (분당 10회 / 일일 250회). 잠시 후 다시 시도해주세요.';
      } else if (status === 403) {
        friendly = 'Gemini API 권한 오류. 키가 올바른지 확인해주세요.';
      } else if (status === 503) {
        friendly = 'Gemini 서버가 일시적으로 과부하 상태입니다 (3회 재시도 후에도 실패). 잠시(1~2분) 후 다시 시도해주세요. 본인의 코드/키 문제가 아니며, Google 서버 문제입니다.';
      }
      return NextResponse.json(
        { ok: false, message: friendly, detail: errText },
        { status: 502 },
      );
    }

    const data = await geminiRes.json();
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

    if (!raw) {
      return NextResponse.json(
        { ok: false, message: 'Gemini 응답이 비어 있습니다.', detail: data },
        { status: 500 },
      );
    }

    const jsonStr = raw
      .replace(/```json\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim();

    let layout: AILayoutSpec;
    try {
      layout = JSON.parse(jsonStr);
    } catch (err) {
      return NextResponse.json(
        { ok: false, message: 'AI 응답이 JSON 형식이 아닙니다.', raw },
        { status: 500 },
      );
    }

    // ─── 후처리 — 안전 범위로 클램프 ────────────────────────────
    layout.textSlots = (layout.textSlots ?? []).slice(0, textCount).map((s) => ({
      x: clamp(Math.round(s.x ?? 0), 0, canvas.width),
      y: clamp(Math.round(s.y ?? 0), 0, canvas.height),
      width: clamp(Math.round(s.width ?? canvas.width * 0.6), 100, canvas.width),
      fontSize: clamp(Math.round(s.fontSize ?? 32), 12, 200),
      fontWeight: clamp(Math.round(s.fontWeight ?? 600), 100, 900),
      color: normalizeHex(s.color, '#252525'),
      textAlign: (['left', 'center', 'right'].includes(s.textAlign) ? s.textAlign : 'left') as
        | 'left'
        | 'center'
        | 'right',
      role: (['subtitle', 'title', 'description', 'cta', 'other'].includes(s.role) ? s.role : 'other') as AILayoutTextSlot['role'],
    }));

    if (layout.palette) {
      layout.palette = {
        primary: normalizeHex(layout.palette.primary, '#F2E2CB'),
        secondary: normalizeHex(layout.palette.secondary, '#252525'),
        accent: normalizeHex(layout.palette.accent, '#45B3C2'),
      };
    }
    if (layout.gradient) {
      layout.gradient = {
        angle: clamp(Math.round(layout.gradient.angle ?? 180), 0, 359),
        color: normalizeHex(layout.gradient.color, '#F2E2CB'),
      };
    }

    return NextResponse.json({ ok: true, layout });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, message: err?.message ?? '알 수 없는 오류' },
      { status: 500 },
    );
  }
}

// ============================================================================
// 헬퍼
// ============================================================================
function clamp(n: number, min: number, max: number) {
  if (Number.isNaN(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function normalizeHex(input: string | undefined, fallback: string): string {
  if (!input) return fallback;
  const v = input.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(v)) return v.toUpperCase();
  if (/^#[0-9a-fA-F]{3}$/.test(v)) {
    const c = v.slice(1);
    return ('#' + c.split('').map((x) => x + x).join('')).toUpperCase();
  }
  return fallback;
}

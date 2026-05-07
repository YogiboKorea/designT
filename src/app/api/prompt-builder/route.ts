/**
 * POST /api/prompt-builder
 * ─────────────────────────────────────────────────────────────────
 * MD 의 단순 입력 → Claude 가 도구별 형식에 맞는 정교한 프롬프트로 변환.
 *
 * 입력 예시:
 *   {
 *     templateId: "anniversary",
 *     fields: { occasion: "mothers-day", mainCopy: "어버이날 감사 세일", discount: 30, ... },
 *     referenceUrls: ["https://yogibo.kr/.../04_jp_04.webp"],
 *     referenceTokens: [{ colors: {...}, tone: [...] }],
 *     targetTool: "midjourney",
 *     aspectRatio: "16:9"
 *   }
 *
 * 응답:
 *   {
 *     ok: true,
 *     prompt: "... 정교화된 프롬프트 ...",
 *     usage: { input_tokens, output_tokens }
 *   }
 *
 * 비용: Claude Haiku 4.5, 1회 ~$0.005
 * ─────────────────────────────────────────────────────────────────
 */
import { NextRequest, NextResponse } from 'next/server';
import { TOOL_USAGE_GUIDES, DESIGN_CODES, ASPECT_RATIOS } from '../../../data/campaign-templates';

export const runtime = 'nodejs';
export const maxDuration = 30;

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';

interface BuilderRequest {
  templateId: string;
  templateContext?: string;       // 양식의 contextForAI
  fields: Record<string, any>;
  /** 등록된 갤러리에서 선택한 레퍼런스 이미지 URL */
  referenceUrls?: string[];
  referenceTokens?: any[];
  /** "대표 이미지" — MD 가 직접 첨부한 메인 비주얼 또는 모델/제품 사진 */
  mainImageUrl?: string;
  /** 대표 이미지 보존 강도 — mainImageUrl 있을 때만 의미 */
  preservationMode?: 'free' | 'similar' | 'strict' | 'overlay-only';
  /** 대표 이미지 보존 강도에 대응하는 영문 지시문 (UI 에서 미리 매핑한 값 전달) */
  preservationInstruction?: string;
  /** 제품 정보 — 카테고리 + 변형 + 사용 시나리오 + (선택) 라이브러리 제품 */
  productInfo?: {
    categoryId?: string;            // 'beanbag' | 'body-pillow' | 'plush'
    categoryNameEn?: string;        // 'Beanbag' 등
    visualDefinition?: string;      // 카테고리 정의 (영문, 길이 ~500자)
    variantHint?: string;           // 변형의 visualHint
    sceneEn?: string;               // 사용 시나리오 영문
    /** 라이브러리에서 선택한 실제 Yogibo 제품 — 있으면 AI 가 정확한 제품을 그릴 수 있음 */
    productImageUrl?: string;       // FTP 에 등록된 공식 제품 사진 URL
    productNameEn?: string;         // 'Mate Bear Pink' 등
    productNameKr?: string;         // 'Mate 베어 핑크' 등
    productVisualNotes?: string;    // '둥근 곰돌이 형태, 핑크색...'
    productTags?: string[];         // ['핑크','대형','베스트셀러']
  };
  targetTool: string;             // 'chatgpt' | 'midjourney' | 'gemini' | 'fal' | 'nanobanana'
  aspectRatio?: string;

  /** 이벤트 운영 정보 — 기간/CTA/라벨/유의사항. 모든 양식에 공통. */
  eventOperation?: {
    startDate?: string;        // 'YYYY-MM-DD'
    endDate?: string;
    dateFormat?: string;       // 'kr-short' 등 → 미리 포맷된 문자열로 전달됨
    formattedDate?: string;    // UI 에서 미리 포맷한 결과 (예: '5.1(목) ~ 5.11(일)')
    ctaText?: string;
    ctaStyle?: string;
    ctaStyleHint?: string;     // CTA_BUTTON_STYLES 의 aiHint
    headerLabel?: string;
    headerLabelStyle?: string;
    headerLabelStyleHint?: string;
    disclaimer?: string;
  };

  /** 결과 다양화 옵션 — 같은 입력이라도 매번 다른 결과 */
  variations?: {
    cameraAngle?: string;
    cameraAngleHint?: string;
    modelPose?: string;
    modelPoseHint?: string;
    peopleComposition?: string;
    peopleCompositionHint?: string;
    lightingTime?: string;
    lightingTimeHint?: string;
  };
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

    const body = (await req.json()) as BuilderRequest;
    const {
      templateId,
      templateContext = '',
      fields,
      referenceUrls = [],
      referenceTokens = [],
      mainImageUrl: rawMainImageUrl = '',
      preservationMode = 'similar',
      preservationInstruction = '',
      productInfo,
      targetTool,
      aspectRatio = '1920x680',
      eventOperation,
      variations,
    } = body;

    if (!templateId || !fields || !targetTool) {
      return NextResponse.json(
        { ok: false, message: 'templateId, fields, targetTool 은 필수입니다.' },
        { status: 400 },
      );
    }

    // ⭐ 핵심 — 대표 이미지가 비었지만 라이브러리에서 제품을 선택했다면
    //    그 제품 사진을 자동으로 mainImageUrl 로 사용한다.
    //    (사용자가 "라이브러리에서 선택" = "대표 이미지로 그걸 사용"이라는 의도)
    const mainImageUrl =
      rawMainImageUrl || productInfo?.productImageUrl || '';

    // ⭐ 라이브러리에서 자동 fallback 됐는지 (UI/응답에서 알려주기 위해)
    const usedLibraryAsMain =
      !rawMainImageUrl && !!productInfo?.productImageUrl;

    const { systemPrompt, userPrompt } = buildRefinementPrompts({
      templateId,
      templateContext,
      fields,
      referenceUrls,
      referenceTokens,
      mainImageUrl,
      preservationMode,
      preservationInstruction,
      productInfo,
      targetTool,
      aspectRatio,
      eventOperation,
      variations,
    });

    const model = process.env.CLAUDE_PROMPT_BUILDER_MODEL || 'claude-haiku-4-5';

    const claudeRes = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': ANTHROPIC_VERSION,
      },
      body: JSON.stringify({
        model,
        max_tokens: 1500,
        temperature: 0.7,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });

    if (!claudeRes.ok) {
      const detail = await claudeRes.text();
      let friendly = `Claude 호출 실패 (${claudeRes.status})`;
      if (claudeRes.status === 429) friendly = 'Claude 레이트 리밋 초과. 잠시 후 다시 시도.';
      else if (claudeRes.status === 529) friendly = 'Claude 일시 과부하. 1~2분 후 다시 시도.';
      else if (claudeRes.status === 401) friendly = 'ANTHROPIC_API_KEY 가 유효하지 않습니다.';

      return NextResponse.json(
        { ok: false, message: friendly, detail },
        { status: 502 },
      );
    }

    const data = await claudeRes.json();
    const text = (data?.content ?? [])
      .filter((b: any) => b?.type === 'text')
      .map((b: any) => b.text ?? '')
      .join('\n')
      .trim();

    if (!text) {
      return NextResponse.json(
        { ok: false, message: 'Claude 응답이 비어 있습니다.' },
        { status: 500 },
      );
    }

    // 외부 마크다운/코드블록 감싸기 정리
    const cleaned = text
      .replace(/^```[a-z]*\s*/i, '')
      .replace(/\s*```\s*$/, '')
      .trim();

    return NextResponse.json({
      ok: true,
      prompt: cleaned,
      usage: data?.usage,
      model,
      // 도구별 사용법 가이드 — 대표 이미지 유무에 따라 다르게
      toolGuide: TOOL_USAGE_GUIDES[targetTool]?.[mainImageUrl ? 'withImage' : 'withoutImage'] ?? null,
      // UI 가 "이 URL을 다운로드하세요" 안내할 때 사용
      mainImageUrl: mainImageUrl || null,
      // 라이브러리 이미지가 자동으로 대표 이미지로 사용됐는지 (UI 안내용)
      usedLibraryAsMain,
    });
  } catch (err: any) {
    console.error('[prompt-builder] 오류:', err);
    return NextResponse.json(
      { ok: false, message: err?.message ?? '알 수 없는 오류' },
      { status: 500 },
    );
  }
}

// ════════════════════════════════════════════════════════════════
// 프롬프트 빌더
// ════════════════════════════════════════════════════════════════
function buildRefinementPrompts(args: {
  templateId: string;
  templateContext: string;
  fields: Record<string, any>;
  referenceUrls: string[];
  referenceTokens: any[];
  mainImageUrl: string;
  preservationMode: string;
  preservationInstruction: string;
  productInfo?: {
    categoryId?: string;
    categoryNameEn?: string;
    visualDefinition?: string;
    variantHint?: string;
    sceneEn?: string;
    productImageUrl?: string;
    productNameEn?: string;
    productNameKr?: string;
    productVisualNotes?: string;
    productTags?: string[];
  };
  targetTool: string;
  aspectRatio: string;
  eventOperation?: {
    startDate?: string;
    endDate?: string;
    dateFormat?: string;
    formattedDate?: string;
    ctaText?: string;
    ctaStyle?: string;
    ctaStyleHint?: string;
    headerLabel?: string;
    headerLabelStyle?: string;
    headerLabelStyleHint?: string;
    disclaimer?: string;
  };
  variations?: {
    cameraAngle?: string;
    cameraAngleHint?: string;
    modelPose?: string;
    modelPoseHint?: string;
    peopleComposition?: string;
    peopleCompositionHint?: string;
    lightingTime?: string;
    lightingTimeHint?: string;
  };
}) {
  const {
    templateId,
    templateContext,
    fields,
    referenceUrls,
    referenceTokens,
    mainImageUrl,
    preservationMode,
    preservationInstruction,
    productInfo,
    targetTool,
    aspectRatio,
    eventOperation,
    variations,
  } = args;

  // ── 비율/사이즈 자연어 표현 ────────────────────────────────
  // value 가 '1920x680' 형태면 픽셀, '16:9' 형태면 비율로 인식
  const sizeText = formatSizeForAI(aspectRatio);

  // ── 도구별 출력 형식 가이드 ────────────────────────────────
  // 도구의 imageInputMethod 에 따라 프롬프트 본문을 다르게 작성
  const hasMainImage = !!mainImageUrl;

  const toolGuides: Record<string, string> = {
    // ChatGPT — 이미지 첨부 가정 + URL 도 fallback 으로 포함
    chatgpt: hasMainImage ? `
- 형식: 자연스러운 영어 문장 (DALL-E / GPT-Image-1 / GPT-4o image edit 용)
- ⚠️ 사용자가 ChatGPT 채팅에 대표 이미지를 첨부 파일로 업로드할 예정. 첨부 누락 가능성 대비해 URL도 fallback 으로 포함.
- **프롬프트 첫 문단에 다음 두 줄을 정확히 포함**:
   "Source image to use: ${mainImageUrl}"
   "Please use this exact image as the visual base. The user has also attached this same image to the chat - use either the attachment or fetch from the URL above, whichever works."
- 그 다음에 "the attached image" 표현을 본문 안에 **3번 이상** 사용
- 제품 묘사 시 "a beanbag" 같은 일반화 금지. "the Yogibo beanbag in the attached image / source image" 처럼 명시
- 마지막에 다음을 정확히 포함:
   "Important: Use the source image (URL: ${mainImageUrl}) or the attached file as the exact visual base. Do NOT regenerate the product or scene from scratch."
- 길이: 150~250 단어
- 한국어 카피는 "double quotes" 로 영어 문장 안에 그대로 포함
- 한국어 텍스트 렌더링 명시: "Korean text reads: ..."
- 끝에 사이즈 명시: "${sizeText}"
` : `
- 형식: 자연스러운 영어 문장 (DALL-E / GPT-Image-1 용, text-to-image)
- 길이: 100~200 단어
- 한국어 카피는 "double quotes" 로 영어 문장 안에 그대로 포함
- 한국어 텍스트 렌더링 명시: "Korean text reads: ..."
- 끝에 사이즈 명시: "${sizeText}"
`,

    // Midjourney — URL 을 프롬프트 맨 앞에 붙임 (image prompt 방식)
    midjourney: hasMainImage ? `
- 형식: /imagine ${mainImageUrl} [keywords] --params
- 위 이미지 URL을 반드시 프롬프트 맨 앞에 그대로 포함 (image prompt 방식)
- 길이: 50~100 단어 (URL 제외)
- 한국어 카피: "double quotes" 로 영어 키워드 안에 포함
- 끝에 파라미터: ${formatMidjourneyParams(aspectRatio)} --v 6 --style raw --iw 1.5
- --iw (image weight) 1.5 ~ 2.0 으로 설정해서 원본 영향력 강화
- 키워드를 쉼표로 구분
` : `
- 형식: /imagine [keywords] --params
- 길이: 50~100 단어
- 한국어 카피: "double quotes" 로 영어 키워드 안에 포함
- 끝에 파라미터: ${formatMidjourneyParams(aspectRatio)} --v 6 --style raw
- 키워드를 쉼표로 구분
`,

    // Gemini — ChatGPT 와 동일하게 URL 도 fallback 으로 포함
    gemini: hasMainImage ? `
- 형식: 자연스러운 영어 문장 (Google Gemini 이미지 생성용)
- ⚠️ 사용자가 Gemini 에 이미지를 첨부할 예정. 첨부 누락 대비해 URL 도 함께 명시.
- 프롬프트 첫 문단에 다음 두 줄을 정확히 포함:
   "Source image to use: ${mainImageUrl}"
   "Use this exact image as the visual base. The user has also attached this same image to the chat."
- "the attached image" 표현을 본문 안에 **3번 이상** 명시적으로 반복
- 제품 묘사 시 "the [product] in the attached image" 처럼 첨부물 명시
- 마지막 문단에 "Important: Use the source image (URL: ${mainImageUrl}) or attached file as the exact base." 강조
- 길이: 150~250 단어
- 한국어 카피는 "double quotes" 로 포함
- 사이즈는 "${sizeText}" 라고 자연어로 명시
` : `
- 형식: 자연스러운 영어 문장 (Google Gemini 이미지 생성용)
- 길이: 100~200 단어
- 한국어 카피는 "double quotes" 로 포함
- 사이즈는 "${sizeText}" 라고 자연어로 명시
`,

    // fal.ai — Flux img2img. URL은 별도 init_image 파라미터로 전달되므로 프롬프트에서 제외
    fal: hasMainImage ? `
- 형식: 영어 키워드 위주 (Flux Redux / img2img 용)
- 사용자가 fal.ai 의 "Image URL" 필드에 따로 입력한 상태로 가정
- 프롬프트 본문에서 URL 언급 금지 ("the input image" 정도로만)
- 길이: 50~150 단어
- 한국어 카피는 "double quotes" 로 포함
- 끝에 "${sizeText}" 추가
- 마지막에 "Recommended strength: 0.3-0.5 for preservation" 안내 추가
` : `
- 형식: 영어 키워드 위주 (Flux Pro/Schnell 용)
- 길이: 50~150 단어
- 한국어 카피는 "double quotes" 로 포함
- 끝에 "${sizeText}" 추가
`,

    nanobanana: hasMainImage ? `
- 형식: 자연스러운 영어 문장 (NanoBanana 이미지 생성용)
- 이미지는 사용자가 별도 업로드한 상태로 가정 — URL 언급 금지
- 길이: 100~200 단어
- 한국어 카피는 "double quotes" 로 포함
- 끝에 "${sizeText}" 추가
` : `
- 형식: 자연스러운 영어 문장 (NanoBanana 이미지 생성용)
- 길이: 100~200 단어
- 한국어 카피는 "double quotes" 로 포함
- 끝에 "${sizeText}" 추가
`,
  };

  const toolGuide = toolGuides[targetTool] || toolGuides.chatgpt;

  // ── 제품 정보 블록 ────────────────────────────────────────
  // 라이브러리에서 선택한 정확한 제품이 있으면 우선 사용 (가장 정확)
  // 없으면 카테고리 일반 정의만 사용
  const hasLibraryProduct = !!productInfo?.productImageUrl;

  const libraryProductBlock = hasLibraryProduct
    ? `[⭐ 정확한 Yogibo 제품 — 라이브러리에서 선택된 실제 제품]
Product Name: ${productInfo!.productNameEn ?? ''} (${productInfo!.productNameKr ?? ''})
Official Product Photo: ${productInfo!.productImageUrl}
${productInfo!.productVisualNotes ? `Visual Notes: ${productInfo!.productVisualNotes}` : ''}
${productInfo!.productTags?.length ? `Tags: ${productInfo!.productTags.join(', ')}` : ''}

⚠️ CRITICAL — PRODUCT IDENTITY PRESERVATION:
이 제품은 일반적인 빈백/필로우/인형이 아니라 **위 URL의 정확한 Yogibo 공식 제품**이다.
AI는 일반적 카테고리 묘사가 아닌, 위 공식 사진의 형태/색상/디자인을 그대로 따라야 한다.
도구가 이미지 입력을 지원한다면 (Midjourney --iref, fal.ai img2img, ChatGPT image edit 등),
이 Official Product Photo URL을 image reference 로 활용하도록 프롬프트에 명시할 것.`
    : '';

  const productBlock = productInfo?.visualDefinition
    ? `[제품 카테고리 — 이 정보를 시각적으로 정확히 반영할 것]
Category: ${productInfo.categoryNameEn} (${productInfo.categoryId})

${productInfo.visualDefinition}
${productInfo.variantHint ? `\nVariant detail: ${productInfo.variantHint}` : ''}
${productInfo.sceneEn ? `\nUsage scene: ${productInfo.sceneEn}` : ''}

이 제품의 시각적 특징이 결과 이미지에서 명확히 식별 가능해야 한다.
일반적인 의자/쿠션/봉제인형이 아니라, 위 정의의 Yogibo-style 제품이어야 한다.`
    : '[제품 카테고리 — 미지정. 일반적인 이커머스 비주얼로 작성]';

  // ── 보존 강도 블록 ────────────────────────────────────────
  const preservationBlock = mainImageUrl && preservationInstruction
    ? `[원본 이미지 보존 강도 — 매우 중요]
${preservationInstruction}`
    : '';

  // ── 디자인 코드 블록 (사이즈별 디자인 룰) ──────────────────
  // 같은 캠페인이라도 사이즈/플랫폼에 따라 디자인 문법이 완전히 다름.
  // 자사몰 가로 배너 디자인을 인스타 정사각에 그대로 쓰면 안 되니,
  // 사이즈에 매핑된 designCodeKey 의 instruction 을 시스템 프롬프트에 주입.
  const aspectMeta = ASPECT_RATIOS.find((a) => a.value === aspectRatio);
  const designCode = aspectMeta?.designCodeKey
    ? DESIGN_CODES[aspectMeta.designCodeKey]
    : null;
  const designCodeBlock = designCode
    ? `[사이즈/플랫폼별 디자인 코드 — 반드시 따를 것]
Output target: ${aspectMeta!.label}
Design ratio: ${designCode.ratio}

${designCode.instruction}

⚠️ The design code above is NOT optional. Different sizes/platforms have
fundamentally different design grammars. Apply this design code on top of
all other instructions (campaign template, event ops, etc.).`
    : '';

  // ── 이벤트 운영 정보 블록 ──────────────────────────────
  // 디자인에 자연스럽게 녹아들어야 할 운영 요소들 (기간, CTA, 라벨, 유의사항)
  const opItems: string[] = [];
  if (eventOperation?.formattedDate) {
    opItems.push(
      `• Event period: "${eventOperation.formattedDate}" — display this date range as a compact label near the discount badge or below the main copy. Use smaller, secondary text size.`,
    );
  }
  if (eventOperation?.ctaText) {
    const styleHint =
      eventOperation.ctaStyleHint ||
      'standard rounded button with brand color';
    opItems.push(
      `• Call-to-action button: "${eventOperation.ctaText}" — render as a clearly clickable ${styleHint}. Position in the lower-right area of the design (typical e-commerce CTA placement). Include an arrow icon (→) inside or beside the text. Make it visually prominent enough to invite clicks but not overpowering the main composition.`,
    );
  }
  if (eventOperation?.headerLabel) {
    const styleHint =
      eventOperation.headerLabelStyleHint ||
      'small accent label at top';
    opItems.push(
      `• Header label/tagline: "${eventOperation.headerLabel}" — render as ${styleHint} at the very top of the design (small but distinct, like a category indicator or theme banner).`,
    );
  }
  if (eventOperation?.disclaimer) {
    opItems.push(
      `• Footer disclaimer: "${eventOperation.disclaimer}" — render in very small text (lowest visual hierarchy) at the bottom edge of the design. Should be readable but visually unobtrusive.`,
    );
  }

  const eventOpBlock = opItems.length
    ? `[이벤트 운영 요소 — 디자인에 자연스럽게 녹여야 할 필수 요소]
The following operational elements MUST be included in the final design.
Place them naturally according to e-commerce banner conventions:
${opItems.join('\n')}

These elements work together: header label sets context → main copy delivers the message
→ event period informs urgency → CTA button drives action → disclaimer covers terms.
The composition should feel like a complete, ready-to-publish e-commerce banner,
not just a stylish image.`
    : '';

  // ── 결과 다양화 블록 ─────────────────────────────────────
  // 같은 입력으로도 결과를 다양화하기 위한 변형 지시.
  // strict / overlay-only 모드에서는 자동 무시되도록 안내.
  const varItems: string[] = [];
  if (variations?.cameraAngleHint)
    varItems.push(`• Camera angle: ${variations.cameraAngleHint}`);
  if (variations?.modelPoseHint)
    varItems.push(`• Model pose: ${variations.modelPoseHint}`);
  if (variations?.peopleCompositionHint)
    varItems.push(`• People composition: ${variations.peopleCompositionHint}`);
  if (variations?.lightingTimeHint)
    varItems.push(`• Lighting/time: ${variations.lightingTimeHint}`);

  const variationBlock = varItems.length
    ? `[결과 다양화 — 시각적 변형 지시]
The following variation hints should be applied to differentiate this output
from previous similar generations using the same source material:
${varItems.join('\n')}

⚠️ Apply these only when consistent with the preservation level:
  - If preservation is "strict" or "overlay-only": IGNORE these hints
    (preserve the original instead).
  - If preservation is "similar": apply MODERATELY — adjust where possible
    while keeping the core product/composition intact.
  - If preservation is "free" or no main image: apply FULLY for fresh variation.`
    : '';

  // 도구별 이미지 처리 규칙
  const imageRule = !hasMainImage
    ? '5. (대표 이미지 없음 — 처음부터 생성)'
    : targetTool === 'midjourney'
      ? `5. 대표 이미지 URL을 반드시 프롬프트 맨 앞에 그대로 포함한다 (Midjourney image prompt 방식): "${mainImageUrl}". 그 뒤에 키워드와 파라미터를 작성. 프롬프트 끝에 --iw 1.5 ~ 2.0 추가.`
      : targetTool === 'fal'
        ? `5. 대표 이미지는 사용자가 fal.ai의 "Image URL" 필드에 별도로 입력한다고 가정. 프롬프트 본문에서 URL 언급 금지. "the input image" 정도로만 표현. 마지막에 "Recommended strength: 0.3-0.5 for image preservation" 한 줄 추가.`
        : `5. ⚠️ CRITICAL: 사용자가 ${targetTool === 'chatgpt' ? 'ChatGPT' : 'Gemini'} 채팅에 대표 이미지를 첨부 파일로 업로드할 예정이다. 다만 첨부 누락 가능성도 있으므로 URL도 함께 명시해 fallback 한다.

   ⚠️ 핵심 — 프롬프트 안에 다음 두 가지를 모두 포함시킨다:

   (1) **이미지 URL을 첫 단락에 직접 명시**:
       정확히 다음과 같은 형식으로 프롬프트 첫 문단에 포함:
       "Source image to use: ${mainImageUrl}
        Please use this exact image as the visual base. The user has also
        attached this same image to the chat - use either the attachment or
        fetch from the URL above, whichever works."

   (2) **"the attached image" 표현 본문에 3번 이상 반복**:
       "Transform the attached image into ..."
       "the Yogibo beanbag in the attached image must remain identical"
       "The product/pose/composition in the attached image cannot be changed"

   - "the original" 같은 모호한 표현 절대 사용 금지.
   - 제품 묘사는 "a beanbag" 같은 일반 표현 X, "the Yogibo beanbag shown in the source image" 사용.
   - 마지막 문단에 한 번 더 강조:
     "Important: Use the source image (URL: ${mainImageUrl}) or the attached file
      as the exact visual base. Do NOT regenerate the product or scene from scratch."`;

  // ── 시스템 프롬프트 ────────────────────────────────────────
  const systemPrompt = `당신은 한국 이커머스(Yogibo, 빈백/쿠션 브랜드)의 캠페인 비주얼 디렉터입니다.
MD가 입력한 단순한 캠페인 정보를 외부 AI 이미지 생성 도구에 바로 사용 가능한 정교한 프롬프트로 변환합니다.

[캠페인 컨텍스트]
${templateContext}

${libraryProductBlock}

${productBlock}

${preservationBlock}

${eventOpBlock}

${variationBlock}

${designCodeBlock}

[타겟 도구: ${targetTool}]
${toolGuide}

[규칙]
1. 출력은 프롬프트 본문만. "다음과 같이 작성했습니다" 같은 메타 설명 금지.
2. 마크다운/코드블록(\`\`\`) 으로 감싸지 않는다.
3. 한국어 카피는 반드시 "큰따옴표" 로 감싸서 포함하고, 영문으로 의미를 풀어 보충 설명한다.
   예: "어버이날 감사 세일" (which means "Mother's Day Thank You Sale")
4. 레퍼런스 이미지 URL이 제공되면 "Style reference: <URL>, follow this overall mood, color palette closely" 형태로 포함한다.
${imageRule}
6. 색상 팔레트가 제공되면 hex 코드를 그대로 사용한다.
7. 이커머스 배너답게 임팩트, 명확한 텍스트 가독성, 구매 전환을 유도하는 분위기를 강조한다.
8. 톤 키워드가 한국어면 영어로 자연스럽게 번역해서 사용한다.
9. 위 [제품 카테고리] 정보가 있으면, 그 시각적 정의에 맞게 제품을 정확히 묘사한다.
10. 위 [원본 이미지 보존 강도] 지시를 반드시 준수한다.
11. 위 [⭐ 정확한 Yogibo 제품] 블록이 있으면, **그 공식 제품 사진 URL을 프롬프트에 반드시 포함**시킨다.
    - Midjourney 의 경우: --iref ${productInfo?.productImageUrl ? productInfo.productImageUrl : '<URL>'} 또는 image prompt 로 활용
    - ChatGPT/Gemini: "Use this exact Yogibo product as reference: <URL>" 명시 (사용자가 첨부 가능)
    - fal.ai: image-to-image 또는 ControlNet 으로 활용
    - 일반적인 빈백/필로우/인형이 아닌, 위 정확한 Yogibo 공식 제품을 그대로 그려야 함을 강조한다.`;

  // ── 사용자 프롬프트 ────────────────────────────────────────
  const fieldsBlock = JSON.stringify(fields, null, 2);
  const refUrlsBlock = referenceUrls.length
    ? referenceUrls.map((u) => `  - ${u}`).join('\n')
    : '  (none)';

  const tokensBlock = referenceTokens.length
    ? JSON.stringify(referenceTokens, null, 2)
    : '(none)';

  const mainImageBlock = mainImageUrl
    ? `${mainImageUrl}\n  → 보존 강도: ${preservationMode}`
    : '(none — 대표 이미지 없이 AI 가 처음부터 생성)';

  // 이벤트 운영 정보 요약 (user 프롬프트용)
  const eventOpSummary: string[] = [];
  if (eventOperation?.formattedDate)
    eventOpSummary.push(`기간: ${eventOperation.formattedDate}`);
  if (eventOperation?.ctaText)
    eventOpSummary.push(`CTA 버튼: "${eventOperation.ctaText}" (${eventOperation.ctaStyle ?? 'standard'})`);
  if (eventOperation?.headerLabel)
    eventOpSummary.push(`헤더 라벨: "${eventOperation.headerLabel}" (${eventOperation.headerLabelStyle ?? 'simple-text'})`);
  if (eventOperation?.disclaimer)
    eventOpSummary.push(`유의사항: ${eventOperation.disclaimer}`);
  const eventOpSummaryText = eventOpSummary.length
    ? eventOpSummary.join('\n')
    : '(없음)';

  const userPrompt = `[양식 ID]
${templateId}

[MD 입력 필드]
${fieldsBlock}

[이벤트 운영 정보 — 디자인에 포함될 운영 요소]
${eventOpSummaryText}

[대표 이미지 — 메인 비주얼로 보존할 사진]
${mainImageBlock}

[참고 레퍼런스 이미지 URL — 톤/색상만 참고]
${refUrlsBlock}

[참고 레퍼런스 디자인 토큰]
${tokensBlock}

[타겟 도구]
${targetTool}

[출력 사이즈]
${aspectRatio} → ${sizeText}

위 정보를 종합하여, ${targetTool} 에 바로 붙여넣을 수 있는 정교한 이미지 생성 프롬프트를 작성하시오.
대표 이미지가 있으면 그 사진을 중심에 두고, 레퍼런스 이미지의 톤만 차용한다.
이벤트 운영 정보(기간/CTA/라벨/유의사항)는 모두 디자인에 자연스럽게 녹여야 한다.
프롬프트 본문만 출력. 메타 설명·인사말·코드블록 금지.`;

  return { systemPrompt, userPrompt };
}

// ─────────────────────────────────────────────────────────────
// 사이즈 자연어 변환
//   '1920x680'  → '1920×680 pixels (banner format)'
//   '800x-'     → '800px wide (variable height, vertical layout)'
//   '1080x1080' → '1080×1080 pixels (square format)'
//   '16:9'      → 'aspect ratio 16:9'
// ─────────────────────────────────────────────────────────────
function formatSizeForAI(value: string): string {
  if (/^\d+x-$/.test(value)) {
    const w = value.replace('x-', '');
    return `${w}px wide with variable/long vertical height (scrolling page format)`;
  }
  const m = value.match(/^(\d+)x(\d+)$/);
  if (m) {
    const w = parseInt(m[1], 10);
    const h = parseInt(m[2], 10);
    let format = '';
    if (w === h) format = ' (square format)';
    else if (w > h * 2) format = ' (wide banner format)';
    else if (w > h) format = ' (horizontal banner format)';
    else if (h > w * 1.5) format = ' (tall vertical format, mobile-friendly)';
    else format = ' (vertical format)';
    return `${w}×${h} pixels${format}`;
  }
  // 비율(예: 16:9)인 경우
  return `aspect ratio ${value}`;
}

// Midjourney 파라미터: 픽셀 → 가장 가까운 비율로 변환
function formatMidjourneyParams(value: string): string {
  if (/^\d+x-$/.test(value)) return '--ar 9:21'; // 세로 길이 가변 → 매우 긴 세로
  const m = value.match(/^(\d+)x(\d+)$/);
  if (m) {
    const w = parseInt(m[1], 10);
    const h = parseInt(m[2], 10);
    const ratio = w / h;
    // 흔히 쓰이는 비율 중 가장 가까운 것
    const candidates: [string, number][] = [
      ['1:1', 1.0],
      ['4:5', 0.8],
      ['9:16', 0.5625],
      ['16:9', 1.7778],
      ['21:9', 2.3333],
      ['3:2', 1.5],
      ['4:3', 1.3333],
      ['2:3', 0.6667],
      ['9:21', 0.4286],
    ];
    let best = candidates[0];
    let bestDiff = Math.abs(candidates[0][1] - ratio);
    for (const c of candidates) {
      const d = Math.abs(c[1] - ratio);
      if (d < bestDiff) {
        bestDiff = d;
        best = c;
      }
    }
    return `--ar ${best[0]}`;
  }
  return `--ar ${value}`;
}

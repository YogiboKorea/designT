/**
 * POST /api/generate-image
 * ─────────────────────────────────────────────────────────────────
 * fal.ai 로 배너 이미지 생성. 입력에 따라 두 모델로 분기:
 *  - sourceImageUrl 있음 → **FLUX.1 Kontext** (이미지 편집 — 대표 이미지 보존)
 *  - sourceImageUrl 없음 → **FLUX 1.1 Pro** (텍스트→이미지)
 *
 * 입력:
 *   {
 *     prompt: string,
 *     numImages?: 1 | 2 | 3 | 4,
 *     imageSize?: 'square_hd' | 'landscape_16_9' | ...,
 *     sourceImageUrl?: string,    // 있으면 Kontext 사용
 *   }
 *
 * 응답: { ok, images, seed, timings, usage, model }
 * 환경 변수: FAL_KEY 필수.
 * 비용: 둘 다 $0.04/장. 3만원/월 ≈ 537장.
 * ─────────────────────────────────────────────────────────────────
 */
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import ApiUsage from '@/models/ApiUsage';

export const runtime = 'nodejs';
export const maxDuration = 60;

// 입력에 따라 분기:
//  · sourceImageUrl 있음 → FLUX Kontext (이미지 편집, 제품 보존)
//  · 없음 → Google Imagen 4 Ultra (fal.ai 내 최고 프리미엄 톤. DALL-E 3 수준 근접)
const FAL_T2I_ENDPOINT = 'https://fal.run/fal-ai/imagen4/preview/ultra';
const FAL_KONTEXT_ENDPOINT = 'https://fal.run/fal-ai/flux-pro/kontext';

/** Imagen 4 는 aspect_ratio 문자열만 받음 ("1:1", "16:9", ...). 픽셀/enum 을 자동 매핑. */
function toImagenAspect(size: ImageSize): '1:1' | '16:9' | '9:16' | '4:3' | '3:4' {
  // 객체면 비율 계산
  if (typeof size === 'object' && 'width' in size && 'height' in size) {
    const r = size.width / size.height;
    if (r >= 1.6) return '16:9';
    if (r >= 1.2) return '4:3';
    if (r <= 0.625) return '9:16';
    if (r <= 0.85) return '3:4';
    return '1:1';
  }
  // enum
  switch (size) {
    case 'landscape_16_9': return '16:9';
    case 'landscape_4_3': return '4:3';
    case 'portrait_16_9': return '9:16';
    case 'portrait_9_16': return '9:16';
    case 'portrait_4_3': return '3:4';
    case 'square':
    case 'square_hd':
    default: return '1:1';
  }
}
// 한도 차단용 키.
const USAGE_KEY = 'fal-flux-pro-1.1';
const DEFAULT_LIMIT = Number(process.env.FAL_USAGE_LIMIT) || 100;

type ImageSizeEnum =
  | 'square_hd'
  | 'square'
  | 'portrait_4_3'
  | 'portrait_16_9'
  | 'portrait_9_16'
  | 'landscape_4_3'
  | 'landscape_16_9';

type ImageSize = ImageSizeEnum | { width: number; height: number };

interface GenerateRequest {
  prompt?: string;
  numImages?: number;
  /** enum 또는 { width, height } 픽셀 직접 지정. aspectRatio 문자열('1920x680') 도 자동 파싱. */
  imageSize?: ImageSize | string;
  /** 대표 이미지가 있으면 그걸 베이스로 Kontext 가 편집 — 제품/포즈 보존 + 배경·텍스트만 변경 */
  sourceImageUrl?: string;
}

/** '1920x680' 같은 문자열을 FLUX 호환 image_size 객체나 enum 으로 변환 */
function normalizeImageSize(raw: unknown): ImageSize {
  // 객체 형태 — 이미 { width, height }
  if (raw && typeof raw === 'object' && 'width' in (raw as any) && 'height' in (raw as any)) {
    const o = raw as { width: unknown; height: unknown };
    const w = Number(o.width);
    const h = Number(o.height);
    if (isFinite(w) && isFinite(h) && w > 0 && h > 0) {
      // FLUX 제한: 최대 14M 픽셀 (예: 4096×3500)
      const total = w * h;
      const cap = 14_000_000;
      if (total > cap) {
        const scale = Math.sqrt(cap / total);
        return { width: Math.round(w * scale), height: Math.round(h * scale) };
      }
      return { width: w, height: h };
    }
  }
  // 문자열 — 'WxH' 패턴이면 px 객체, enum 문자열이면 그대로
  if (typeof raw === 'string') {
    const m = raw.match(/^(\d+)\s*[x×]\s*(\d+)$/i);
    if (m) {
      return normalizeImageSize({ width: Number(m[1]), height: Number(m[2]) });
    }
    const enums: ImageSizeEnum[] = [
      'square_hd', 'square', 'portrait_4_3', 'portrait_16_9',
      'portrait_9_16', 'landscape_4_3', 'landscape_16_9',
    ];
    if ((enums as string[]).includes(raw)) return raw as ImageSizeEnum;
  }
  return 'square_hd';
}

interface FalImage {
  url: string;
  width: number;
  height: number;
  content_type?: string;
}

interface FalResponse {
  images: FalImage[];
  timings?: { inference?: number };
  seed?: number;
  has_nsfw_concepts?: boolean[];
  prompt?: string;
}

export async function POST(req: NextRequest) {
  try {
    const FAL_KEY = process.env.FAL_KEY;
    if (!FAL_KEY) {
      return NextResponse.json(
        { ok: false, error: 'FAL_KEY 환경 변수가 .env.local 에 설정돼 있지 않습니다.' },
        { status: 500 },
      );
    }

    const body = (await req.json()) as GenerateRequest;
    const prompt = (body.prompt || '').trim();
    if (!prompt) {
      return NextResponse.json({ ok: false, error: 'prompt 가 비어있습니다.' }, { status: 400 });
    }

    const numImages = Math.max(1, Math.min(4, body.numImages ?? 1));
    const imageSize: ImageSize = normalizeImageSize(body.imageSize);
    const sourceImageUrl = (body.sourceImageUrl || '').trim();
    const useKontext = sourceImageUrl.length > 0;
    const endpoint = useKontext ? FAL_KONTEXT_ENDPOINT : FAL_T2I_ENDPOINT;

    // ── 사용량 한도 체크 ──
    await connectToDatabase();
    const usage = await ApiUsage.findOneAndUpdate(
      { key: USAGE_KEY },
      { $setOnInsert: { count: 0, limit: DEFAULT_LIMIT } },
      { upsert: true, new: true },
    );
    if (usage.count + numImages > usage.limit) {
      return NextResponse.json(
        {
          ok: false,
          error: `한도 초과 — 이미 ${usage.count}/${usage.limit} 장 사용됨. 관리자가 한도를 늘려야 합니다.`,
          usage: { count: usage.count, limit: usage.limit, remaining: Math.max(0, usage.limit - usage.count) },
        },
        { status: 429 },
      );
    }

    // 모델별 파라미터:
    //  · Kontext: image_url 필수, guidance_scale 권장 3.5
    //  · Imagen 4 Ultra: aspect_ratio 문자열, num_images 1~4
    const falBody: Record<string, unknown> = useKontext
      ? {
          prompt,
          image_url: sourceImageUrl,
          num_images: numImages,
          guidance_scale: 3.5,
          safety_tolerance: '2',
          output_format: 'jpeg',
        }
      : {
          prompt,
          num_images: numImages,
          aspect_ratio: toImagenAspect(imageSize),
          // negative_prompt 로 촌스러운 톤 제거
          negative_prompt: 'low quality, blurry, generic stock photo, cartoonish, 3D render, oversaturated, rainbow gradient, comic style',
        };

    const falRes = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Key ${FAL_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(falBody),
    });

    if (!falRes.ok) {
      const errText = await falRes.text().catch(() => '');
      console.error('[generate-image] fal.ai 응답 오류:', falRes.status, errText);
      return NextResponse.json(
        { ok: false, error: `fal.ai 응답 오류 (${falRes.status})`, detail: errText.slice(0, 500) },
        { status: 502 },
      );
    }

    const data = (await falRes.json()) as FalResponse;
    const generatedCount = (data.images || []).length;

    // 카운터 증가 (실제로 받은 이미지 수 만큼)
    const updatedUsage = await ApiUsage.findOneAndUpdate(
      { key: USAGE_KEY },
      { $inc: { count: generatedCount } },
      { new: true },
    );

    return NextResponse.json({
      ok: true,
      model: useKontext ? 'flux-pro/kontext (image-to-image)' : 'imagen-4-ultra (text-to-image)',
      images: (data.images || []).map((img) => ({
        url: img.url,
        width: img.width,
        height: img.height,
      })),
      seed: data.seed ?? null,
      timings: data.timings ?? null,
      usage: updatedUsage
        ? {
            count: updatedUsage.count,
            limit: updatedUsage.limit,
            remaining: Math.max(0, updatedUsage.limit - updatedUsage.count),
          }
        : null,
    });
  } catch (err: any) {
    console.error('[generate-image] 예외:', err);
    return NextResponse.json(
      { ok: false, error: err?.message || 'unknown error' },
      { status: 500 },
    );
  }
}

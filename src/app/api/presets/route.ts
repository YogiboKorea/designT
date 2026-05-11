import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import BannerPreset from '@/models/BannerPreset';

export const dynamic = 'force-dynamic';

/**
 * GET /api/presets
 *   ?platform=cafe24|smart-store|sns   (필수 권장 — 안 주면 전체)
 *   ?device=web|mobile                  (선택)
 *
 * 빌더에서 호출 흐름:
 *   웹 탭 보고 있을 때:    /api/presets?platform=cafe24&device=web
 *   모바일 탭 보고 있을 때: /api/presets?platform=cafe24&device=mobile
 */
export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();

    const { searchParams } = req.nextUrl;
    const platform = searchParams.get('platform');
    const device = searchParams.get('device');

    const query: any = {};
    if (platform) {
      const valid = ['cafe24', 'smart-store', 'sns'];
      if (!valid.includes(platform)) {
        return NextResponse.json(
          { ok: false, message: `invalid platform: ${platform}` },
          { status: 400 },
        );
      }
      query.platform = platform;
    }
    if (device) {
      const valid = ['web', 'mobile'];
      if (!valid.includes(device)) {
        return NextResponse.json(
          { ok: false, message: `invalid device: ${device}` },
          { status: 400 },
        );
      }
      query.device = device;
    }

    const items = await BannerPreset.find(query)
      .sort({ updatedAt: -1 })
      .limit(100);

    return NextResponse.json({ ok: true, items });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, message: error?.message ?? 'unknown error' },
      { status: 500 },
    );
  }
}

/**
 * POST /api/presets
 *   body: {
 *     name: string,
 *     platform: 'cafe24' | 'smart-store' | 'sns',
 *     device: 'web' | 'mobile',
 *     canvasWidth: number,
 *     canvasHeight: number,
 *     data: { texts, bgColor, useGradient, gradient, bgGraphicType, showLogo, logoColor, imageMode },
 *     thumbnail?: string  (FTP 업로드 결과 URL)
 *   }
 *
 * 빌더의 "💾 프리셋으로 저장" 버튼이 호출.
 * 호출 전 클라이언트가 캔버스를 캡처(html2canvas) → FTP 업로드 → URL 받아서 thumbnail 로 전달.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, platform, device, canvasWidth, canvasHeight, data, thumbnail } = body;

    // 필수 검증
    if (!name || typeof name !== 'string') {
      return NextResponse.json({ ok: false, message: 'name is required' }, { status: 400 });
    }
    if (!['cafe24', 'smart-store', 'sns'].includes(platform)) {
      return NextResponse.json({ ok: false, message: 'invalid platform' }, { status: 400 });
    }
    if (!['web', 'mobile'].includes(device)) {
      return NextResponse.json({ ok: false, message: 'invalid device' }, { status: 400 });
    }
    if (!canvasWidth || !canvasHeight) {
      return NextResponse.json({ ok: false, message: 'canvasWidth/canvasHeight required' }, { status: 400 });
    }
    if (!data || typeof data !== 'object') {
      return NextResponse.json({ ok: false, message: 'data object required' }, { status: 400 });
    }

    await connectToDatabase();

    // data 에서 안전한 필드만 추출 (악의적 큰 데이터 방지)
    const safeData: any = {};
    if (Array.isArray(data.texts)) safeData.texts = data.texts;
    if (typeof data.bgColor === 'string') safeData.bgColor = data.bgColor;
    if (typeof data.useGradient === 'boolean') safeData.useGradient = data.useGradient;
    if (data.gradient && typeof data.gradient === 'object') safeData.gradient = data.gradient;
    if (data.bgGraphicType === null || ['A','B','C','D','E'].includes(data.bgGraphicType)) {
      safeData.bgGraphicType = data.bgGraphicType;
    }
    if (typeof data.showLogo === 'boolean') safeData.showLogo = data.showLogo;
    if (['white', 'color'].includes(data.logoColor)) safeData.logoColor = data.logoColor;
    if (['cover', 'free'].includes(data.imageMode)) safeData.imageMode = data.imageMode;

    const preset = await BannerPreset.create({
      name: name.trim().slice(0, 100),
      platform,
      device,
      canvasWidth,
      canvasHeight,
      thumbnail: typeof thumbnail === 'string' ? thumbnail : '',
      data: safeData,
    });

    return NextResponse.json({ ok: true, item: preset }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, message: error?.message ?? 'unknown error' },
      { status: 500 },
    );
  }
}

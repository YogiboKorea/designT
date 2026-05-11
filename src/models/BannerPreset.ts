import mongoose, { Schema, Document } from 'mongoose';

/**
 * 배너 프리셋 — 사용자가 빌더에서 만든 디자인을 "한 세트"로 저장한 것.
 * ─────────────────────────────────────────────────────────────────
 * 프리셋 = 텍스트들 + 배경색 + 그라데이션 + 로고 + bgGraphicType 의 묶음.
 * 다음에 새 배너 만들 때 카드 클릭 한 번으로 이 묶음이 통째로 적용됨.
 *
 * 인물 사진(bgImage)은 저장하지 않음 — 새 캠페인마다 다른 사진이 필요하므로
 * 빈 상태로 시작 (사용자가 새로 업로드).
 *
 * platform 별로 분리:
 *  - cafe24      : 자사몰 빌더에서만 보임
 *  - smart-store : 스마트스토어 빌더에서만 보임
 *  - sns         : 건드리지 않음 (당분간 사용 안 함)
 *
 * device:
 *  - web    : 웹 캔버스용 (1920×680 또는 1920×860)
 *  - mobile : 모바일 캔버스용 (800×907 또는 750×1350)
 *
 * 같은 캠페인이라도 웹/모바일은 텍스트 위치/크기가 다르므로 별도 프리셋.
 * ─────────────────────────────────────────────────────────────────
 */

export type PresetPlatform = 'cafe24' | 'smart-store' | 'sns';
export type PresetDevice = 'web' | 'mobile';

export interface IBannerPreset extends Document {
  /** 사용자가 입력한 프리셋 이름 (예: "봄 세일 메인", "쿠폰 띠") */
  name: string;
  /** 어느 채널용인지 — 빌더 진입 시 platform 으로 필터링 */
  platform: PresetPlatform;
  /** 어느 디바이스용인지 — 웹 탭이면 web 프리셋만, 모바일 탭이면 mobile 프리셋만 표시 */
  device: PresetDevice;
  /** 프리셋 미리보기용 썸네일 URL (FTP 업로드 결과). 카드 그리드에서 사용. */
  thumbnail: string;
  /** 어느 캔버스 사이즈로 만들어진 것인지 (저장 시점) — 호환성 체크용 */
  canvasWidth: number;
  canvasHeight: number;
  /**
   * 핵심 — 적용할 디자인 데이터.
   * MainVisualCanvas 의 부분집합:
   *   - texts (TextItem[])
   *   - bgColor
   *   - useGradient + gradient
   *   - bgGraphicType (A/B/C/D/E/null)
   *   - showLogo + logoColor
   *   - imageMode
   *
   * 의도적으로 제외:
   *   - bgImage (인물 사진 — 새 캠페인마다 다름)
   *   - bgImageOriginal
   *   - imageTransform
   *   - showDateBar / eventDate / showButton / buttonLabel (캠페인별 다름)
   */
  data: {
    texts: any[];                           // TextItem[]
    bgColor?: string;
    useGradient?: boolean;
    gradient?: any;                          // CanvasGradient
    bgGraphicType?: 'A' | 'B' | 'C' | 'D' | 'E' | null;
    showLogo?: boolean;
    logoColor?: 'white' | 'color';
    imageMode?: 'cover' | 'free';
  };
  createdAt: Date;
  updatedAt: Date;
}

const BannerPresetSchema: Schema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  platform: {
    type: String,
    enum: ['cafe24', 'smart-store', 'sns'],
    required: true,
    index: true,
  },
  device: {
    type: String,
    enum: ['web', 'mobile'],
    required: true,
    index: true,
  },
  thumbnail: {
    type: String,
    default: '',
  },
  canvasWidth: {
    type: Number,
    required: true,
  },
  canvasHeight: {
    type: Number,
    required: true,
  },
  data: {
    type: Schema.Types.Mixed,
    required: true,
    default: {},
  },
}, {
  timestamps: true,
});

// 복합 인덱스 — platform + device 로 빠른 조회 (빌더에서 사이즈/탭 별로 필터링 시 사용)
BannerPresetSchema.index({ platform: 1, device: 1, updatedAt: -1 });

// HMR 캐시 무효화
if ((mongoose.models as any).BannerPreset) {
  delete (mongoose.models as any).BannerPreset;
  try {
    (mongoose as any).deleteModel && (mongoose as any).deleteModel('BannerPreset');
  } catch {
    /* noop */
  }
}

export default mongoose.model<IBannerPreset>('BannerPreset', BannerPresetSchema, 'banner_presets');

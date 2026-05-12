import mongoose, { Schema, Document } from 'mongoose';

/**
 * 레퍼런스 이미지 모델
 * ─────────────────────────────────────────────────────────────────
 * 캠페인 비주얼 작업 시 톤/스타일 참고용 이미지 갤러리.
 * 사용자가 직접 PC 에서 사진 업로드 → FTP (cafe24) 자동 저장 → DB 등록.
 *
 * 카테고리는 사이즈/플랫폼별로 분류해서 빌더에서 자동 필터링에 사용:
 *   - web-banner: 자사몰 / 스마트스토어 가로형 배너
 *   - sns: 인스타 정사각, 카카오톡 등 SNS 정사각/직사각
 *   - sns-story: 인스타 스토리/릴스 등 세로형
 *   - mobile: 모바일 메인 / 모바일 히어로
 *   - thumbnail: 작은 썸네일, 상품 카드
 *
 * v4.3 에서 빌더의 사이즈 선택과 매칭되어 자동 필터링됨.
 * ─────────────────────────────────────────────────────────────────
 */

export type ReferenceCategory =
  | 'web-banner'
  | 'sns'
  | 'sns-story'
  | 'mobile'
  | 'thumbnail';

export type ReferencePlatform =
  | 'instagram'
  | 'instagram-story'
  | 'facebook'
  | 'kakao'
  | 'naver-blog'
  | 'youtube'
  | 'cafe24'
  | 'smart-store'
  | null;

export interface IReferenceImage extends Document {
  /** 표시 제목 */
  title: string;
  /** FTP 업로드된 이미지 URL */
  imageUrl: string;
  /** 분류 카테고리 (사이즈/플랫폼별) */
  category: ReferenceCategory;
  /** 세부 플랫폼 (선택) */
  platform?: ReferencePlatform;
  /** 분류용 태그 (예: ['봄', '핑크', '미니멀']) */
  tags: string[];
  /** AI 프롬프트에 전달할 시각 메모 (선택) */
  visualNotes?: string;
  /** 활성 여부 */
  active: boolean;

  createdAt: Date;
  updatedAt: Date;
}

const ReferenceImageSchema: Schema = new Schema(
  {
    title: { type: String, required: true },
    imageUrl: { type: String, required: true, unique: true },

    category: {
      type: String,
      enum: ['web-banner', 'sns', 'sns-story', 'mobile', 'thumbnail'],
      default: 'web-banner',
      required: true,
      index: true,
    },
    platform: {
      type: String,
      enum: [
        'instagram',
        'instagram-story',
        'facebook',
        'kakao',
        'naver-blog',
        'youtube',
        'cafe24',
        'smart-store',
        null,
      ],
      default: null,
    },

    tags: { type: [String], default: [] },
    visualNotes: { type: String, default: '' },

    // Claude Vision 으로 추출한 디자인 토큰. 한번 분석되면 DB 에 캐싱되어 재사용.
    // 구조: { colors: { primary, secondary, accent, background }, typography, layout, tone[], rationale }
    extractedTokens: { type: Schema.Types.Mixed, default: null },

    active: { type: Boolean, default: true, index: true },
  },
  { timestamps: true, strict: false },
);

ReferenceImageSchema.index({ category: 1, active: 1 });
ReferenceImageSchema.index({ tags: 1 });

// HMR 안전
if (mongoose.models.ReferenceImage) {
  delete mongoose.models.ReferenceImage;
}

export default mongoose.models.ReferenceImage ||
  mongoose.model<IReferenceImage>('ReferenceImage', ReferenceImageSchema);

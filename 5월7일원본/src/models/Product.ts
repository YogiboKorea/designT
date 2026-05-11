import mongoose, { Schema, Document } from 'mongoose';

/**
 * 제품 사진 라이브러리 모델.
 * ─────────────────────────────────────────────────────────────────
 * Yogibo 라인업의 공식 제품 사진을 저장한다.
 * 프롬프트 빌더에서 "라이브러리에서 선택" 으로 활용해 AI 이미지 생성 시
 * 일반적인 빈백/인형 대신 실제 Yogibo 제품을 정확히 묘사하도록 한다.
 *
 * 사용 흐름:
 *   1. /products 페이지에서 제품 사진 업로드 (FTP 자동 업로드)
 *   2. 카테고리/이름/태그 입력
 *   3. /prompt-builder 에서 "라이브러리에서 선택" → 자동으로 URL 주입
 * ─────────────────────────────────────────────────────────────────
 */
export interface IProduct extends Document {
  /** 카테고리 — campaign-templates.ts 의 PRODUCT_CATEGORIES 와 매칭 */
  category: 'beanbag' | 'body-pillow' | 'plush';
  /** 카테고리 내 세부 변형 (선택) */
  variant?: string;
  /** 한국어 제품명 (예: "Mate 베어 핑크") */
  nameKr: string;
  /** 영문 제품명 (예: "Mate Bear Pink") — AI 프롬프트에 사용 */
  nameEn: string;
  /** FTP 에 업로드된 제품 사진 URL */
  productImageUrl: string;
  /** 썸네일 URL (없으면 productImageUrl 동일) */
  thumbnailUrl?: string;
  /** 시각적 메모 — AI 가 더 정확히 그리도록 보조 (선택) */
  visualNotes?: string;
  /** 분류용 태그 (예: ['핑크','대형','베스트셀러']) */
  tags: string[];
  /** 이 제품에 가장 잘 맞는 도구 (선택, 자동 추천용) */
  recommendedTool?: 'chatgpt' | 'midjourney' | 'gemini' | 'fal' | 'nanobanana';
  /** 활성화 여부 (false 면 빌더 라이브러리에서 숨김) */
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<IProduct>(
  {
    category: {
      type: String,
      enum: ['beanbag', 'body-pillow', 'plush'],
      required: true,
      index: true,
    },
    variant: { type: String },
    nameKr: { type: String, required: true },
    nameEn: { type: String, required: true },
    productImageUrl: { type: String, required: true, unique: true },
    thumbnailUrl: { type: String },
    visualNotes: { type: String, default: '' },
    tags: { type: [String], default: [], index: true },
    recommendedTool: {
      type: String,
      enum: ['chatgpt', 'midjourney', 'gemini', 'fal', 'nanobanana'],
    },
    active: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

// HMR 환경 대응
if ((mongoose.models as any).Product) {
  delete (mongoose.models as any).Product;
  try {
    (mongoose as any).deleteModel && (mongoose as any).deleteModel('Product');
  } catch {
    /* noop */
  }
}

export default mongoose.model<IProduct>('Product', schema, 'products');

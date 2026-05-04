import mongoose, { Schema, Document } from 'mongoose';

/**
 * 외부 이미지 레퍼런스 모델.
 *
 * 빌더로 만든 작업물(EventPage)과 별개로,
 * 디자이너 시안·타사 사례·작년 이벤트 페이지 캡쳐 등
 * "외부에서 가져온 이미지 레퍼런스" 를 저장한다.
 *
 * AI 자동 조립 시 EventPage(structured) + ReferenceImage(visual tone)
 * 두 가지를 모두 참고해 디자인 톤을 결정한다.
 */
export interface IReferenceImage extends Document {
  title: string;
  imageUrl: string;
  thumbnailUrl?: string;
  /** 출처 분류 */
  source: 'designer' | 'external' | 'competitor' | 'archive' | 'other';
  /** 분류 태그 (예: ['summer','sale','2024']) */
  tags: string[];
  note: string;

  /**
   * 중복 방지용 해시 (URL 또는 이미지 콘텐츠 기반).
   * 동일 URL/이미지가 여러 번 등록되는 것을 차단.
   */
  hash?: string;

  /**
   * Gemini Vision 으로 추출된 디자인 토큰.
   * 일괄 등록 시 비워두고 야간 배치(scripts/analyze-references.mjs)로 채워도 됨.
   */
  extractedTokens?: {
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
  };

  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<IReferenceImage>({
  title: { type: String, required: true },
  imageUrl: { type: String, required: true, index: true },
  thumbnailUrl: { type: String },
  source: {
    type: String,
    enum: ['designer', 'external', 'competitor', 'archive', 'other'],
    default: 'other',
    index: true,
  },
  tags: { type: [String], default: [], index: true },
  note: { type: String, default: '' },
  hash: { type: String, index: true },
  extractedTokens: { type: Schema.Types.Mixed },
}, { timestamps: true });

// HMR 환경 대응 (EventPage 와 동일 패턴)
if ((mongoose.models as any).ReferenceImage) {
  delete (mongoose.models as any).ReferenceImage;
  try {
    (mongoose as any).deleteModel && (mongoose as any).deleteModel('ReferenceImage');
  } catch {
    /* noop */
  }
}

export default mongoose.model<IReferenceImage>(
  'ReferenceImage',
  schema,
  'reference_images',
);

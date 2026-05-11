import mongoose, { Schema, Document } from 'mongoose';

export type EventType = 'event' | 'banner';

export interface IEventPage extends Document {
  title: string;
  sections: any[];
  imageUrl?: string;
  /**
   * 'event'  = 메인 이벤트 페이지 (여러 섹션 조합)
   * 'banner' = 메인비주얼 배너 (웹/모바일 쌍)
   */
  eventType: EventType;
  /**
   * AI 자동 조립 시 학습 대상으로 사용할지 여부.
   * true 인 작업물만 /api/ai-compose 의 레퍼런스 풀에 포함됨.
   */
  isReference: boolean;
  /** 자동 태깅 또는 수동 태깅된 키워드 (예: ['summer','sale','2024']) */
  referenceTags: string[];
  /** 레퍼런스 메모 */
  referenceNote: string;
  createdAt: Date;
  updatedAt: Date;
}

const EventPageSchema: Schema = new Schema({
  title: {
    type: String,
    required: true,
  },
  sections: {
    type: [Schema.Types.Mixed],
    default: [],
  },
  imageUrl: {
    type: String,
    required: false,
  },
  eventType: {
    type: String,
    enum: ['event', 'banner'],
    default: 'event',
    index: true,
  },
  isReference: {
    type: Boolean,
    default: false,
    index: true,
  },
  referenceTags: {
    type: [String],
    default: [],
    index: true,
  },
  referenceNote: {
    type: String,
    default: '',
  },
}, {
  timestamps: true,
});

// HMR(Hot Module Reload) 환경에서 기존 캐시된 스키마가 남아있으면
// 신규 필드(isReference 등)가 반영되지 않기 때문에, 모델이 있을 경우 제거 후 재생성.
if ((mongoose.models as any).EventPage) {
  delete (mongoose.models as any).EventPage;
  try {
    (mongoose as any).deleteModel && (mongoose as any).deleteModel('EventPage');
  } catch {
    /* noop */
  }
}

export default mongoose.model<IEventPage>('EventPage', EventPageSchema, 'design');

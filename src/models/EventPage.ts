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
}, {
  timestamps: true,
});

// HMR(Hot Module Reload) 환경에서 기존 캐시된 스키마가 남아있으면
// 신규 필드(eventType)가 반영되지 않기 때문에, 모델이 있을 경우 제거 후 재생성.
if ((mongoose.models as any).EventPage) {
  delete (mongoose.models as any).EventPage;
  try {
    (mongoose as any).deleteModel && (mongoose as any).deleteModel('EventPage');
  } catch {
    /* noop */
  }
}

export default mongoose.model<IEventPage>('EventPage', EventPageSchema, 'design');

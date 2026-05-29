import mongoose, { Schema, Document, Model } from 'mongoose';

export type EventType = 'event' | 'banner' | 'page';

export interface IEventPage extends Document {
  /**
   * cafe24 mall id — ychat 서버가 events 조회 시 `findOne({_id, mallId})` 로 필터링하므로 필수.
   * 옵션 A(ychat 통합) 배포 환경에서 widget.js 가 라이브에서 정상적으로 fetch 하도록 함께 저장.
   */
  mallId: string;
  title: string;
  sections: any[];
  imageUrl?: string;
  /**
   * 'event'  = 메인 이벤트 페이지 (여러 섹션 조합)
   * 'banner' = 메인비주얼 배너 (웹/모바일 쌍)
   * 'page'   = 페이지 개발 템플릿 (긴 세로 상세 페이지)
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
  /**
   * 이벤트 전체에 적용할 cafe24 쿠폰 번호 배열.
   * widget.js 의 data-coupon-nos 로 전달되어 상품 가격을
   * 쿠폰 할인가(benefit_price) 로 표시하는 용도.
   */
  couponNos: string[];
  /** 이벤트 페이지 전체 콘텐츠 최대 너비(px). 없으면 위젯 기본값 800 사용. */
  pageMaxWidth?: number;
  createdAt: Date;
  updatedAt: Date;
}

const DEFAULT_MALL_ID = process.env.NEXT_PUBLIC_CAFE24_MALL_ID || process.env.CAFE24_MALLID || 'yogibo';

const EventPageSchema: Schema = new Schema({
  mallId: {
    type: String,
    required: true,
    default: DEFAULT_MALL_ID,
    index: true,
  },
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
    enum: ['event', 'banner', 'page'],
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
  couponNos: {
    type: [String],
    default: [],
  },
  pageMaxWidth: {
    type: Number,
    required: false,
  },
}, {
  timestamps: true,
});

// EventPage 만 ychat 과 동일한 'yogibo' DB 의 'eventTemple' 컬렉션을 사용.
// 다른 모델(References, Products 등) 은 mongodb.ts 기본 연결(URI 의 /test)을 그대로 사용.
//
// useDb('yogibo', { useCache: true }) 는 동일 connection pool 위에 child connection 을
// 만들어 다른 DB 를 가리키게 함. 별도 connect 호출 불필요.
const yogiboConn = mongoose.connection.useDb('yogibo', { useCache: true });

// HMR 환경에서 기존 모델 캐시가 남아있으면 신규 필드가 반영 안 되니 제거 후 재등록.
if ((yogiboConn.models as Record<string, unknown>).EventPage) {
  try { (yogiboConn as any).deleteModel?.('EventPage'); } catch { /* noop */ }
}

const EventPage: Model<IEventPage> =
  yogiboConn.model<IEventPage>('EventPage', EventPageSchema, 'eventTemple');

export default EventPage;

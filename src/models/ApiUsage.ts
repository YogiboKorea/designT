import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * API 사용량 카운터 — fal.ai 등 외부 유료 API 누적 사용 추적용.
 * 키 단위로 한 문서. 직원 테스트 무분별 사용 방지 안전장치.
 */
export interface IApiUsage extends Document {
  /** 카운터 고유 키 — 예: 'fal-flux-pro-1.1' */
  key: string;
  /** 현재까지 누적 카운트 (이미지 장수 등) */
  count: number;
  /** 차단 한도. count >= limit 이면 차단. */
  limit: number;
  createdAt: Date;
  updatedAt: Date;
}

const ApiUsageSchema = new Schema<IApiUsage>(
  {
    key: { type: String, required: true, unique: true, index: true },
    count: { type: Number, required: true, default: 0 },
    limit: { type: Number, required: true, default: 100 },
  },
  { timestamps: true },
);

// HMR 캐시 무효화
if ((mongoose.models as Record<string, unknown>).ApiUsage) {
  try { (mongoose as any).deleteModel?.('ApiUsage'); } catch { /* noop */ }
}

const ApiUsage: Model<IApiUsage> =
  mongoose.model<IApiUsage>('ApiUsage', ApiUsageSchema, 'apiUsage');

export default ApiUsage;

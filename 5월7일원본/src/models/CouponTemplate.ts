import mongoose, { Schema, Document } from 'mongoose';

export interface ICouponTemplate extends Document {
  templateId: string;
  name: string;
  description: string;
  thumbnail: string;
  bgColor: string;
  bgGradient?: string;
  texts: any[];
  coupons: any[];
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CouponTemplateSchema = new Schema(
  {
    templateId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    description: { type: String, required: true },
    thumbnail: { type: String, required: true },
    bgColor: { type: String, required: true },
    bgGradient: { type: String },
    texts: { type: [Schema.Types.Mixed], default: [] },
    coupons: { type: [Schema.Types.Mixed], default: [] },
    active: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

if ((mongoose.models as any).CouponTemplate) {
  delete (mongoose.models as any).CouponTemplate;
}

export default mongoose.models.CouponTemplate ||
  mongoose.model<ICouponTemplate>('CouponTemplate', CouponTemplateSchema, 'coupon_templates');

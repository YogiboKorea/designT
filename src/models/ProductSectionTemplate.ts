import mongoose, { Schema, Document } from 'mongoose';

export interface IProductSectionTemplate extends Document {
  templateId: string;
  name: string;
  description: string;
  thumbnail: string;
  layout: 'uniform' | 'featured';
  columns: 1 | 2 | 3;
  bgColor?: string;
  bgGradient?: string;
  paddingTop: number;
  paddingBottom: number;
  texts: any[];
  products: any[];
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ProductSectionTemplateSchema = new Schema(
  {
    templateId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    description: { type: String, required: true },
    thumbnail: { type: String, required: true },
    layout: { type: String, enum: ['uniform', 'featured'], required: true },
    columns: { type: Number, required: true },
    bgColor: { type: String },
    bgGradient: { type: String },
    paddingTop: { type: Number, required: true },
    paddingBottom: { type: Number, required: true },
    texts: { type: [Schema.Types.Mixed], default: [] },
    products: { type: [Schema.Types.Mixed], default: [] },
    active: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

if ((mongoose.models as any).ProductSectionTemplate) {
  delete (mongoose.models as any).ProductSectionTemplate;
}

export default mongoose.models.ProductSectionTemplate ||
  mongoose.model<IProductSectionTemplate>('ProductSectionTemplate', ProductSectionTemplateSchema, 'product_section_templates');

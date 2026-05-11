import mongoose, { Schema, Document } from 'mongoose';

export interface IMainVisualTemplate extends Document {
  templateId: string;
  name: string;
  description: string;
  thumbnail: string;
  height: number;
  background: string;
  variables: any[];
  texts: any[];
  stickers: any[];
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const MainVisualTemplateSchema = new Schema(
  {
    templateId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    description: { type: String, required: true },
    thumbnail: { type: String, required: true },
    height: { type: Number, required: true },
    background: { type: String, required: true },
    variables: { type: [Schema.Types.Mixed], default: [] },
    texts: { type: [Schema.Types.Mixed], default: [] },
    stickers: { type: [Schema.Types.Mixed], default: [] },
    active: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

if ((mongoose.models as any).MainVisualTemplate) {
  delete (mongoose.models as any).MainVisualTemplate;
}

export default mongoose.models.MainVisualTemplate ||
  mongoose.model<IMainVisualTemplate>('MainVisualTemplate', MainVisualTemplateSchema, 'main_visual_templates');

import mongoose, { Schema, Document } from 'mongoose';

export interface ICampaignTemplate extends Document {
  templateId: string; // 원래의 id (예: seasonal-sale)
  emoji: string;
  name: string;
  description: string;
  fields: any[];
  contextForAI: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CampaignTemplateSchema = new Schema(
  {
    templateId: { type: String, required: true, unique: true },
    emoji: { type: String, required: true },
    name: { type: String, required: true },
    description: { type: String, required: true },
    fields: { type: [Schema.Types.Mixed], default: [] },
    contextForAI: { type: String, default: '' },
    active: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

if ((mongoose.models as any).CampaignTemplate) {
  delete (mongoose.models as any).CampaignTemplate;
}

export default mongoose.models.CampaignTemplate ||
  mongoose.model<ICampaignTemplate>('CampaignTemplate', CampaignTemplateSchema, 'campaign_templates');

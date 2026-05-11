import mongoose, { Schema, Document } from 'mongoose';

export interface IStickerLibraryItem extends Document {
  libraryId: string;
  category: 'discount' | 'time' | 'highlight' | 'season';
  label: string;
  preview: string;
  template: any;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const StickerLibraryItemSchema = new Schema(
  {
    libraryId: { type: String, required: true, unique: true },
    category: {
      type: String,
      enum: ['discount', 'time', 'highlight', 'season'],
      required: true,
      index: true,
    },
    label: { type: String, required: true },
    preview: { type: String, required: true },
    template: { type: Schema.Types.Mixed, required: true },
    active: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

if ((mongoose.models as any).StickerLibraryItem) {
  delete (mongoose.models as any).StickerLibraryItem;
}

export default mongoose.models.StickerLibraryItem ||
  mongoose.model<IStickerLibraryItem>('StickerLibraryItem', StickerLibraryItemSchema, 'sticker_library');

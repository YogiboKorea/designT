import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import CampaignTemplate from '@/models/CampaignTemplate';
import CouponTemplate from '@/models/CouponTemplate';
import MainVisualTemplate from '@/models/MainVisualTemplate';
import ProductSectionTemplate from '@/models/ProductSectionTemplate';
import StickerLibraryItem from '@/models/StickerLibraryItem';

const getModel = (type: string) => {
  switch (type) {
    case 'campaign': return CampaignTemplate;
    case 'coupon': return CouponTemplate;
    case 'main-visual': return MainVisualTemplate;
    case 'product-section': return ProductSectionTemplate;
    case 'sticker': return StickerLibraryItem;
    default: return null;
  }
};

export async function PUT(request: NextRequest, { params }: { params: Promise<{ type: string; id: string }> }) {
  try {
    const { type, id } = await params;
    await connectToDatabase();
    const Model = getModel(type);

    if (!Model) {
      return NextResponse.json({ success: false, error: 'Invalid template type' }, { status: 400 });
    }

    const data = await request.json();
    const idField = type === 'sticker' ? 'libraryId' : 'templateId';

    const updatedItem = await Model.findOneAndUpdate(
      { [idField]: id },
      { $set: data },
      { new: true }
    );

    if (!updatedItem) {
      return NextResponse.json({ success: false, error: 'Template not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updatedItem });
  } catch (error) {
    console.error('Error updating template:', error);
    return NextResponse.json({ success: false, error: 'Failed to update template' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ type: string; id: string }> }) {
  try {
    const { type, id } = await params;
    await connectToDatabase();
    const Model = getModel(type);

    if (!Model) {
      return NextResponse.json({ success: false, error: 'Invalid template type' }, { status: 400 });
    }

    const idField = type === 'sticker' ? 'libraryId' : 'templateId';
    const deletedItem = await Model.findOneAndDelete({ [idField]: id });

    if (!deletedItem) {
      return NextResponse.json({ success: false, error: 'Template not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Template deleted' });
  } catch (error) {
    console.error('Error deleting template:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete template' }, { status: 500 });
  }
}

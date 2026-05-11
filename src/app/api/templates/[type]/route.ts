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

export async function GET(request: NextRequest, { params }: { params: Promise<{ type: string }> }) {
  try {
    const { type } = await params;
    await connectToDatabase();
    const Model = getModel(type);

    if (!Model) {
      return NextResponse.json({ success: false, error: 'Invalid template type' }, { status: 400 });
    }

    const url = new URL(request.url);
    const all = url.searchParams.get('all') === 'true';

    const query = all ? {} : { active: true };
    const items = await Model.find(query).sort({ createdAt: -1 });

    return NextResponse.json({ success: true, data: items });
  } catch (error) {
    console.error('Error fetching templates:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch templates' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ type: string }> }) {
  try {
    const { type } = await params;
    await connectToDatabase();
    const Model = getModel(type);

    if (!Model) {
      return NextResponse.json({ success: false, error: 'Invalid template type' }, { status: 400 });
    }

    const data = await request.json();

    const idField = type === 'sticker' ? 'libraryId' : 'templateId';
    if (!data[idField]) {
      data[idField] = `${type}-${Date.now()}`;
    }

    const newItem = await Model.create(data);

    return NextResponse.json({ success: true, data: newItem });
  } catch (error) {
    console.error('Error creating template:', error);
    return NextResponse.json({ success: false, error: 'Failed to create template' }, { status: 500 });
  }
}

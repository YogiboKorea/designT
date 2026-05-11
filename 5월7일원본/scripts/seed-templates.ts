import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// 기존 하드코딩 데이터
import { CAMPAIGN_TEMPLATES } from '../src/data/campaign-templates';
import { COUPON_TEMPLATES } from '../src/data/coupon-templates';
import { MAIN_VISUAL_TEMPLATES } from '../src/data/main-visual-templates';
import { PRODUCT_TEMPLATES } from '../src/data/product-templates';
import { STICKER_LIBRARY } from '../src/data/sticker-library';

// 새로 만든 Mongoose 모델
import CampaignTemplate from '../src/models/CampaignTemplate';
import CouponTemplate from '../src/models/CouponTemplate';
import MainVisualTemplate from '../src/models/MainVisualTemplate';
import ProductSectionTemplate from '../src/models/ProductSectionTemplate';
import StickerLibraryItem from '../src/models/StickerLibraryItem';

// .env.local 로드
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function seedTemplates() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI is not defined in .env.local');
    process.exit(1);
  }

  try {
    await mongoose.connect(uri);
    console.log('Connected to MongoDB');

    // 1. Campaign Templates
    console.log('Seeding Campaign Templates...');
    for (const tpl of CAMPAIGN_TEMPLATES) {
      await CampaignTemplate.findOneAndUpdate(
        { templateId: tpl.id },
        { ...tpl, templateId: tpl.id },
        { upsert: true, new: true }
      );
    }

    // 2. Coupon Templates
    console.log('Seeding Coupon Templates...');
    for (const tpl of COUPON_TEMPLATES) {
      await CouponTemplate.findOneAndUpdate(
        { templateId: tpl.id },
        { ...tpl, templateId: tpl.id },
        { upsert: true, new: true }
      );
    }

    // 3. Main Visual Templates
    console.log('Seeding Main Visual Templates...');
    for (const tpl of MAIN_VISUAL_TEMPLATES) {
      await MainVisualTemplate.findOneAndUpdate(
        { templateId: tpl.id },
        { ...tpl, templateId: tpl.id },
        { upsert: true, new: true }
      );
    }

    // 4. Product Section Templates
    console.log('Seeding Product Section Templates...');
    for (const tpl of PRODUCT_TEMPLATES) {
      await ProductSectionTemplate.findOneAndUpdate(
        { templateId: tpl.id },
        { ...tpl, templateId: tpl.id },
        { upsert: true, new: true }
      );
    }

    // 5. Sticker Library
    console.log('Seeding Sticker Library...');
    for (const item of STICKER_LIBRARY) {
      await StickerLibraryItem.findOneAndUpdate(
        { libraryId: item.libraryId },
        { ...item },
        { upsert: true, new: true }
      );
    }

    console.log('✅ Seeding completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding templates:', error);
    process.exit(1);
  }
}

seedTemplates();

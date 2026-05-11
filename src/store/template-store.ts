import { create } from 'zustand';

interface TemplateStore {
  campaignTemplates: any[];
  couponTemplates: any[];
  mainVisualTemplates: any[];
  productTemplates: any[];
  stickerLibrary: any[];
  loading: boolean;
  error: string | null;
  fetchTemplates: () => Promise<void>;
  
  getCampaignTemplate: (id: string) => any;
  getCouponTemplate: (id: string) => any;
  getMainVisualTemplate: (id: string) => any;
  getProductTemplate: (id: string) => any;
  getSticker: (id: string) => any;
}

export const useTemplateStore = create<TemplateStore>((set, get) => ({
  campaignTemplates: [],
  couponTemplates: [],
  mainVisualTemplates: [],
  productTemplates: [],
  stickerLibrary: [],
  loading: false,
  error: null,

  fetchTemplates: async () => {
    set({ loading: true, error: null });
    try {
      const [campaign, coupon, mainVisual, product, sticker] = await Promise.all([
        fetch('/api/templates/campaign').then(res => res.json()),
        fetch('/api/templates/coupon').then(res => res.json()),
        fetch('/api/templates/main-visual').then(res => res.json()),
        fetch('/api/templates/product-section').then(res => res.json()),
        fetch('/api/templates/sticker').then(res => res.json())
      ]);

      set({
        campaignTemplates: campaign.data || [],
        couponTemplates: coupon.data || [],
        mainVisualTemplates: mainVisual.data || [],
        productTemplates: product.data || [],
        stickerLibrary: sticker.data || [],
        loading: false
      });
    } catch (err) {
      set({ error: 'Failed to fetch templates', loading: false });
    }
  },

  getCampaignTemplate: (id: string) => get().campaignTemplates.find(t => t.templateId === id || t.id === id),
  getCouponTemplate: (id: string) => get().couponTemplates.find(t => t.templateId === id || t.id === id),
  getMainVisualTemplate: (id: string) => get().mainVisualTemplates.find(t => t.templateId === id || t.id === id),
  getProductTemplate: (id: string) => get().productTemplates.find(t => t.templateId === id || t.id === id),
  getSticker: (id: string) => get().stickerLibrary.find(t => t.libraryId === id || t.id === id),
}));

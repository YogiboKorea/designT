import React from 'react';
import { SectionData } from '../app/builder/types';
import DraggableText from './DraggableText';

interface CouponBuilderProps {
  data: Extract<SectionData, { type: 'coupon' }>;
  onChange: (updatedData: SectionData) => void;
  isPreview?: boolean;
  activeTextId?: string | null;
  onSelectText?: (id: string | null) => void;
  activeItemId?: string | null;
  onActivateItem?: (id: string) => void;
}

export default function CouponBuilder({ data, onChange, isPreview = false, activeTextId, onSelectText, activeItemId, onActivateItem }: CouponBuilderProps) {
  const { bgColor, bgImage, coupons, texts } = data;

  const handleUpdateText = (id: string, newText: string, pos: {x:number, y:number}, styleObj: any) => {
    const updatedTexts = texts.map((t) =>
      t.id === id ? { ...t, text: newText, position: pos, style: { ...styleObj } } : t
    );
    onChange({ ...data, texts: updatedTexts });
  };

  const handleDeleteText = (id: string) => {
    onChange({ ...data, texts: texts.filter((t) => t.id !== id) });
  };

  const downloadCoupon = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    alert('쿠폰 다운로드 링크가 작동합니다. (미리보기/개발환경)');
  };

  return (
    <div style={{ backgroundColor: bgColor, backgroundImage: bgImage ? `url(${bgImage})` : 'none', backgroundSize: 'cover', backgroundPosition: 'center', padding: '60px 20px', minHeight: '300px', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
      {texts.map((t) => (
        <React.Fragment key={t.id}>
          <DraggableText item={t} isActive={activeTextId === t.id} onSelect={onSelectText ? () => onSelectText(t.id) : undefined} onUpdate={handleUpdateText} onDelete={handleDeleteText} isPreview={isPreview} />
        </React.Fragment>
      ))}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%', maxWidth: `${Math.max(...coupons.map(c => c.couponWidth || 400), 400)}px`, zIndex: 1, marginTop: '120px' }}>
        {coupons.map((c) => (
          <div
            key={c.id}
            className="coupon-ticket"
            style={{ backgroundColor: c.couponBgColor || 'white', outline: activeItemId === c.id ? '2px solid #2563eb' : 'none', borderRadius: '12px', cursor: isPreview ? 'default' : 'pointer', maxWidth: c.couponWidth ? `${c.couponWidth}px` : undefined, width: '100%' }}
            onDoubleClick={() => !isPreview && onActivateItem && onActivateItem(c.id)}
          >
            <div className="coupon-ticket-info" style={{ borderColor: c.couponBgColor ? 'rgba(0,0,0,0.05)' : '#e5e7eb' }}>
              <div className="coupon-ticket-label" style={{ color: c.labelColor || '#ec4899' }}>{c.label ?? '🎟️ SPECIAL COUPON'}</div>
              <div className="coupon-ticket-desc" style={{ color: c.nameColor || '#111827' }}>{c.name}</div>
            </div>
            <div className="coupon-ticket-action" onClick={downloadCoupon} style={{ backgroundColor: c.couponBgColor ? 'rgba(0,0,0,0.02)' : '#f8fafc' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '4px' }}>
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
            </div>
          </div>
        ))}
      </div>
      
      {coupons.length === 0 && !isPreview && (
        <div style={{ color: '#fff', opacity: 0.8, marginTop: '20px' }}>오른쪽 패널에서 쿠폰을 추가하세요.</div>
      )}
    </div>
  );
}

import React from 'react';
import { SectionData, ProductItem } from '../app/builder/types';
import DraggableText from './DraggableText';

interface ProductDescriptionBuilderProps {
  data: Extract<SectionData, { type: 'product' }>;
  onChange: (updatedData: SectionData) => void;
  isPreview?: boolean;
  activeTextId?: string | null;
  onSelectText?: (id: string | null) => void;
  activeItemId?: string | null;
  onActivateItem?: (id: string) => void;
}

export default function ProductDescriptionBuilder({ data, onChange, isPreview = false, activeTextId, onSelectText, activeItemId, onActivateItem }: ProductDescriptionBuilderProps) {
  const { columns, products, texts } = data;
  const paddingTop = data.paddingTop ?? 80;
  const paddingBottom = data.paddingBottom ?? 50;

  const handleUpdateText = (id: string, newText: string, pos: {x:number, y:number}, styleObj: any) => {
    const updatedTexts = texts.map((t) =>
      t.id === id ? { ...t, text: newText, position: pos, style: { ...styleObj } } : t
    );
    onChange({ ...data, texts: updatedTexts });
  };

  const handleDeleteText = (id: string) => {
    onChange({ ...data, texts: texts.filter((t) => t.id !== id) });
  };

  const getBadgeMarkup = (p: ProductItem) => {
    if (p.badge === 'none') return null;
    const label = p.badge === 'custom' ? (p.badgeLabel || 'CUSTOM') : p.badge.toUpperCase();
    const defaultColors: Record<string, string> = { best: '#ec4899', new: '#3b82f6', hot: '#ef4444', custom: '#10b981' };
    const bg = p.badgeColor || defaultColors[p.badge] || '#6b7280';
    const pos = p.badgePosition === 'right' ? { right: 16, left: 'auto' } : { left: 16 };
    return (
      <div
        style={{
          position: 'absolute', top: 16, ...pos, padding: '6px 14px',
          borderRadius: '999px', fontSize: '13px', fontWeight: 800, letterSpacing: '0.5px',
          zIndex: 10, boxShadow: '0 4px 10px rgba(0,0,0,0.15)', color: 'white',
          background: bg,
        }}
      >
        {label}
      </div>
    );
  };

  const getDiscountMarkup = (p: ProductItem) => {
    if (!p.discount || p.discount <= 0) return null;
    const bg = p.discountColor || '#00d280';
    const pos = p.discountPosition === 'left' ? { left: 14, right: 'auto' } : { right: 14 };
    return (
      <div
        style={{
          position: 'absolute', top: 14, ...pos,
          background: bg, color: 'white', width: 64, height: 64, borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18, fontWeight: 900, boxShadow: `0 4px 12px ${bg}88`,
          zIndex: 10, letterSpacing: '-0.5px',
        }}
      >
        {p.discount}%
      </div>
    );
  };

  const gridCls = data.layout === 'featured' ? 'product-featured-grid' : `product-grid cols-${columns}`;

  return (
    <div className="product-section" style={{ position: 'relative', paddingTop, paddingBottom }}>
      {texts.map((t) => (
        <React.Fragment key={t.id}>
          <DraggableText
            item={t}
            isActive={activeTextId === t.id}
            onSelect={onSelectText ? () => onSelectText(t.id) : undefined}
            onUpdate={handleUpdateText}
            onDelete={handleDeleteText}
            isPreview={isPreview}
          />
        </React.Fragment>
      ))}

      {products.length === 0 && !isPreview && (
        <div style={{ textAlign: 'center', color: '#999', padding: '2rem 0' }}>오른쪽 패널에서 상품을 추가하세요.</div>
      )}

      <div className={gridCls}>
        {products.map((p) => (
          <div
            key={p.id}
            className="product-card"
            style={{ display: 'flex', flexDirection: 'column', outline: activeItemId === p.id ? '3px solid #2563eb' : 'none', outlineOffset: '2px', cursor: isPreview ? 'default' : 'pointer' }}
            onDoubleClick={() => !isPreview && onActivateItem && onActivateItem(p.id)}
          >
            {getBadgeMarkup(p)}
            {getDiscountMarkup(p)}
            <div className="product-card-img">
              {p.image ? <img src={p.image} alt={p.name} /> : '이미지 없음'}
            </div>
            {p.name && p.name.trim() !== '' && (
              <div className="product-card-body">
                <div className="product-card-name" style={{ color: '#1f2937' }}>{p.name}</div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

import React from 'react';
import { SectionData, ProductItem, TextStyle } from '../app/builder/types';
import DraggableText from './DraggableText';
import { getProductTemplateById } from '../data/product-templates';

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
  const { columns, products, texts, bgColor, bgGradient, templateId } = data;
  const paddingTop = data.paddingTop ?? 80;
  const paddingBottom = data.paddingBottom ?? 50;
  const template = templateId ? getProductTemplateById(templateId) : undefined;

  const handleUpdateText = (id: string, newText: string, pos: {x:number, y:number}, styleObj: TextStyle) => {
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
    const pos = p.badgePosition === 'right' ? { right: 16, left: 'auto' as const } : { left: 16 };
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
    const pos = p.discountPosition === 'left' ? { left: 14, right: 'auto' as const } : { right: 14 };
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

  // 배경 결정: bgGradient > bgColor (둘 다 옵션)
  const sectionBg: React.CSSProperties = bgGradient
    ? { background: bgGradient }
    : bgColor
      ? { backgroundColor: bgColor }
      : {};

  // 다크 배경 자동 감지 — 어두운 배경에서는 카드 텍스트를 밝게
  // (HEX 단색만 검사, 그라데이션은 폴백)
  const isDarkBg = (() => {
    const c = bgColor || '';
    if (c.startsWith('#') && (c.length === 7 || c.length === 4)) {
      const hex = c.length === 4
        ? c.replace('#', '').split('').map((x) => x + x).join('')
        : c.replace('#', '');
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      // ITU-R BT.601 luma — 0~255 범위, 80 미만이면 어두운 톤으로 판단
      const luma = 0.299 * r + 0.587 * g + 0.114 * b;
      return luma < 80;
    }
    return false;
  })();
  const nameColor = isDarkBg ? '#fef3c7' : '#1f2937';
  const subtitleColor = isDarkBg ? '#a8a29e' : '#6b7280';

  // 빈 상태 안내
  const isEmpty = !template && products.length === 0 && texts.length === 0;

  return (
    <div className="product-section" style={{ position: 'relative', paddingTop, paddingBottom, ...sectionBg }}>
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

      {isEmpty && !isPreview && (
        <div style={{ textAlign: 'center', color: '#9ca3af', padding: '2rem 0', fontSize: 14 }}>
          오른쪽 패널에서 상품 템플릿을 먼저 선택해주세요.
        </div>
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
            {((p.name && p.name.trim() !== '') || (p.subtitle && p.subtitle.trim() !== '')) && (
              <div className="product-card-body">
                {p.name && p.name.trim() !== '' && (
                  <div className="product-card-name" style={{ color: nameColor }}>{p.name}</div>
                )}
                {p.subtitle && p.subtitle.trim() !== '' && (
                  <div
                    className="product-card-subtitle"
                    style={{
                      color: subtitleColor,
                      fontSize: 13,
                      fontWeight: 400,
                      marginTop: 4,
                      lineHeight: 1.45,
                    }}
                  >
                    {p.subtitle}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

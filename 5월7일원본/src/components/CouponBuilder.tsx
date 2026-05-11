import React from 'react';
import { SectionData, CouponItem, TextStyle } from '../app/builder/types';
import DraggableText from './DraggableText';
import { getCouponTemplateById } from '../data/coupon-templates';

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
  const { bgColor, bgImage, bgGradient, coupons, texts, templateId } = data;
  const template = templateId ? getCouponTemplateById(templateId) : undefined;

  const handleUpdateText = (id: string, newText: string, pos: {x:number, y:number}, styleObj: TextStyle) => {
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

  // 배경 결정: bgImage > bgGradient > bgColor
  const containerBg: React.CSSProperties = bgImage
    ? { backgroundColor: bgColor, backgroundImage: `url(${bgImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : bgGradient
      ? { background: bgGradient }
      : { backgroundColor: bgColor };

  // 템플릿 미적용 + 빈 데이터 안내
  const isEmpty = !template && coupons.length === 0 && texts.length === 0;

  return (
    <div
      style={{
        ...containerBg,
        padding: '60px 20px',
        minHeight: '300px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        position: 'relative',
      }}
    >
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

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          width: '100%',
          maxWidth: `${Math.max(...coupons.map((c) => c.couponWidth || 400), 400)}px`,
          zIndex: 1,
          marginTop: '120px',
        }}
      >
        {coupons.map((c) => (
          <CouponCard
            key={c.id}
            coupon={c}
            isActive={activeItemId === c.id}
            isPreview={isPreview}
            onActivate={() => !isPreview && onActivateItem && onActivateItem(c.id)}
            onDownload={downloadCoupon}
          />
        ))}
      </div>

      {isEmpty && !isPreview && (
        <div style={{ color: '#9ca3af', marginTop: '20px', fontSize: 14 }}>
          오른쪽 패널에서 쿠폰 템플릿을 먼저 선택해주세요.
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// 쿠폰 카드 렌더링 — shape / borderStyle 에 따라 모양 변경
// ─────────────────────────────────────────────────────────────────
function CouponCard({
  coupon: c,
  isActive,
  isPreview,
  onActivate,
  onDownload,
}: {
  coupon: CouponItem;
  isActive: boolean;
  isPreview: boolean;
  onActivate: () => void;
  onDownload: (e: React.MouseEvent) => void;
}) {
  const shape = c.shape || 'classic';
  const borderStyle = c.borderStyle || 'solid';
  const cardBg = c.gradient || c.couponBgColor || '#ffffff';
  const labelColor = c.labelColor || '#ec4899';
  const nameColor = c.nameColor || '#111827';

  // 보더 정의
  const borderCss =
    borderStyle === 'none'
      ? 'none'
      : borderStyle === 'dashed'
        ? `2px dashed ${labelColor}`
        : `1px solid rgba(0,0,0,0.08)`;

  // 모서리 둥글기 — shape 별
  const radius = shape === 'badge' ? 999 : shape === 'ticket' ? 6 : 12;

  // 카드 wrapper 스타일
  const wrap: React.CSSProperties = {
    background: cardBg,
    outline: isActive ? '2px solid #2563eb' : 'none',
    border: borderCss,
    borderRadius: radius,
    cursor: isPreview ? 'default' : 'pointer',
    maxWidth: c.couponWidth ? `${c.couponWidth}px` : undefined,
    width: '100%',
    overflow: 'hidden',
    position: 'relative',
    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
  };

  return (
    <div style={wrap} onDoubleClick={onActivate}>
      <div style={{ display: 'flex', alignItems: 'stretch' }}>
        <div
          style={{
            flex: 1,
            padding: '22px 26px',
            borderRight:
              shape === 'ticket'
                ? `2px dashed rgba(0,0,0,0.15)`
                : `1px solid rgba(0,0,0,0.05)`,
          }}
        >
          <div
            style={{
              color: labelColor,
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: 1,
              marginBottom: 6,
            }}
          >
            {c.label ?? '🎟️ SPECIAL COUPON'}
          </div>
          <div
            style={{
              color: nameColor,
              fontSize: 19,
              fontWeight: 800,
              lineHeight: 1.3,
            }}
          >
            {c.name}
          </div>
        </div>
        <div
          onClick={onDownload}
          style={{
            width: 90,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: labelColor,
            cursor: 'pointer',
            background: 'rgba(0,0,0,0.02)',
          }}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ marginBottom: 4 }}
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
          <span style={{ fontSize: 11, fontWeight: 700 }}>다운</span>
        </div>
      </div>
    </div>
  );
}

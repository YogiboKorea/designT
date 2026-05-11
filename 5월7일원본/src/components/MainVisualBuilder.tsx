import React, { useEffect, useRef, useState } from 'react';
import DraggableText from './DraggableText';
import { SectionData, StickerItem } from '../app/builder/types';
import { getTemplateById, resolveTemplate } from '../data/main-visual-templates';

interface MainVisualBuilderProps {
  data: Extract<SectionData, { type: 'main' }>;
  onChange: (updatedData: SectionData) => void;
  isPreview?: boolean;
  activeTextId?: string | null;
  onSelectText?: (id: string) => void;
}

export default function MainVisualBuilder({ data, onChange, isPreview = false, activeTextId, onSelectText }: MainVisualBuilderProps) {
  const { bgImage, texts, stickers = [], templateId, templateVars } = data;

  // 템플릿이 적용된 경우 배경/높이를 가져옴
  const template = templateId ? getTemplateById(templateId) : undefined;
  const hasTemplate = !!template;

  const handleUpdateText = (id: string, newText: string, pos: {x:number, y:number}, styleObj: any) => {
    const updatedTexts = texts.map((t) =>
      t.id === id ? { ...t, text: newText, position: pos, style: { ...styleObj } } : t
    );
    onChange({ ...data, texts: updatedTexts });
  };

  const handleDeleteText = (id: string) => {
    onChange({ ...data, texts: texts.filter((t) => t.id !== id) });
  };

  /** 스티커 위치 업데이트 (드래그 시 호출됨) */
  const handleUpdateSticker = (id: string, position: { x: number; y: number }) => {
    const updatedStickers = stickers.map((s) => (s.id === id ? { ...s, position } : s));
    onChange({ ...data, stickers: updatedStickers });
  };

  // 변수 치환된 텍스트
  const resolvedTexts = templateVars
    ? texts.map((t) => ({ ...t, text: resolveTemplate(t.text, templateVars) }))
    : texts;

  const containerStyle: React.CSSProperties = hasTemplate
    ? {
        position: 'relative',
        width: '100%',
        height: template!.height,
        overflow: 'hidden',
        background: template!.background,
      }
    : {
        position: 'relative',
        width: '100%',
        overflow: 'hidden',
        minHeight: bgImage ? 'auto' : '200px',
      };

  return (
    <div style={containerStyle}>
      {/* 배경 이미지 — 템플릿 미적용 시 일반 배경 */}
      {!hasTemplate && bgImage && (
        <img src={bgImage} style={{ width: '100%', display: 'block', position: 'relative', zIndex: 0 }} alt="Background" />
      )}

      {/* 템플릿 적용 + 배경 이미지
       *  · 미니멀 템플릿(minimal): 사진이 주인공 → 풀 불투명, 가독성용 그라데이션만 약하게
       *  · 그 외 템플릿: 템플릿 톤이 주인공 → 사진은 반투명으로 깔고 어두운 오버레이 강하게
       */}
      {hasTemplate && bgImage && templateId === 'minimal' && (
        <>
          <img
            src={bgImage}
            alt="Background"
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              zIndex: 0,
              pointerEvents: 'none',
            }}
          />
          {/* 텍스트 가독성 — 약한 그라데이션만 (사진은 거의 그대로) */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'linear-gradient(180deg, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0) 35%, rgba(0,0,0,0) 65%, rgba(0,0,0,0.25) 100%)',
              zIndex: 0,
              pointerEvents: 'none',
            }}
          />
        </>
      )}

      {hasTemplate && bgImage && templateId !== 'minimal' && (
        <>
          <img
            src={bgImage}
            alt="Background"
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              opacity: 0.55,
              zIndex: 0,
              pointerEvents: 'none',
            }}
          />
          {/* 가독성 향상용 검정 그라데이션 오버레이 (템플릿 톤 유지) */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.15) 50%, rgba(0,0,0,0.45) 100%)',
              zIndex: 0,
              pointerEvents: 'none',
            }}
          />
        </>
      )}

      {/* 빈 안내 문구 */}
      {!hasTemplate && !bgImage && !isPreview && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ccc', pointerEvents: 'none' }}>
          메인 이미지 설정 또는 템플릿 선택 (우측 패널)
        </div>
      )}

      {/* ━━━ 스티커 레이어 ━━━ */}
      {stickers.map((s) => (
        <DraggableSticker
          key={s.id}
          sticker={s}
          templateVars={templateVars}
          isPreview={isPreview}
          onUpdatePosition={handleUpdateSticker}
        />
      ))}

      {/* ━━━ 텍스트 레이어 ━━━ */}
      {resolvedTexts.map((t) => (
        <DraggableText
          key={t.id}
          item={t}
          isActive={activeTextId === t.id}
          onSelect={onSelectText ? () => onSelectText(t.id) : undefined}
          onUpdate={handleUpdateText}
          onDelete={handleDeleteText}
          isPreview={isPreview}
        />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// 드래그 가능한 스티커 (할인 뱃지·이모지·SVG)
//   · isPreview=true 면 정적 렌더 (드래그 불가)
//   · type='discount' 만 드래그 가능 (이모지·SVG 는 위치 고정 — 디자인 완성도 위해)
// ─────────────────────────────────────────────────────────────────
function DraggableSticker({
  sticker,
  templateVars,
  isPreview,
  onUpdatePosition,
}: {
  sticker: StickerItem;
  templateVars?: Record<string, string | number>;
  isPreview: boolean;
  onUpdatePosition: (id: string, pos: { x: number; y: number }) => void;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [position, setPosition] = useState(sticker.position);
  const [isHovered, setIsHovered] = useState(false);
  const elRef = useRef<HTMLDivElement>(null);

  // sticker.position 이 바뀌면 로컬 상태도 동기화 (다른 곳에서 수정될 때)
  useEffect(() => {
    setPosition(sticker.position);
  }, [sticker.position.x, sticker.position.y]);

  // 모든 스티커 드래그 가능 (라이브러리에서 자유 추가하는 케이스 포함).
  // 미리보기 모드에서는 비활성.
  const draggable = !isPreview;

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const parent = elRef.current?.parentElement;
      if (!parent) return;
      const rect = parent.getBoundingClientRect();
      // 부모 캔버스 안 좌표로 변환
      const newX = e.clientX - rect.left - dragOffset.x;
      const newY = e.clientY - rect.top - dragOffset.y;
      // 캔버스 밖으로 나가지 않게 클램프
      const clampedX = Math.max(0, Math.min(rect.width - sticker.size, newX));
      const clampedY = Math.max(0, Math.min(rect.height - sticker.size, newY));
      setPosition({ x: clampedX, y: clampedY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      onUpdatePosition(sticker.id, position);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset, position, sticker.id, sticker.size, onUpdatePosition]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!draggable) return;
    e.preventDefault();
    e.stopPropagation();
    const rect = elRef.current!.getBoundingClientRect();
    setDragOffset({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    setIsDragging(true);
  };

  const baseStyle: React.CSSProperties = {
    position: 'absolute',
    left: position.x,
    top: position.y,
    width: sticker.size,
    height: sticker.size,
    transform: sticker.rotation ? `rotate(${sticker.rotation}deg)` : undefined,
    pointerEvents: draggable ? 'auto' : 'none',
    zIndex: 1,
    cursor: draggable ? (isDragging ? 'grabbing' : 'grab') : 'default',
    transition: isDragging ? 'none' : 'box-shadow 0.15s',
    outline: draggable && isHovered && !isDragging ? '2px dashed rgba(99,102,241,0.7)' : 'none',
    outlineOffset: 4,
  };

  // ─── 이모지 ────────────────────────────────────────────────
  if (sticker.type === 'emoji') {
    return (
      <div
        ref={elRef}
        onMouseDown={handleMouseDown}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          ...baseStyle,
          fontSize: sticker.size,
          lineHeight: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          userSelect: 'none',
          // 이모지에 살짝 그림자 추가해서 입체감
          filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.25))',
        }}
      >
        {sticker.content}
      </div>
    );
  }

  // ─── SVG ──────────────────────────────────────────────────
  if (sticker.type === 'svg') {
    return (
      <div
        ref={elRef}
        onMouseDown={handleMouseDown}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          ...baseStyle,
          color: sticker.color,
          filter: 'drop-shadow(0 6px 16px rgba(0,0,0,0.35))',
        }}
        dangerouslySetInnerHTML={{ __html: sticker.content || '' }}
      />
    );
  }

  // ─── 할인 뱃지 (드래그 가능) ───────────────────────────────
  if (sticker.type === 'discount' && sticker.discountStyle) {
    const ds = sticker.discountStyle;
    const value = resolveTemplate(ds.valueTemplate, templateVars);
    const borderRadius = ds.shape === 'circle' ? '50%' : ds.shape === 'rounded' ? 20 : 4;

    return (
      <div
        ref={elRef}
        onMouseDown={handleMouseDown}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          ...baseStyle,
          background: ds.bgColor,
          borderRadius,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: ds.textColor,
          // 강화된 그림자 — 입체감 ↑
          boxShadow: `
            0 12px 32px rgba(0,0,0,0.35),
            0 4px 12px rgba(0,0,0,0.2),
            inset 0 2px 4px rgba(255,255,255,0.3),
            inset 0 -3px 8px rgba(0,0,0,0.15)
          `,
          // 하이라이트 보더
          border: '2px solid rgba(255,255,255,0.4)',
          textAlign: 'center',
          padding: '8px 12px',
          boxSizing: 'border-box',
          // 살짝 회전된 느낌 (지정 시)
          transform: sticker.rotation
            ? `rotate(${sticker.rotation}deg)${isDragging ? ' scale(1.05)' : ''}`
            : isDragging
              ? 'scale(1.05)'
              : undefined,
          // 드래그 가능 표시 (호버 시 약간 확대)
          ...(draggable && isHovered && !isDragging
            ? { transform: `${sticker.rotation ? `rotate(${sticker.rotation}deg) ` : ''}scale(1.03)` }
            : {}),
        }}
      >
        <div
          style={{
            fontSize: ds.labelFontSize,
            fontWeight: 700,
            letterSpacing: 1.5,
            opacity: 0.95,
            textShadow: '0 1px 2px rgba(0,0,0,0.2)',
          }}
        >
          {ds.label}
        </div>
        <div
          style={{
            fontSize: ds.fontSize,
            fontWeight: 900,
            lineHeight: 1.0,
            marginTop: 4,
            textShadow: '0 2px 6px rgba(0,0,0,0.3)',
            letterSpacing: -1,
          }}
        >
          {value}
        </div>
      </div>
    );
  }

  return null;
}

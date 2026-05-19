'use client';
import React, { useState, useRef, useEffect } from 'react';
import { TextItem } from '../app/builder/types';

interface DraggableTextProps {
  item: TextItem;
  isActive?: boolean;
  onSelect?: () => void;
  onUpdate?: (id: string, text: string, position: {x: number, y: number}, style: any) => void;
  onDelete?: (id: string) => void;
  isPreview?: boolean;
}

export default function DraggableText({ item, isActive, onSelect, onUpdate, onDelete, isPreview }: DraggableTextProps) {
  const { id, text, position, style } = item;
  
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<HTMLDivElement>(null);
  const offsetRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (isPreview) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging && dragRef.current) {
        const parent = dragRef.current.parentElement;
        if (parent) {
          // 캔버스가 CSS transform: scale(...) 로 줄어들어 있을 수 있어서
          // 화면 좌표(getBoundingClientRect)와 레이아웃 좌표(offsetWidth) 가 다름.
          // 내부 좌표계(레이아웃 = 캔버스 1920×680 등)로 통일해 계산.
          const rect = parent.getBoundingClientRect();
          const layoutW = parent.offsetWidth || rect.width;
          const layoutH = parent.offsetHeight || rect.height;
          const scaleX = rect.width / layoutW;
          const scaleY = rect.height / layoutH;

          const ptrX = (e.clientX - rect.left) / scaleX;
          const ptrY = (e.clientY - rect.top) / scaleY;
          let newX = ptrX - offsetRef.current.x;
          let newY = ptrY - offsetRef.current.y;

          newX = Math.max(0, Math.min(newX, layoutW - dragRef.current.offsetWidth));
          newY = Math.max(0, Math.min(newY, layoutH - dragRef.current.offsetHeight));

          if (onUpdate) onUpdate(id, text, { x: newX, y: newY }, style);
        }
      }
    };

    const handleMouseUp = () => {
      if (isDragging) setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, id, text, style, onUpdate, isPreview]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isPreview) return;
    setIsDragging(true);
    if (dragRef.current) {
      // offset 도 내부 좌표계(unscaled) 로 저장해야 mousemove 와 단위가 맞음.
      const dragRect = dragRef.current.getBoundingClientRect();
      const parent = dragRef.current.parentElement;
      let scaleX = 1, scaleY = 1;
      if (parent) {
        const parentRect = parent.getBoundingClientRect();
        scaleX = parentRect.width / (parent.offsetWidth || parentRect.width);
        scaleY = parentRect.height / (parent.offsetHeight || parentRect.height);
      }
      offsetRef.current = {
        x: (e.clientX - dragRect.left) / scaleX,
        y: (e.clientY - dragRect.top) / scaleY,
      };
    }
  };

  // Del / Backspace 로컬 처리는 제거 — 전역 리스너가 Delete 만 안전하게 처리한다.
  // (Backspace 로 실수 삭제되는 현상 방지)

  const resolvedLineHeight =
    style.lineHeight === undefined
      ? `${style.fontSize * 1.2}px`
      : style.lineHeight < 4
        ? `${style.fontSize * style.lineHeight}px`
        : `${style.lineHeight}px`;

  const textStyle: React.CSSProperties = {
    fontSize: `${style.fontSize}px`, 
    whiteSpace: 'pre-wrap', 
    color: style.color, 
    fontWeight: style.fontWeight as React.CSSProperties['fontWeight'], 
    textAlign: style.textAlign as React.CSSProperties['textAlign'],
    letterSpacing: style.letterSpacing !== undefined ? `${style.letterSpacing}px` : undefined,
    lineHeight: resolvedLineHeight,
    backgroundColor: style.backgroundColor || 'transparent',
    borderRadius: style.isPill ? '999px' : (style.isBadge && style.badgeShape === 'circle' ? '50%' : (style.isBadge ? '0' : '4px')),
    // Badge shape using clip-path
    clipPath: style.isBadge 
      ? (style.badgeShape === 'hexagon' 
          ? 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)'
          : (style.badgeShape === 'circle' ? 'circle(50% at 50% 50%)' : 'polygon(50% 0%, 61% 11%, 79% 9%, 83% 26%, 100% 34%, 93% 50%, 100% 66%, 83% 74%, 79% 91%, 61% 89%, 50% 100%, 39% 89%, 21% 91%, 17% 74%, 0% 66%, 7% 50%, 0% 34%, 17% 26%, 21% 9%, 39% 11%)'))
      : undefined,
    padding: style.isBadge ? '24px' : (style.isPill ? '8.5px 34.13px' : '0'),
    fontFamily: style.fontFamily || 'var(--font-sans)',
    textShadow: style.textShadow || undefined,
    pointerEvents: isPreview ? 'none' : 'auto',
    width: style.width === 'auto' || !style.width ? 'auto' : `${style.width}px`,
    aspectRatio: style.isBadge && style.width && style.width !== 'auto' ? '1 / 1' : undefined,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  if (isPreview) {
    return (
      <div style={{ position: 'absolute', left: `${position.x}px`, top: `${position.y}px`, zIndex: 2, ...textStyle, flexDirection: 'column' }}>
        {text ? text.split('\n').map((line, i) => (
          <div key={i} style={{ fontSize: i > 0 && style.subFontSize ? `${style.subFontSize}px` : 'inherit', width: '100%', textAlign: style.textAlign || 'center' }}>
            {line}
          </div>
        )) : "텍스트"}
      </div>
    );
  }

  return (
    <div
      ref={dragRef}
      style={{
        position: 'absolute',
        left: `${position.x}px`,
        top: `${position.y}px`,
        cursor: isDragging ? 'grabbing' : 'grab',
        padding: '0px',
        border: isActive ? '2px dashed var(--primary-color)' : '2px solid transparent',
        backgroundColor: isActive ? 'rgba(255,255,255,0.8)' : 'transparent',
        borderRadius: '4px',
        userSelect: isDragging ? 'none' : 'auto',
        minWidth: '20px',
        zIndex: isDragging ? 10 : (isActive ? 5 : 2),
        outline: 'none',
        pointerEvents: 'auto'
      }}
      onMouseDown={handleMouseDown}
      onDoubleClick={() => {
        if (onSelect) onSelect();
      }}
    >
      <div style={{ ...textStyle, flexDirection: 'column' }}>
        {text ? text.split('\n').map((line, i) => (
          <div key={i} style={{ fontSize: i > 0 && style.subFontSize ? `${style.subFontSize}px` : 'inherit', width: '100%', textAlign: style.textAlign || 'center' }}>
            {line}
          </div>
        )) : "텍스트"}
      </div>

      {isActive && onDelete && (
        <button 
           onClick={(e) => { e.stopPropagation(); onDelete(id); }}
           style={{ position: 'absolute', top: -10, right: -10, background: '#ff3333', color: 'white', borderRadius: '50%', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.2)', cursor: 'pointer', zIndex: 51 }}>
           ✕
        </button>
      )}
    </div>
  );
}

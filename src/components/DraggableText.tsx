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
          const rect = parent.getBoundingClientRect();
          let newX = e.clientX - rect.left - offsetRef.current.x;
          let newY = e.clientY - rect.top - offsetRef.current.y;
          
          newX = Math.max(0, Math.min(newX, rect.width - dragRef.current.offsetWidth));
          newY = Math.max(0, Math.min(newY, rect.height - dragRef.current.offsetHeight));
          
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
      const rect = dragRef.current.getBoundingClientRect();
      offsetRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    }
  };

  // Del / Backspace 로컬 처리는 제거 — 전역 리스너가 Delete 만 안전하게 처리한다.
  // (Backspace 로 실수 삭제되는 현상 방지)

  const resolvedLineHeight =
    style.lineHeight === undefined
      ? 1.2
      : style.lineHeight >= 4
        ? `${style.lineHeight}px`
        : style.lineHeight;

  const textStyle: React.CSSProperties = {
    fontSize: `${style.fontSize}px`, 
    whiteSpace: 'pre-wrap', 
    color: style.color, 
    fontWeight: style.fontWeight as React.CSSProperties['fontWeight'], 
    textAlign: style.textAlign as React.CSSProperties['textAlign'],
    letterSpacing: style.letterSpacing !== undefined ? `${style.letterSpacing}px` : undefined,
    lineHeight: resolvedLineHeight,
    backgroundColor: style.backgroundColor || 'transparent',
    borderRadius: style.isPill ? '999px' : '4px',
    // Figma 가이드 기준(상하 8.5, 좌 34.13, 우 34.13)
    //   글자가 길어지면 버튼 너비는 자동으로 따라 커짐 (width 고정 없음)
    padding: style.isPill ? '8.5px 34.13px' : '0',
    fontFamily: style.fontFamily || 'var(--font-sans)',
    textShadow: style.textShadow || undefined,
    pointerEvents: isPreview ? 'none' : 'auto',
    width: style.width === 'auto' || !style.width ? 'auto' : `${style.width}px`
  };

  if (isPreview) {
    return (
      <div style={{ position: 'absolute', left: `${position.x}px`, top: `${position.y}px`, zIndex: 2, ...textStyle }}>
        {text}
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
        padding: '0.5rem',
        border: isActive ? '2px dashed var(--primary-color)' : '1px solid transparent',
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
      <div style={textStyle}>
        {text || "텍스트"}
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

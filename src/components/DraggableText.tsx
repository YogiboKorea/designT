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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (isActive && onDelete) {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        onDelete(id);
      }
    }
  };

  const textStyle: React.CSSProperties = {
    fontSize: `${style.fontSize}px`, 
    whiteSpace: 'pre-wrap', 
    color: style.color, 
    fontWeight: style.fontWeight as React.CSSProperties['fontWeight'], 
    textAlign: style.textAlign as React.CSSProperties['textAlign'],
    letterSpacing: style.letterSpacing !== undefined ? `${style.letterSpacing}px` : undefined,
    lineHeight: style.lineHeight !== undefined ? style.lineHeight : 1.2,
    backgroundColor: style.backgroundColor || 'transparent',
    borderRadius: style.isPill ? '999px' : '4px',
    padding: style.isPill ? '10px 28px' : '0',
    fontFamily: 'var(--font-sans)',
    pointerEvents: isPreview ? 'none' : 'auto',
    width: style.width === 'auto' || !style.width ? 'auto' : `${style.width}px`
  };

  if (isPreview) {
    return (
      <div style={{ position: 'absolute', left: `${position.x}px`, top: `${position.y}px`, zIndex: 1, ...textStyle }}>
        {text}
      </div>
    );
  }

  return (
    <div
      ref={dragRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
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

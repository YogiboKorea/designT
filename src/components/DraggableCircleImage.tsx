'use client';
import React, { useEffect, useRef, useState } from 'react';
import { ImageTransform } from '../app/main-visual/types';

export interface CircleImageStyle {
  borderWidth: number;
  borderColor: string;
  shadowBlur: number;
  shadowColor?: string;
}

interface DraggableCircleImageProps {
  src: string;
  transform: ImageTransform;
  onTransformChange: (t: ImageTransform) => void;
  canvasWidth: number;
  canvasHeight: number;
  scale: number;
  isActive: boolean;
  onSelect: () => void;
  onDoubleClick?: () => void;
  isPreview?: boolean;
  style?: CircleImageStyle;
  zIndex?: number;
}

type DragMode = 'move' | 'resize-br' | 'resize-tl' | null;

// Type F 전용 — 원형 마스킹된 이미지에 텍스트/이미지처럼 드래그·리사이즈·더블클릭 인터랙션을 부여.
// DraggableImage 의 브러시·블러·마스크 로직은 사용하지 않으며, 단순 이동·리사이즈만 지원.
export default function DraggableCircleImage(props: DraggableCircleImageProps) {
  const {
    src,
    transform,
    onTransformChange,
    canvasWidth,
    canvasHeight,
    scale,
    isActive,
    onSelect,
    onDoubleClick,
    isPreview = false,
    style,
    zIndex = 2,
  } = props;

  const [mode, setMode] = useState<DragMode>(null);
  const startRef = useRef({ mouseX: 0, mouseY: 0, x: 0, y: 0, width: 0 });

  const aspect = Math.max(transform.aspect, 0.01);
  const height = transform.width / aspect;
  const borderW = style?.borderWidth ?? 0;
  const borderC = style?.borderColor ?? '#FFFFFF';
  const shadowBlur = style?.shadowBlur ?? 24;
  const shadowColor = style?.shadowColor ?? 'rgba(0,0,0,0.15)';

  useEffect(() => {
    if (!mode || isPreview) return;
    const handleMove = (e: MouseEvent) => {
      const dx = (e.clientX - startRef.current.mouseX) / Math.max(scale, 0.001);
      const dy = (e.clientY - startRef.current.mouseY) / Math.max(scale, 0.001);

      if (mode === 'move') {
        const w = transform.width;
        const h = w / aspect;
        const nx = Math.max(-w + 40, Math.min(canvasWidth - 40, startRef.current.x + dx));
        const ny = Math.max(-h + 40, Math.min(canvasHeight - 40, startRef.current.y + dy));
        onTransformChange({ ...transform, x: nx, y: ny });
        return;
      }
      if (mode === 'resize-br') {
        const newW = Math.max(80, startRef.current.width + dx);
        onTransformChange({ ...transform, width: newW });
        return;
      }
      if (mode === 'resize-tl') {
        const desiredW = startRef.current.width - dx;
        const newW = Math.max(80, desiredW);
        const actualDx = startRef.current.width - newW;
        onTransformChange({
          ...transform,
          x: startRef.current.x + actualDx,
          y: startRef.current.y + actualDx / aspect,
          width: newW,
        });
        return;
      }
    };
    const handleUp = () => setMode(null);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [mode, scale, transform, aspect, canvasWidth, canvasHeight, onTransformChange, isPreview]);

  const startDrag = (e: React.MouseEvent, m: Exclude<DragMode, null>) => {
    if (isPreview) return;
    e.preventDefault();
    e.stopPropagation();
    startRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      x: transform.x,
      y: transform.y,
      width: transform.width,
    };
    setMode(m);
    onSelect();
  };

  return (
    <div
      onMouseDown={(e) => startDrag(e, 'move')}
      onClick={(e) => { e.stopPropagation(); onSelect(); }}
      onDoubleClick={(e) => { e.stopPropagation(); onDoubleClick?.(); }}
      style={{
        position: 'absolute',
        left: transform.x,
        top: transform.y,
        width: transform.width,
        height: height,
        borderRadius: '50%',
        background: borderW > 0 ? borderC : 'transparent',
        overflow: 'hidden',
        zIndex: zIndex + (isActive ? 10 : 0),
        boxShadow: shadowBlur > 0 ? `0 4px ${shadowBlur}px ${shadowColor}` : 'none',
        border: borderW > 0 ? `${borderW}px solid ${borderC}` : 'none',
        boxSizing: 'border-box',
        cursor: isPreview ? 'default' : (mode === 'move' ? 'grabbing' : 'grab'),
        outline: isActive && !isPreview ? '2px solid #2563eb' : 'none',
        outlineOffset: 2,
        userSelect: 'none',
      }}
    >
      <img
        src={src}
        alt=""
        crossOrigin="anonymous"
        draggable={false}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: 'center',
          userSelect: 'none',
          pointerEvents: 'none',
        }}
      />
      {isActive && !isPreview && (
        <>
          <div
            onMouseDown={(e) => startDrag(e, 'resize-br')}
            style={{
              position: 'absolute',
              right: -10,
              bottom: -10,
              width: 18,
              height: 18,
              borderRadius: '50%',
              background: '#fff',
              border: '2px solid #2563eb',
              cursor: 'nwse-resize',
              zIndex: 100,
              boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
            }}
          />
          <div
            onMouseDown={(e) => startDrag(e, 'resize-tl')}
            style={{
              position: 'absolute',
              left: -10,
              top: -10,
              width: 18,
              height: 18,
              borderRadius: '50%',
              background: '#fff',
              border: '2px solid #2563eb',
              cursor: 'nwse-resize',
              zIndex: 100,
              boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
            }}
          />
        </>
      )}
    </div>
  );
}

'use client';
import React, { useLayoutEffect, useRef, useState } from 'react';
import DraggableText from './DraggableText';
import { TextItem } from '../app/builder/types';

interface MainVisualCanvasProps {
  width: number;
  height: number;
  bgImage: string;
  bgColor: string;
  texts: TextItem[];
  activeTextId: string | null;
  onSelectText: (id: string | null) => void;
  onUpdateText: (id: string, text: string, pos: { x: number; y: number }, style: any) => void;
  onDeleteText: (id: string) => void;
  captureId: string;
  isPreview?: boolean;
}

/**
 * 고정 픽셀 원본 캔버스 + 화면에서 scale로 축소 표시.
 * 배경 이미지는 object-fit: cover 로 캔버스 전체를 꽉 채움.
 * html2canvas 캡처 시에는 상위에서 transform을 해제한 후 캡처 → 원본 해상도로 출력.
 *
 * 날짜 바 / 이벤트 바로가기 버튼은 기본 텍스트 아이템으로 사전 배치되어
 * 드래그로 위치 조정 가능 (types.ts createEmptyMainVisualState 참고).
 */
export default function MainVisualCanvas(props: MainVisualCanvasProps) {
  const {
    width, height,
    bgImage, bgColor,
    texts, activeTextId,
    onSelectText, onUpdateText, onDeleteText,
    captureId, isPreview = false,
  } = props;

  const wrapperRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const update = () => {
      const el = wrapperRef.current;
      if (!el) return;
      const available = el.clientWidth - 4;
      const s = Math.min(1, available / width);
      setScale(s > 0 ? s : 1);
    };
    update();

    const ro = new ResizeObserver(update);
    if (wrapperRef.current) ro.observe(wrapperRef.current);
    window.addEventListener('resize', update);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', update);
    };
  }, [width]);

  const displayHeight = height * scale;

  return (
    <div
      ref={wrapperRef}
      style={{
        width: '100%',
        height: displayHeight,
        overflow: 'hidden',
        background: '#f0f1f3',
        border: '1px solid #e5e7eb',
        borderRadius: '12px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
        display: 'flex',
      }}
      onClick={() => onSelectText(null)}
    >
      <div
        id={captureId}
        style={{
          width: `${width}px`,
          height: `${height}px`,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          position: 'relative',
          background: bgColor || '#ffffff',
          overflow: 'hidden',
          flexShrink: 0,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 배경 이미지 */}
        {bgImage && (
          <img
            src={bgImage}
            alt="background"
            crossOrigin="anonymous"
            draggable={false}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'center',
              zIndex: 0,
              pointerEvents: 'none',
              userSelect: 'none',
            }}
          />
        )}

        {/* 드래그 가능한 텍스트 (타이틀·날짜·버튼 포함) */}
        {texts.map((t) => (
          <DraggableText
            key={t.id}
            item={t}
            isActive={activeTextId === t.id}
            onSelect={() => onSelectText(t.id)}
            onUpdate={onUpdateText}
            onDelete={onDeleteText}
            isPreview={isPreview}
          />
        ))}
      </div>
    </div>
  );
}

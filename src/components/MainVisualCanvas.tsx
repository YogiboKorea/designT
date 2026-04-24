'use client';
import React, { useLayoutEffect, useRef, useState } from 'react';
import DraggableText from './DraggableText';
import DraggableImage from './DraggableImage';
import { TextItem } from '../app/builder/types';
import {
  CanvasGradient,
  ImageTransform,
  gradientStopsToCss,
} from '../app/main-visual/types';

interface MainVisualCanvasProps {
  width: number;
  height: number;
  bgImage: string;
  bgColor: string;
  useGradient?: boolean;
  gradient?: CanvasGradient;

  /** 이미지 배치 모드. 'free' = 드래그/리사이즈, 'cover' = 꽉 채움 */
  imageMode?: 'cover' | 'free';
  imageTransform?: ImageTransform;
  onImageTransformChange?: (t: ImageTransform) => void;
  /** 이미지 선택 상태 (리사이즈 핸들 표시) */
  imageActive?: boolean;
  onSelectImage?: (active: boolean) => void;
  /** 블러 브러시 — 활성화 시 drag/resize 대신 마스크 페인팅 */
  brushMode?: boolean;
  brushSize?: number;
  brushErase?: boolean;
  /** 이미지 edge feather 방향 — 그라데이션과의 경계를 부드럽게 */
  edgeFeather?: 'none' | 'left' | 'top';

  texts: TextItem[];
  activeTextId: string | null;
  onSelectText: (id: string | null) => void;
  onUpdateText: (id: string, text: string, pos: { x: number; y: number }, style: any) => void;
  onDeleteText: (id: string) => void;
  captureId: string;
  isPreview?: boolean;
}

/**
 * 고정 픽셀 원본 캔버스 + 화면에서 scale 로 축소 표시.
 *
 * 배경 렌더 우선순위:
 *   1) bgColor              — 항상 바탕
 *   2) gradient (이미지 없을 때)
 *   3) bgImage
 *        · imageMode === 'cover'  → object-fit: cover 로 꽉 채움
 *        · imageMode === 'free'   → DraggableImage (원본 크기 + 드래그/리사이즈)
 */
export default function MainVisualCanvas(props: MainVisualCanvasProps) {
  const {
    width, height,
    bgImage, bgColor,
    useGradient, gradient,
    imageMode = 'free',
    imageTransform,
    onImageTransformChange,
    imageActive = false,
    onSelectImage,
    brushMode = false,
    brushSize = 40,
    brushErase = false,
    edgeFeather = 'none',
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
  const gradientCss = useGradient && gradient ? gradientStopsToCss(gradient) : '';
  const showFreeImage =
    !!bgImage && imageMode === 'free' && !!imageTransform && !!onImageTransformChange;
  const showCoverImage = !!bgImage && imageMode !== 'free';

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
      onClick={() => {
        onSelectText(null);
        onSelectImage?.(false);
      }}
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
        {/* 1) 이미지 — cover 모드 (가장 아래) */}
        {showCoverImage && (
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

        {/* 2) 이미지 — free 모드 (원본 크기 + 드래그/리사이즈) */}
        {showFreeImage && imageTransform && onImageTransformChange && (
          <DraggableImage
            src={bgImage}
            transform={imageTransform}
            onTransformChange={onImageTransformChange}
            canvasWidth={width}
            canvasHeight={height}
            scale={scale}
            isActive={imageActive}
            onSelect={() => onSelectImage?.(true)}
            isPreview={isPreview}
            brushMode={brushMode}
            brushSize={brushSize}
            brushErase={brushErase}
            tintColor={bgColor}
            edgeFeather={edgeFeather}
          />
        )}

        {/* 3) 그라데이션 오버레이 — 이미지 위에 항상 깔림
             한쪽은 선택색 진하게, 반대쪽은 투명 → 이미지가 있을 때는
             텍스트 영역만 베이지 톤으로 덮여 가독성 확보. */}
        {gradientCss && (
          <div
            aria-hidden
            style={{
              position: 'absolute',
              inset: 0,
              background: gradientCss,
              pointerEvents: 'none',
              zIndex: 1,
            }}
          />
        )}

        {/* 3) 드래그 가능한 텍스트 (타이틀·서브타이틀·설명·버튼 등) */}
        {texts.map((t) => (
          <DraggableText
            key={t.id}
            item={t}
            isActive={activeTextId === t.id}
            onSelect={() => {
              onSelectText(t.id);
              onSelectImage?.(false);
            }}
            onUpdate={onUpdateText}
            onDelete={onDeleteText}
            isPreview={isPreview}
          />
        ))}
      </div>
    </div>
  );
}

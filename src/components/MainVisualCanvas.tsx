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
  bgGraphicType?: 'A' | 'B' | 'C' | 'D' | 'E' | null;

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
  showLogo?: boolean;
  logoColor?: 'white' | 'color';
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
    bgGraphicType,
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
    showLogo = false, logoColor = 'white',
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
        {/* 0) 프리셋 백그라운드 그래픽 (가장 아래, bgColor 위) */}
        {bgGraphicType === 'A' && (
          <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
            {/* 큰 네이비 원형들 */}
            <circle cx="-100" cy="-50" r="500" fill="#0E2A68" opacity="0.6" />
            <circle cx="1700" cy="200" r="300" fill="#0E2A68" opacity="0.6" />
            <circle cx="1000" cy="800" r="350" fill="#0E2A68" opacity="0.6" />
            
            {/* 하단 화이트 라운드 웨이브 (핵심) */}
            <path d="M 0 550 C 500 650, 1200 450, 1920 580 L 1920 680 L 0 680 Z" fill="#FFFFFF" />
          </svg>
        )}
        {bgGraphicType === 'C' && (
          <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
            <rect x="0" y="0" width="800" height="680" fill="#F4F1ED" />
            <rect x="800" y="0" width="1120" height="680" fill="#EAE5DE" />
            <rect x="1400" y="100" width="300" height="400" fill="#D5CEC4" opacity="0.5" />
          </svg>
        )}
        {bgGraphicType === 'D' && (
          <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
            <path d="M 0 680 L 1920 680 L 1920 0 L 0 680" fill="#FFFFFF" opacity="0.1" />
            <rect x="1500" y="50" width="300" height="300" fill="#FFFFFF" opacity="0.3" />
            <rect x="1520" y="70" width="120" height="120" fill="#E0F2FE" opacity="0.5" />
            <rect x="1660" y="70" width="120" height="120" fill="#E0F2FE" opacity="0.5" />
            <rect x="1520" y="210" width="120" height="120" fill="#E0F2FE" opacity="0.5" />
            <rect x="1660" y="210" width="120" height="120" fill="#E0F2FE" opacity="0.5" />
          </svg>
        )}
        {bgGraphicType === 'E' && (
          <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
            <path d="M -100 300 Q 300 100 700 350 T 1500 200 T 2000 400 L 2000 680 L -100 680 Z" fill="#E4B869" opacity="0.2" />
            <path d="M -100 400 Q 400 600 800 300 T 1600 500 T 2000 300 L 2000 680 L -100 680 Z" fill="#0C2053" opacity="0.2" />
            <path d="M -100 500 Q 500 700 900 400 T 1700 600 T 2000 500 L 2000 680 L -100 680 Z" fill="#A0C4FF" opacity="0.3" />
          </svg>
        )}

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

        {/* 3-1) B타입 그래픽 오버레이 — 이미지와 그라데이션 위에 올라오며 텍스트(좌측) 영역만 꾸밈 */}
        {bgGraphicType === 'B' && (
          <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none' }}>
            {/* 텍스트 쪽에만 집중된 파스텔 블랍들 */}
            <circle cx="200" cy="150" r="350" fill="#FCE4EC" opacity="0.8" />
            <circle cx="500" cy="650" r="250" fill="#FFF9C4" opacity="0.6" />
            <circle cx="800" cy="-100" r="250" fill="#E3F2FD" opacity="0.6" />
            <circle cx="650" cy="300" r="80" fill="#FFCCBC" opacity="0.9" />
            <circle cx="100" cy="500" r="100" fill="#E8F5E9" opacity="0.8" />
            
            {/* 좌측에서 시작해 중간에서 사라지는 부드러운 웨이브 */}
            <path d="M 0 550 C 300 450, 700 650, 1000 700 L 0 700 Z" fill="#FFF0F5" opacity="0.9" />
          </svg>
        )}

        {/* 4) 로고 */}
        {showLogo && (
          <img
            src={logoColor === 'white' ? 'https://yogibo.kr/web/img/icon/logo3_off.png' : 'https://yogibo.kr/web/img/icon/logo3_on.png'}
            alt="Yogibo Logo"
            style={{
              position: 'absolute',
              top: '60px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '180px',
              height: 'auto',
              zIndex: 2,
              pointerEvents: 'none',
              userSelect: 'none',
            }}
          />
        )}

        {/* 5) 드래그 가능한 텍스트 (타이틀·서브타이틀·설명·버튼 등) */}
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

'use client';
import React, { useLayoutEffect, useRef, useState } from 'react';
import DraggableText from './DraggableText';
import DraggableImage from './DraggableImage';
import DraggableCircleImage from './DraggableCircleImage';
import { TextItem } from '../app/builder/types';
import { proxyImageUrl } from '../lib/proxy-image-url';
import {
  CanvasGradient,
  CircleImageStyle,
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
  bgGraphicType?: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | null;

  /** 이미지 배치 모드. 'free' = 드래그/리사이즈, 'cover' = 꽉 채움 */
  imageMode?: 'cover' | 'free';
  imageTransform?: ImageTransform;
  onImageTransformChange?: (t: ImageTransform) => void;
  /** 이미지 선택 상태 (리사이즈 핸들 표시) */
  imageActive?: boolean;
  onSelectImage?: (active: boolean) => void;

  // Type F 전용 — 제품 사진(우상단 작은 원)
  secondImage?: string;
  secondImageTransform?: ImageTransform;
  onSecondImageTransformChange?: (t: ImageTransform) => void;
  secondImageActive?: boolean;
  onSelectSecondImage?: (active: boolean) => void;
  // Type F 두 원의 디테일 스타일 + 더블클릭 핸들러
  modelCircleStyle?: CircleImageStyle;
  productCircleStyle?: CircleImageStyle;
  onDoubleClickModelCircle?: () => void;
  onDoubleClickProductCircle?: () => void;
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
    secondImage,
    secondImageTransform,
    onSecondImageTransformChange,
    secondImageActive = false,
    onSelectSecondImage,
    modelCircleStyle,
    productCircleStyle,
    onDoubleClickModelCircle,
    onDoubleClickProductCircle,
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

  // SVG 프리셋 그래픽은 1920×680 자사몰 원본을 기준으로 좌표가 작성되어 있음.
  // 캔버스 height 가 다르면 Y축에 한해 비례 스케일을 적용해 같은 디자인 의도를 유지.
  // (height=680 → scaleY=1 이라 자사몰은 픽셀-퍼펙트 동일)
  const BASE_HEIGHT = 680;
  const scaleY = height / BASE_HEIGHT;
  const sy = (v: number) => Math.round(v * scaleY);

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
            {/* 큰 원형들 (배경색에 맞게 살짝 밝아지도록 화이트 투명도 사용) */}
            <circle cx="-100" cy={sy(-50)} r="500" fill="#ffffff" opacity="0.03" />
            <circle cx="1700" cy={sy(200)} r="300" fill="#ffffff" opacity="0.03" />
            <circle cx="1000" cy={sy(800)} r="350" fill="#ffffff" opacity="0.03" />

            {/* 하단 화이트 라운드 웨이브 (핵심) */}
            <path d={`M 0 ${sy(550)} C 500 ${sy(650)}, 1200 ${sy(450)}, 1920 ${sy(580)} L 1920 ${height} L 0 ${height} Z`} fill="#FFFFFF" />
          </svg>
        )}
        {bgGraphicType === 'C' && (
          <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
            <rect x="0" y="0" width="800" height={height} fill="#F4F1ED" />
            <rect x="800" y="0" width="1120" height={height} fill="#EAE5DE" />
            <rect x="1400" y={sy(100)} width="300" height={sy(400)} fill="#D5CEC4" opacity="0.5" />
          </svg>
        )}
        {bgGraphicType === 'D' && (
          <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
            <path d={`M 0 ${height} L 1920 ${height} L 1920 0 L 0 ${height}`} fill="#FFFFFF" opacity="0.1" />
            <rect x="1500" y={sy(50)} width="300" height="300" fill="#FFFFFF" opacity="0.3" />
            <rect x="1520" y={sy(70)} width="120" height="120" fill="#E0F2FE" opacity="0.5" />
            <rect x="1660" y={sy(70)} width="120" height="120" fill="#E0F2FE" opacity="0.5" />
            <rect x="1520" y={sy(210)} width="120" height="120" fill="#E0F2FE" opacity="0.5" />
            <rect x="1660" y={sy(210)} width="120" height="120" fill="#E0F2FE" opacity="0.5" />
          </svg>
        )}
        {bgGraphicType === 'E' && (
          <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
            <path d={`M -100 ${sy(300)} Q 300 ${sy(100)} 700 ${sy(350)} T 1500 ${sy(200)} T 2000 ${sy(400)} L 2000 ${height} L -100 ${height} Z`} fill="#E4B869" opacity="0.2" />
            <path d={`M -100 ${sy(400)} Q 400 ${sy(600)} 800 ${sy(300)} T 1600 ${sy(500)} T 2000 ${sy(300)} L 2000 ${height} L -100 ${height} Z`} fill="#0C2053" opacity="0.2" />
            <path d={`M -100 ${sy(500)} Q 500 ${sy(700)} 900 ${sy(400)} T 1700 ${sy(600)} T 2000 ${sy(500)} L 2000 ${height} L -100 ${height} Z`} fill="#A0C4FF" opacity="0.3" />
          </svg>
        )}
        {bgGraphicType === 'F' && (() => {
          // 사선 슬라이스 — 캔버스 비율에 따라 크기 분기 (portrait 일 때 더 얇게).
          // 좌·우 모두 캔버스 바닥(height) 기준 상대 픽셀로 잡아 어떤 사이즈에서도 자연스럽게 유지.
          const isPortrait = height > width;
          const cutLeft = isPortrait ? height - 80 : height - 100;
          const cutRight = isPortrait ? height - 180 : height - 240;
          return (
          <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
            {/* 하단 사선 컷오프 — 캔버스 전체 폭에 걸쳐 흰색 슬라이스. 좌측은 얇고 우측은 두껍게 슬로프 업 */}
            <path d={`M 0 ${cutLeft} L ${width} ${cutRight} L ${width} ${height} L 0 ${height} Z`} fill="#FFFFFF" />
            {/* LUCKY 주변 타원 스트로크 데코 */}
            <ellipse cx={sy(360)} cy={sy(290)} rx="180" ry="55" fill="none" stroke="#FFFFFF" strokeWidth="2" opacity="0.45" transform={`rotate(-8 ${sy(360)} ${sy(290)})`} />
            {/* 별(★) 4-point sparkle */}
            <g fill="#FFFFFF" opacity="0.85">
              <path d={`M ${sy(640)} ${sy(120)} l 8 22 l 22 8 l -22 8 l -8 22 l -8 -22 l -22 -8 l 22 -8 z`} />
              <path d={`M ${sy(580)} ${sy(220)} l 5 14 l 14 5 l -14 5 l -5 14 l -5 -14 l -14 -5 l 14 -5 z`} />
              <path d={`M ${sy(100)} ${sy(300)} l 6 16 l 16 6 l -16 6 l -6 16 l -6 -16 l -16 -6 l 16 -6 z`} />
              <path d={`M ${sy(240)} ${sy(440)} l 5 14 l 14 5 l -14 5 l -5 14 l -5 -14 l -14 -5 l 14 -5 z`} />
            </g>
          </svg>
          );
        })()}

        {/* 1) 이미지 — cover 모드 (가장 아래) */}
        {showCoverImage && (
          <img
            src={proxyImageUrl(bgImage)}
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

        {/* 2) 이미지 — free 모드 (원본 크기 + 드래그/리사이즈)
             Type F 는 별도의 원형 마스킹 렌더(아래 2-1, 2-2)를 사용하므로 제외. */}
        {showFreeImage && bgGraphicType !== 'F' && imageTransform && onImageTransformChange && (
          <DraggableImage
            src={proxyImageUrl(bgImage)}
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

        {/* 2-1) Type F — 모델 이미지 (우측 큰 원). 텍스트처럼 클릭/드래그/리사이즈/더블클릭. */}
        {bgGraphicType === 'F' && bgImage && imageTransform && onImageTransformChange && (
          <DraggableCircleImage
            src={proxyImageUrl(bgImage)}
            transform={imageTransform}
            onTransformChange={onImageTransformChange}
            canvasWidth={width}
            canvasHeight={height}
            scale={scale}
            isActive={imageActive}
            onSelect={() => onSelectImage?.(true)}
            onDoubleClick={onDoubleClickModelCircle}
            isPreview={isPreview}
            style={modelCircleStyle ?? { borderWidth: 0, borderColor: '#FFFFFF', shadowBlur: 24, shadowColor: 'rgba(0,0,0,0.15)' }}
            zIndex={2}
          />
        )}

        {/* 2-2) Type F — 제품 이미지 (우상단 작은 원, 흰 테두리). 동일 인터랙션. */}
        {bgGraphicType === 'F' && secondImage && secondImageTransform && onSecondImageTransformChange && (
          <DraggableCircleImage
            src={proxyImageUrl(secondImage)}
            transform={secondImageTransform}
            onTransformChange={onSecondImageTransformChange}
            canvasWidth={width}
            canvasHeight={height}
            scale={scale}
            isActive={secondImageActive}
            onSelect={() => onSelectSecondImage?.(true)}
            onDoubleClick={onDoubleClickProductCircle}
            isPreview={isPreview}
            style={productCircleStyle ?? { borderWidth: 4, borderColor: '#FFFFFF', shadowBlur: 16, shadowColor: 'rgba(0,0,0,0.18)' }}
            zIndex={3}
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
            <circle cx="200" cy={sy(150)} r="350" fill="#FCE4EC" opacity="0.8" />
            <circle cx="500" cy={sy(650)} r="250" fill="#FFF9C4" opacity="0.6" />
            <circle cx="800" cy={sy(-100)} r="250" fill="#E3F2FD" opacity="0.6" />
            <circle cx="650" cy={sy(300)} r="80" fill="#FFCCBC" opacity="0.9" />
            <circle cx="100" cy={sy(500)} r="100" fill="#E8F5E9" opacity="0.8" />

            {/* 좌측에서 시작해 중간에서 사라지는 부드러운 웨이브 */}
            <path d={`M 0 ${sy(550)} C 300 ${sy(450)}, 700 ${sy(650)}, 1000 ${sy(700)} L 0 ${sy(700)} Z`} fill="#FFF0F5" opacity="0.9" />
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

'use client';
import React, { useEffect, useRef, useState } from 'react';
import { ImageTransform } from '../app/main-visual/types';

interface DraggableImageProps {
  src: string;
  transform: ImageTransform;
  onTransformChange: (t: ImageTransform) => void;
  canvasWidth: number;
  canvasHeight: number;
  scale: number;
  isActive?: boolean;
  onSelect?: () => void;
  isPreview?: boolean;
  /** 블러 브러시 모드 — drag/resize 대신 mask 에 페인팅.
   *  · 마우스 down/drag → 칠한 영역 생성
   *  · 그 영역만 blur 가 적용됨 (blur 강도는 transform.blur 슬라이더)
   */
  brushMode?: boolean;
  /** 브러시 반지름 (화면 px 단위, 편집 캔버스 기준) */
  brushSize?: number;
  /** 지우개 모드 — true 면 칠한 영역을 지움 */
  brushErase?: boolean;
  /** 블러 영역에 덧씌울 tint 색 (보통 bgColor).
   *  값이 있으면 블러된 이미지 위에 이 색이 ~45% 불투명도로 같은 마스크로 찍혀
   *  블러 부분이 배경 색과 같은 톤으로 물드는 효과. */
  tintColor?: string;
  /** 이미지 테두리에 CSS 마스크 페더 적용.
   *  'left' = 왼쪽 가장자리 ~20% 구간이 서서히 투명해져 배경 그라데이션과 자연스럽게 연결.
   *  'top'  = 상단 가장자리. 'none' = 페더 없음(기본). */
  edgeFeather?: 'none' | 'left' | 'top';
}

type DragMode = 'move' | 'resize-br' | 'resize-tl' | null;

/** 마스크 캔버스 고정 크기. 이미지 실제 크기와 무관 — CSS mask-size:100% 100% 로 스트레치. */
const MASK_W = 1024;
const MASK_H = 1024;

export default function DraggableImage(props: DraggableImageProps) {
  const {
    src,
    transform,
    onTransformChange,
    canvasWidth,
    canvasHeight,
    scale,
    isActive = false,
    onSelect,
    isPreview = false,
    brushMode = false,
    brushSize = 40,
    brushErase = false,
    tintColor,
    edgeFeather = 'none',
  } = props;

  const [mode, setMode] = useState<DragMode>(null);
  const startRef = useRef({ mouseX: 0, mouseY: 0, x: 0, y: 0, width: 0 });

  const aspect = Math.max(transform.aspect, 0.01);
  const height = transform.width / aspect;
  const blur = transform.blur ?? 0;

  // ──────────────────────────────────────────────
  //  마스크 캔버스 관리
  // ──────────────────────────────────────────────
  const maskCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [maskUrl, setMaskUrl] = useState<string>(transform.blurMask || '');
  const paintingRef = useRef(false);
  const lastPtRef = useRef<{ x: number; y: number } | null>(null);
  const urlTickRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // 외부에서 transform.blurMask 가 바뀌면 (업로드·undo·지우기) 캔버스 재구성
  useEffect(() => {
    if (!maskCanvasRef.current) {
      const c = document.createElement('canvas');
      c.width = MASK_W;
      c.height = MASK_H;
      maskCanvasRef.current = c;
    }
    const canvas = maskCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, MASK_W, MASK_H);
    if (transform.blurMask) {
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, MASK_W, MASK_H);
        ctx.drawImage(img, 0, 0, MASK_W, MASK_H);
        setMaskUrl(transform.blurMask || '');
      };
      img.src = transform.blurMask;
    } else {
      setMaskUrl('');
    }
  }, [transform.blurMask]);

  // 캔버스 → dataURL 갱신을 RAF 로 throttle
  const scheduleUrlFlush = () => {
    if (urlTickRef.current !== null) return;
    urlTickRef.current = requestAnimationFrame(() => {
      urlTickRef.current = null;
      const canvas = maskCanvasRef.current;
      if (!canvas) return;
      setMaskUrl(canvas.toDataURL('image/png'));
    });
  };

  // ──────────────────────────────────────────────
  //  브러시 페인팅
  // ──────────────────────────────────────────────
  const paintAt = (clientX: number, clientY: number) => {
    const el = containerRef.current;
    const canvas = maskCanvasRef.current;
    if (!el || !canvas) return;
    const rect = el.getBoundingClientRect();
    const nx = (clientX - rect.left) / rect.width;
    const ny = (clientY - rect.top) / rect.height;
    const x = nx * MASK_W;
    const y = ny * MASK_H;
    // 화면 px 기준 브러시 크기를 마스크 좌표로 환산
    const r = (brushSize / Math.max(rect.width, 1)) * MASK_W;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.globalCompositeOperation = brushErase ? 'destination-out' : 'source-over';
    ctx.fillStyle = 'rgba(255,255,255,1)';
    ctx.strokeStyle = 'rgba(255,255,255,1)';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = r * 2;

    if (lastPtRef.current) {
      ctx.beginPath();
      ctx.moveTo(lastPtRef.current.x, lastPtRef.current.y);
      ctx.lineTo(x, y);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over'; // 복원
    lastPtRef.current = { x, y };
    scheduleUrlFlush();
  };

  useEffect(() => {
    if (!brushMode || isPreview) return;

    const onMove = (e: MouseEvent) => {
      if (!paintingRef.current) return;
      paintAt(e.clientX, e.clientY);
    };
    const onUp = () => {
      if (!paintingRef.current) return;
      paintingRef.current = false;
      lastPtRef.current = null;
      // 최종 dataURL 을 transform 에 기록 (Undo 스택에 한 stroke = 한 entry)
      const canvas = maskCanvasRef.current;
      if (canvas) {
        const url = canvas.toDataURL('image/png');
        onTransformChange({ ...transform, blurMask: url });
      }
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    // brushMode/brushErase 변경 시 리스너 재등록. 그 외 transform/brushSize 변동은 painting 중에만 반영돼도 OK.
  }, [brushMode, brushErase, isPreview, transform, brushSize, onTransformChange]);

  const startPaint = (e: React.MouseEvent) => {
    if (!brushMode || isPreview) return;
    e.preventDefault();
    e.stopPropagation();
    paintingRef.current = true;
    lastPtRef.current = null;
    onSelect?.();
    paintAt(e.clientX, e.clientY);
  };

  // ──────────────────────────────────────────────
  //  드래그(이동) / 리사이즈 — 브러시 모드 아닐 때만
  // ──────────────────────────────────────────────
  useEffect(() => {
    if (!mode || isPreview || brushMode) return;

    const handleMove = (e: MouseEvent) => {
      const dx = (e.clientX - startRef.current.mouseX) / Math.max(scale, 0.001);
      const dy = (e.clientY - startRef.current.mouseY) / Math.max(scale, 0.001);

      if (mode === 'move') {
        const w = transform.width;
        const h = w / aspect;
        const nx = clamp(startRef.current.x + dx, -w + 40, canvasWidth - 40);
        const ny = clamp(startRef.current.y + dy, -h + 40, canvasHeight - 40);
        onTransformChange({ ...transform, x: nx, y: ny });
        return;
      }
      if (mode === 'resize-br') {
        const newW = Math.max(40, startRef.current.width + dx);
        onTransformChange({ ...transform, width: newW });
        return;
      }
      if (mode === 'resize-tl') {
        const desiredW = startRef.current.width - dx;
        const newW = Math.max(40, desiredW);
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
  }, [mode, scale, transform, aspect, canvasWidth, canvasHeight, onTransformChange, isPreview, brushMode]);

  const startDrag = (e: React.MouseEvent, m: Exclude<DragMode, null>) => {
    if (isPreview || brushMode) return;
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
    onSelect?.();
  };

  // ──────────────────────────────────────────────
  //  렌더
  // ──────────────────────────────────────────────

  const imgBase: React.CSSProperties = {
    width: '100%',
    height: '100%',
    display: 'block',
    userSelect: 'none',
    pointerEvents: 'none',
  };

  // edgeFeather — 이미지 가장자리를 서서히 투명으로 (배경 그라데이션과 이음새 숨김)
  //   left  : 왼쪽 0%~20% 구간에서 불투명도 0→1, 20% 이후 완전 불투명
  //   top   : 상단 0%~20% 구간에서 0→1
  const featherMaskCss: string | undefined =
    edgeFeather === 'left'
      ? 'linear-gradient(to right, transparent 0%, black 20%)'
      : edgeFeather === 'top'
        ? 'linear-gradient(to bottom, transparent 0%, black 20%)'
        : undefined;

  const featherStyle: React.CSSProperties = featherMaskCss
    ? {
        WebkitMaskImage: featherMaskCss,
        maskImage: featherMaskCss,
      }
    : {};

  // 블러 브러시 마스크 CSS — 있으면 칠한 영역만 보임, 없으면 전체 보임(구 동작)
  const maskStyle: React.CSSProperties = maskUrl
    ? {
        WebkitMaskImage: `url(${maskUrl})`,
        maskImage: `url(${maskUrl})`,
        WebkitMaskSize: '100% 100%',
        maskSize: '100% 100%',
        WebkitMaskRepeat: 'no-repeat',
        maskRepeat: 'no-repeat',
      }
    : {};

  // 블러 레이어 — 블러된 이미지 + (선택적으로) tintColor 오버레이
  // tintColor 가 있으면 같은 마스크로 bgColor 45% 를 덧씌워서
  // 블러된 영역이 배경 색과 비슷한 톤으로 물듦.
  const blurLayer = blur > 0 && (
    <>
      <img
        src={src}
        alt=""
        crossOrigin="anonymous"
        draggable={false}
        style={{
          ...imgBase,
          position: 'absolute',
          inset: 0,
          filter: `blur(${blur}px)`,
          ...maskStyle,
        }}
      />
      {tintColor && (
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            background: tintColor,
            opacity: 0.45,
            pointerEvents: 'none',
            ...maskStyle,
          }}
        />
      )}
    </>
  );

  // 캡처/미리보기 모드 — 테두리·핸들 없이, 이미지 레이어만
  if (isPreview) {
    return (
      <div
        style={{
          position: 'absolute',
          left: `${transform.x}px`,
          top: `${transform.y}px`,
          width: `${transform.width}px`,
          height: `${height}px`,
          zIndex: 0,
          pointerEvents: 'none',
          ...featherStyle,
        }}
      >
        <img src={src} alt="" crossOrigin="anonymous" draggable={false} style={imgBase} />
        {blurLayer}
      </div>
    );
  }

  const handleStyle = (pos: 'tl' | 'br'): React.CSSProperties => ({
    position: 'absolute',
    width: 16,
    height: 16,
    background: '#2563eb',
    border: '2px solid #fff',
    borderRadius: 4,
    cursor: 'nwse-resize',
    boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
    zIndex: 20,
    ...(pos === 'tl' ? { left: -8, top: -8 } : { right: -8, bottom: -8 }),
  });

  return (
    <div
      ref={containerRef}
      onMouseDown={(e) => (brushMode ? startPaint(e) : startDrag(e, 'move'))}
      onClick={(e) => {
        e.stopPropagation();
        onSelect?.();
      }}
      style={{
        position: 'absolute',
        left: `${transform.x}px`,
        top: `${transform.y}px`,
        width: `${transform.width}px`,
        height: `${height}px`,
        zIndex: 0,
        cursor: brushMode
          ? (brushErase ? 'cell' : 'crosshair')
          : (mode === 'move' ? 'grabbing' : 'grab'),
        outline: isActive
          ? (brushMode ? '2px solid #ec4899' : '2px dashed #2563eb')
          : '1px dashed rgba(37,99,235,0.35)',
        outlineOffset: '1px',
      }}
    >
      {/* 이미지 레이어 wrapper — feather mask 는 여기에만 적용.
          바깥 div 의 outline / 핸들은 feather 에 영향받지 않도록 분리. */}
      <div style={{ position: 'absolute', inset: 0, ...featherStyle }}>
        {/* 원본 (선명, 항상 최하단) */}
        <img src={src} alt="background" crossOrigin="anonymous" draggable={false} style={imgBase} />

        {/* 블러 레이어 (마스크 있으면 칠한 영역, 없으면 전체) */}
        {blurLayer}
      </div>

      {isActive && !brushMode && (
        <>
          <div onMouseDown={(e) => startDrag(e, 'resize-tl')} style={handleStyle('tl')} aria-label="좌상단 리사이즈" />
          <div onMouseDown={(e) => startDrag(e, 'resize-br')} style={handleStyle('br')} aria-label="우하단 리사이즈" />
          <div
            style={{
              position: 'absolute',
              left: 22,
              top: 4,
              background: 'rgba(37,99,235,0.92)',
              color: '#fff',
              fontSize: 11,
              padding: '2px 6px',
              borderRadius: 4,
              pointerEvents: 'none',
              fontFamily: 'var(--font-sans)',
              whiteSpace: 'nowrap',
              zIndex: 20,
            }}
          >
            {Math.round(transform.width)} × {Math.round(height)} px
          </div>
        </>
      )}

      {isActive && brushMode && (
        <div
          style={{
            position: 'absolute',
            top: 4,
            left: 4,
            background: 'rgba(236, 72, 153, 0.95)',
            color: '#fff',
            fontSize: 11,
            padding: '3px 8px',
            borderRadius: 4,
            pointerEvents: 'none',
            fontFamily: 'var(--font-sans)',
            whiteSpace: 'nowrap',
            zIndex: 20,
          }}
        >
          🖌️ {brushErase ? '지우개' : '블러 브러시'} · 크기 {brushSize}px · 드래그로 칠하세요
        </div>
      )}
    </div>
  );
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

'use client';
import React, { useRef, useState } from 'react';
import { Button, Input, Segmented, Space } from 'antd';
import type { PopupImageRegion } from './event-blocks-shared';

interface Props {
  src: string;
  regions: PopupImageRegion[];
  onChange: (regions: PopupImageRegion[]) => void;
}

/**
 * 팝업 이미지 위에 드래그로 영역을 그려 '닫기'/'링크' 액션을 지정하는 에디터.
 * 메인 이미지 영역 편집기와 동일한 비율(ratio) 좌표계 사용.
 */
export default function PopupImageRegionEditor({ src, regions, onChange }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
  const [cur, setCur] = useState<{ x: number; y: number } | null>(null);

  const getPos = (e: React.MouseEvent) => {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: Math.max(0, Math.min(e.clientX - rect.left, rect.width)),
      y: Math.max(0, Math.min(e.clientY - rect.top, rect.height)),
    };
  };

  const onDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-region-overlay]')) return;
    setDrag(getPos(e));
    setCur(getPos(e));
  };
  const onMove = (e: React.MouseEvent) => {
    if (!drag) return;
    setCur(getPos(e));
  };
  const onUp = () => {
    if (!drag || !cur) { setDrag(null); setCur(null); return; }
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect) { setDrag(null); setCur(null); return; }
    const x = Math.min(drag.x, cur.x), y = Math.min(drag.y, cur.y);
    const w = Math.abs(cur.x - drag.x), h = Math.abs(cur.y - drag.y);
    setDrag(null); setCur(null);
    if (w < 6 || h < 6) return; // 너무 작으면 무시
    const next: PopupImageRegion = {
      xRatio: x / rect.width,
      yRatio: y / rect.height,
      wRatio: w / rect.width,
      hRatio: h / rect.height,
      action: 'link',
      href: '',
    };
    onChange([...(regions || []), next]);
  };

  const updateRegion = (i: number, patch: Partial<PopupImageRegion>) => {
    onChange(regions.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  };
  const removeRegion = (i: number) => {
    onChange(regions.filter((_, idx) => idx !== i));
  };

  // 드래그 미리보기 박스
  let previewBox: React.CSSProperties | null = null;
  if (drag && cur) {
    previewBox = {
      position: 'absolute',
      left: Math.min(drag.x, cur.x),
      top: Math.min(drag.y, cur.y),
      width: Math.abs(cur.x - drag.x),
      height: Math.abs(cur.y - drag.y),
      border: '2px dashed #2563eb',
      background: 'rgba(37,99,235,0.15)',
      pointerEvents: 'none',
    };
  }

  return (
    <div>
      <div style={{ fontSize: 12, color: '#888', marginBottom: 6 }}>
        이미지 위에서 드래그하여 영역을 그리세요. 각 영역을 닫기 또는 링크로 지정할 수 있습니다.
      </div>
      <div
        ref={wrapRef}
        onMouseDown={onDown}
        onMouseMove={onMove}
        onMouseUp={onUp}
        onMouseLeave={onUp}
        style={{ position: 'relative', display: 'inline-block', maxWidth: '100%', cursor: 'crosshair', userSelect: 'none' }}
      >
        <img src={src} alt="팝업 이미지" style={{ maxWidth: '100%', display: 'block', borderRadius: 4 }} draggable={false} />
        {(regions || []).map((r, i) => (
          <div
            key={i}
            data-region-overlay
            style={{
              position: 'absolute',
              left: `${r.xRatio * 100}%`,
              top: `${r.yRatio * 100}%`,
              width: `${r.wRatio * 100}%`,
              height: `${r.hRatio * 100}%`,
              border: `2px solid ${r.action === 'close' ? '#ef4444' : '#2563eb'}`,
              background: r.action === 'close' ? 'rgba(239,68,68,0.18)' : 'rgba(37,99,235,0.18)',
              boxSizing: 'border-box',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 11,
              fontWeight: 700,
              color: r.action === 'close' ? '#b91c1c' : '#1d4ed8',
            }}
          >
            {r.action === 'close' ? '닫기' : '링크'}
          </div>
        ))}
        {previewBox && <div style={previewBox} />}
      </div>

      {/* 영역 목록 */}
      <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {(regions || []).map((r, i) => (
          <Space key={i} size="small" style={{ alignItems: 'center' }} wrap>
            <span style={{ fontSize: 12, color: '#888', width: 28 }}>#{i + 1}</span>
            <Segmented
              size="small"
              options={[
                { label: '닫기', value: 'close' },
                { label: '링크', value: 'link' },
              ]}
              value={r.action}
              onChange={(v) => updateRegion(i, { action: v as 'close' | 'link' })}
            />
            {r.action === 'link' && (
              <Input
                size="small"
                placeholder="이동할 URL"
                value={r.href || ''}
                onChange={(e) => updateRegion(i, { href: e.target.value })}
                style={{ width: 240 }}
              />
            )}
            <Button size="small" danger onClick={() => removeRegion(i)}>삭제</Button>
          </Space>
        ))}
        {(!regions || regions.length === 0) && (
          <div style={{ fontSize: 12, color: '#aaa' }}>아직 영역이 없습니다. 이미지 위에서 드래그하세요.</div>
        )}
      </div>
    </div>
  );
}

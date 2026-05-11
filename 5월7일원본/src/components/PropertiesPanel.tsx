'use client';
import React, { useEffect, useRef, useState } from 'react';
import { SectionData, TextItem, CouponItem, ProductItem, StickerItem } from '../app/builder/types';
import { MAIN_VISUAL_TEMPLATES, getTemplateById } from '../data/main-visual-templates';
import { COUPON_TEMPLATES, getCouponTemplateById } from '../data/coupon-templates';
import { PRODUCT_TEMPLATES, getProductTemplateById } from '../data/product-templates';
import { STICKER_LIBRARY, STICKER_CATEGORIES, StickerCategory, instantiateSticker } from '../data/sticker-library';
import PromptBuilderLink from './PromptBuilderLink';

interface PropertiesPanelProps {
  activeSection: SectionData | null;
  onUpdate: (updated: SectionData) => void;
  activeTextId?: string | null;
  onSelectText?: (id: string | null) => void;
  activeItemId?: string | null;
  onSelectItem?: (id: string | null) => void;
}

function FileUploader({ imageUrl, onUpload, onClear, label }: { imageUrl?: string, onUpload: (url: string) => void, onClear?: () => void, label?: string }) {
  const inputRef = useRef<HTMLInputElement>(null);

  const processFile = (file: File) => {
    if (file && file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      onUpload(url);
    }
  };

  return (
    <div className="field">
      {label && <label>{label}</label>}
      <div className="img-preview" onClick={() => inputRef.current?.click()}>
        {imageUrl ? <img src={imageUrl} alt="preview" /> : '이미지 없음'}
      </div>
      <div className="img-actions">
        <button onClick={() => inputRef.current?.click()}>{imageUrl ? '변경' : '업로드'}</button>
        {imageUrl && onClear && <button className="danger" onClick={onClear}>삭제</button>}
      </div>
      <input type="file" accept="image/*" style={{ display: 'none' }} ref={inputRef} onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0])} />
    </div>
  );
}

export default function PropertiesPanel({ activeSection, onUpdate, activeTextId, onSelectText, activeItemId, onSelectItem }: PropertiesPanelProps) {
  const setActiveTextId = onSelectText || (() => {});
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // ─────────────────────────────────────────────────────────────────
  //  🎨 템플릿 시스템 (메인 비주얼 전용)
  //     · MAIN_VISUAL_TEMPLATES 에서 디자인 프리셋을 골라 한 번에 적용
  //     · 텍스트/스티커는 고정, MD 는 변수(할인율 등) 만 수정 가능
  // ─────────────────────────────────────────────────────────────────

  /** 템플릿을 메인 비주얼 섹션에 적용 — 텍스트/스티커/변수 한꺼번에 세팅 */
  const handleApplyTemplate = (
    data: Extract<SectionData, { type: 'main' }>,
    templateId: string,
  ) => {
    const template = getTemplateById(templateId);
    if (!template) return;

    // 매 적용마다 ID 를 새로 생성 (템플릿 갈아탈 때 키 충돌 방지)
    const stamp = Date.now().toString();
    const newTexts: TextItem[] = template.texts.map((t, i) => ({
      ...t,
      id: `${stamp}-t${i}`,
    }));
    const newStickers: StickerItem[] = template.stickers.map((s, i) => ({
      ...s,
      id: `${stamp}-s${i}`,
    }));

    const newVars: Record<string, string | number> = {};
    template.variables.forEach((v) => {
      newVars[v.key] = v.defaultValue;
    });

    onUpdate({
      ...data,
      templateId,
      texts: newTexts,
      stickers: newStickers,
      templateVars: newVars,
    });
  };

  /** 템플릿 변수 값 변경 (예: 할인율 입력) */
  const handleUpdateTemplateVar = (
    data: Extract<SectionData, { type: 'main' }>,
    key: string,
    value: string | number,
  ) => {
    onUpdate({
      ...data,
      templateVars: { ...(data.templateVars ?? {}), [key]: value },
    });
  };

  /** 템플릿 해제 — 빈 메인 비주얼로 돌아감 */
  const handleClearTemplate = (data: Extract<SectionData, { type: 'main' }>) => {
    onUpdate({
      ...data,
      templateId: undefined,
      texts: [],
      stickers: [],
      templateVars: {},
    });
  };

  // ─────────────────────────────────────────────────────────────────
  //  🎨 쿠폰 템플릿 시스템
  //     · COUPON_TEMPLATES 에서 프리셋을 골라 한 번에 적용
  //     · 디자인 속성(색상·shape·border·배경)은 잠금
  //     · MD 는 헤더 텍스트와 쿠폰의 라벨/할인내역/링크만 수정
  // ─────────────────────────────────────────────────────────────────

  const handleApplyCouponTemplate = (
    data: Extract<SectionData, { type: 'coupon' }>,
    templateId: string,
  ) => {
    const template = getCouponTemplateById(templateId);
    if (!template) return;
    const stamp = Date.now().toString();
    const newTexts: TextItem[] = template.texts.map((t, i) => ({
      ...t,
      id: `${stamp}-t${i}`,
      style: { ...t.style },
      position: { ...t.position },
    }));
    const newCoupons: CouponItem[] = template.coupons.map((c, i) => ({
      ...c,
      id: `${stamp}-c${i}`,
    }));
    onUpdate({
      ...data,
      templateId,
      bgColor: template.bgColor,
      bgGradient: template.bgGradient,
      texts: newTexts,
      coupons: newCoupons,
    });
  };

  const handleClearCouponTemplate = (data: Extract<SectionData, { type: 'coupon' }>) => {
    onUpdate({
      ...data,
      templateId: undefined,
      bgColor: '#ffffff',
      bgGradient: undefined,
      texts: [],
      coupons: [],
    });
  };

  // ─────────────────────────────────────────────────────────────────
  //  🎨 상품 템플릿 시스템
  // ─────────────────────────────────────────────────────────────────

  const handleApplyProductTemplate = (
    data: Extract<SectionData, { type: 'product' }>,
    templateId: string,
  ) => {
    const template = getProductTemplateById(templateId);
    if (!template) return;
    const stamp = Date.now().toString();
    const newTexts: TextItem[] = template.texts.map((t, i) => ({
      ...t,
      id: `${stamp}-t${i}`,
      style: { ...t.style },
      position: { ...t.position },
    }));
    const newProducts: ProductItem[] = template.products.map((p, i) => ({
      ...p,
      id: `${stamp}-p${i}`,
    }));
    onUpdate({
      ...data,
      templateId,
      layout: template.layout,
      columns: template.columns,
      bgColor: template.bgColor,
      bgGradient: template.bgGradient,
      paddingTop: template.paddingTop,
      paddingBottom: template.paddingBottom,
      texts: newTexts,
      products: newProducts,
    });
  };

  const handleClearProductTemplate = (data: Extract<SectionData, { type: 'product' }>) => {
    onUpdate({
      ...data,
      templateId: undefined,
      bgColor: undefined,
      bgGradient: undefined,
      texts: [],
      products: [],
    });
  };

  // ─────────────────────────────────────────────────────────────────
  //  🎨 스티커 라이브러리 — 자유롭게 추가/삭제
  // ─────────────────────────────────────────────────────────────────
  const [stickerLibraryOpen, setStickerLibraryOpen] = useState(false);
  const [stickerCategory, setStickerCategory] = useState<StickerCategory>('discount');

  /** 라이브러리에서 스티커를 가져와 활성 메인 비주얼에 추가 */
  const handleAddSticker = (
    data: Extract<SectionData, { type: 'main' }>,
    libraryId: string,
  ) => {
    const newSticker = instantiateSticker(libraryId);
    if (!newSticker) return;
    // 캔버스 중앙쯤에 위치 (캔버스 가로 800 기준 320~340)
    newSticker.position = {
      x: 340 + Math.random() * 40 - 20,
      y: 200 + Math.random() * 40 - 20,
    };
    onUpdate({
      ...data,
      stickers: [...(data.stickers ?? []), newSticker],
    });
  };

  /** 스티커 삭제 */
  const handleDeleteSticker = (
    data: Extract<SectionData, { type: 'main' }>,
    stickerId: string,
  ) => {
    onUpdate({
      ...data,
      stickers: (data.stickers ?? []).filter((s) => s.id !== stickerId),
    });
  };

  /** 스티커 라벨 (UI 목록 표시용) */
  const getStickerLabel = (s: StickerItem): string => {
    if (s.type === 'emoji') return `이모지 ${s.content ?? ''}`;
    if (s.type === 'discount') {
      const v = s.discountStyle?.valueTemplate ?? '';
      return `할인뱃지 ${v}`;
    }
    if (s.type === 'svg') return 'SVG 그래픽';
    return '스티커';
  };

  /* ═════════════════════════════════════════════════════════════════
   * 🪄 AI 자동 디자인 (Gemini Vision) — 현재 비활성화
   *    템플릿 시스템 도입으로 보류. 코드는 보존하되 호출처 없음.
   *    필요 시 아래 블록의 주석을 풀고 renderMainVisualProps 의
   *    "✨ AI 자동 디자인" 섹션 주석도 함께 풀면 복원 가능.
   *
   *    이유:
   *      - 503 (서버 과부하) 빈번 → 운영 안정성 부족
   *      - 결과가 매번 달라 일관성 ↓
   *      - 템플릿 방식이 MD 작업 흐름에 더 적합
   * ═════════════════════════════════════════════════════════════════
   *
  const [aiStatus, setAiStatus] = useState<string>('');
  const BUILDER_CANVAS_WIDTH = 800;

  const probeImage = async (
    url: string,
  ): Promise<{ base64: string; mediaType: string; width: number; height: number }> => {
    const res = await fetch(url);
    const blob = await res.blob();
    const mediaType = blob.type || 'image/png';
    const base64 = await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve((r.result as string).split(',')[1] ?? '');
      r.onerror = () => reject(new Error('이미지 base64 변환 실패'));
      r.readAsDataURL(blob);
    });
    const dim = await new Promise<{ width: number; height: number }>((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => resolve({ width: BUILDER_CANVAS_WIDTH, height: 400 });
      img.src = url;
    });
    return { base64, mediaType, ...dim };
  };

  const handleAIAutoDesignMain = async (
    data: Extract<SectionData, { type: 'main' }>,
  ) => {
    if (!data.bgImage) {
      alert('먼저 배경 이미지를 업로드해주세요.');
      return;
    }
    setAiStatus('🪄 AI 분석 중… (서버 상태에 따라 5~30초)');
    try {
      const { base64, mediaType, width: natW, height: natH } = await probeImage(data.bgImage);
      const aspect = natH / Math.max(natW, 1);
      const canvasW = BUILDER_CANVAS_WIDTH;
      const canvasH = Math.round(canvasW * aspect);
      const baseId = Date.now().toString();
      const baseTexts: TextItem[] = data.texts.length > 0
        ? data.texts
        : [
            { id: baseId + 't1', text: 'EVENT TITLE',  position: { x: 50, y: 50 },  style: { color: '#252525', fontSize: 48, fontWeight: 800 } },
            { id: baseId + 't2', text: '서브 타이틀',     position: { x: 50, y: 120 }, style: { color: '#252525', fontSize: 24, fontWeight: 600 } },
            { id: baseId + 't3', text: '간단 설명 텍스트', position: { x: 50, y: 170 }, style: { color: '#252525', fontSize: 16, fontWeight: 400 } },
            { id: baseId + 't4', text: '자세히 보기 →',   position: { x: 50, y: 220 }, style: { color: '#FFFFFF', fontSize: 18, fontWeight: 600, backgroundColor: '#45B3C2', isPill: true } },
          ];
      const res = await fetch('/api/ai-layout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64, mediaType, device: 'web',
          canvas: { width: canvasW, height: canvasH },
          textCount: baseTexts.length,
        }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.message || 'AI 분석 실패');
      const layout = json.layout;
      const newTexts: TextItem[] = baseTexts.map((t, idx) => {
        const slot = layout.textSlots[idx] ?? layout.textSlots[layout.textSlots.length - 1];
        if (!slot) return t;
        return {
          ...t,
          position: { x: slot.x, y: slot.y },
          style: {
            ...t.style,
            color: t.style.isPill ? t.style.color : slot.color,
            fontSize: slot.fontSize, fontWeight: slot.fontWeight,
            textAlign: slot.textAlign, width: slot.width,
            letterSpacing: -slot.fontSize * 0.02,
          },
        };
      });
      onUpdate({ ...data, texts: newTexts });
      setAiStatus('✅ AI 자동 디자인 적용 완료');
      setTimeout(() => setAiStatus(''), 2500);
    } catch (err) {
      console.error('AI 자동 디자인 실패', err);
      setAiStatus('❌ ' + ((err as Error)?.message ?? '알 수 없는 오류'));
      setTimeout(() => setAiStatus(''), 6000);
    }
  };
   *
   * ═════════════════════════════════════════════════════════════════
   */
  // ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (activeItemId && itemRefs.current[activeItemId]) {
      itemRefs.current[activeItemId]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [activeItemId]);

  if (!activeSection) {
    return (
      <aside className="props">
        <div className="props-header"><h2>속성 패널</h2></div>
        <div className="empty-msg">왼쪽 도구 목록에서 영역을 추가하거나<br/>화면 중앙의 요소를 선택하면 편집이 가능합니다.</div>
      </aside>
    );
  }

  const renderTextProps = (t: TextItem, data: SectionData) => {
    const setProp = (k: keyof TextItem['style'] | 'text', val: any) => {
      const updatedTexts = data.texts.map(x => {
        if (x.id !== t.id) return x;
        if (k === 'text') return { ...x, text: val };
        return { ...x, style: { ...x.style, [k]: val } };
      });
      onUpdate({ ...data, texts: updatedTexts } as SectionData);
    };

    return (
      <div style={{ padding: '0 10px' }}>
        <button className="btn-primary" onClick={() => { if(onSelectText) onSelectText(null); }} style={{ background: '#e5e7eb', color: '#333', fontSize: '13px', padding: '8px', marginBottom: '20px', width: '100%', borderRadius: '8px' }}>← 이전 도구 목록으로</button>
        
        <div style={{ marginBottom: '20px' }}>
          <textarea 
            value={t.text} 
            onChange={e => setProp('text', e.target.value)} 
            style={{ width: '100%', minHeight: '60px', padding: '10px', borderRadius: '6px', border: '1px solid #e5e7eb', fontSize: '14px', fontFamily: 'var(--font-sans)', outline: 'none' }}
            placeholder="텍스트 내용을 입력하세요..."
          />
        </div>

        <div className="editor-title">서식 (PRETENDARD)</div>
        
        <div className="slider-container">
          <div className="slider-label">글자 크기: {t.style.fontSize}px</div>
          <input type="range" min="10" max="150" value={t.style.fontSize} onChange={e => setProp('fontSize', parseInt(e.target.value))} className="custom-slider" />
        </div>

        <div className="weight-label">굵기</div>
        <div className="weight-grid">
          {[100, 200, 300, 400, 500, 600, 700, 800, 900].map(w => (
            <button key={w} className={`weight-btn ${String(t.style.fontWeight) === String(w) ? 'active' : ''}`} onClick={() => setProp('fontWeight', w)}>{w}</button>
          ))}
        </div>

        <div className="color-picker-row">
          <div className="color-picker-col">
            <div className="color-picker-label">글자 색상</div>
            <input type="color" value={t.style.color} onChange={e => setProp('color', e.target.value)} className="color-picker-input" />
          </div>
          <div className="color-picker-col">
            <div className="color-picker-label">배경 색상</div>
            <input type="color" value={t.style.backgroundColor || '#ffffff'} onChange={e => setProp('backgroundColor', e.target.value)} className="color-picker-input" />
          </div>
        </div>
        <button className="transparent-btn" style={{ marginBottom: '8px' }} onClick={() => setProp('backgroundColor', 'transparent')}>배경 투명</button>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', padding: '8px', border: '1px solid #e5e7eb', borderRadius: '6px', textAlign: 'center', justifyContent: 'center' }}>
          <input type="checkbox" checked={!!t.style.isPill} onChange={e => setProp('isPill', e.target.checked)} /> 기본 둥근 라벨 패딩 (Pill 형)
        </label>

        <hr className="divider" />

        <div className="editor-title">정렬 & 간격</div>

        <div className="weight-label">정렬</div>
        <div className="align-select-group">
          <button className={t.style.textAlign === 'left' ? 'active' : ''} onClick={() => setProp('textAlign', 'left')}>좌</button>
          <button className={t.style.textAlign === 'center' ? 'active' : ''} onClick={() => setProp('textAlign', 'center')}>중앙</button>
          <button className={t.style.textAlign === 'right' ? 'active' : ''} onClick={() => setProp('textAlign', 'right')}>우</button>
        </div>

        <div className="slider-container">
          <div className="slider-label">자간: {t.style.letterSpacing ?? 0}px</div>
          <input type="range" min="-5" max="20" step="0.5" value={t.style.letterSpacing ?? 0} onChange={e => setProp('letterSpacing', parseFloat(e.target.value))} className="custom-slider" />
        </div>

        <div className="slider-container">
          <div className="slider-label">행간: {t.style.lineHeight ?? 1.2}</div>
          <input type="range" min="0.5" max="3" step="0.1" value={t.style.lineHeight ?? 1.2} onChange={e => setProp('lineHeight', parseFloat(e.target.value))} className="custom-slider" />
        </div>

        <div className="width-input-wrap">
          <div className="slider-label">가로폭 (px, 비우면 자동)</div>
          <input 
            type="text" 
            placeholder="auto" 
            value={t.style.width === 'auto' || !t.style.width ? '' : t.style.width} 
            onChange={e => {
              const val = e.target.value;
              setProp('width', val === '' ? 'auto' : parseInt(val) || 'auto');
            }} 
          />
        </div>
      </div>
    );
  };

  const renderDraggableTextList = (data: SectionData) => {
    const handleAddText = () => {
      const newText: TextItem = {
        id: Date.now().toString(),
        text: '새로운 텍스트',
        position: { x: 50, y: 50 },
        style: { color: '#000000', fontSize: 24, fontWeight: 'bold' }
      };
      onUpdate({ ...data, texts: [...data.texts, newText] } as SectionData);
    };

    return (
      <div className="prop-group">
        <div className="prop-group-title">타이틀 / 자유 텍스트 목록</div>
        <button className="add-item-btn" onClick={handleAddText}>+ 텍스트 추가</button>
        <div className="item-list" style={{ marginTop: '10px' }}>
          {data.texts.map(t => (
            <div className="item-card" key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{t.text}</span>
              <button className="icon-btn" onClick={() => { if(onSelectText) onSelectText(t.id); }}>✎</button>
              <button className="icon-btn danger" onClick={() => onUpdate({ ...data, texts: data.texts.filter(tx => tx.id !== t.id) } as SectionData)}>✕</button>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderMainVisualProps = (data: Extract<SectionData, { type: 'main' }>) => {
    if (activeTextId && data.texts.find(t => t.id === activeTextId)) {
      return renderTextProps(data.texts.find(t => t.id === activeTextId)!, data);
    }

    const currentTemplate = data.templateId ? getTemplateById(data.templateId) : undefined;

    return (
      <div>
        {/* ━━━ 🎨 템플릿 선택 ━━━ */}
        <div className="prop-group">
          <div className="prop-group-title">🎨 디자인 템플릿</div>

          {currentTemplate ? (
            // 템플릿이 적용된 상태: 현재 템플릿 정보 + 변수 입력 + 변경/해제 버튼
            <div>
              <div
                style={{
                  padding: '10px 12px',
                  background: '#eef2ff',
                  border: '1px solid #c7d2fe',
                  borderRadius: 8,
                  marginBottom: 10,
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 700, color: '#3730a3' }}>
                  {currentTemplate.name}
                </div>
                <div style={{ fontSize: 11, color: '#6366f1', marginTop: 2 }}>
                  {currentTemplate.description}
                </div>
              </div>

              {/* 변수 입력 폼 (할인율 등) */}
              {currentTemplate.variables.map((v) => (
                <div key={v.key} className="field" style={{ marginBottom: 8 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>
                    {v.label}
                  </label>
                  <input
                    type={v.type === 'number' ? 'number' : 'text'}
                    value={String(data.templateVars?.[v.key] ?? v.defaultValue)}
                    min={v.min}
                    max={v.max}
                    placeholder={v.hint}
                    onChange={(e) => {
                      const raw = e.target.value;
                      const value = v.type === 'number' ? Number(raw) : raw;
                      handleUpdateTemplateVar(data, v.key, value);
                    }}
                    style={{
                      width: '100%',
                      padding: '6px 8px',
                      fontSize: 13,
                      border: '1px solid #d1d5db',
                      borderRadius: 6,
                      marginTop: 2,
                    }}
                  />
                </div>
              ))}

              {/* 드래그 안내 */}
              <div
                style={{
                  marginTop: 10,
                  padding: '8px 10px',
                  background: '#f0f9ff',
                  border: '1px solid #bae6fd',
                  borderRadius: 6,
                  fontSize: 11,
                  color: '#0369a1',
                  lineHeight: 1.5,
                }}
              >
                💡 캔버스의 <strong>모든 스티커</strong>는 마우스로 끌어서 위치를 옮길 수 있어요.<br />
                <span style={{ color: '#0c4a6e', opacity: 0.7 }}>(텍스트는 디자인 일관성을 위해 고정)</span>
              </div>

              {/* ━━━ 🎨 스티커 라이브러리 — 자유 추가/삭제 ━━━ */}
              <div
                style={{
                  marginTop: 12,
                  padding: '10px 0 0',
                  borderTop: '1px dashed #e5e7eb',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 8,
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>
                    🎨 스티커 ({(data.stickers ?? []).length})
                  </div>
                  <button
                    onClick={() => setStickerLibraryOpen((v) => !v)}
                    style={{
                      padding: '4px 10px',
                      fontSize: 11,
                      fontWeight: 600,
                      background: stickerLibraryOpen ? '#6366f1' : '#eef2ff',
                      color: stickerLibraryOpen ? '#fff' : '#4338ca',
                      border: '1px solid #c7d2fe',
                      borderRadius: 6,
                      cursor: 'pointer',
                    }}
                  >
                    {stickerLibraryOpen ? '닫기' : '+ 추가'}
                  </button>
                </div>

                {/* 라이브러리 펼친 상태 */}
                {stickerLibraryOpen && (
                  <div
                    style={{
                      padding: 8,
                      background: '#fafafa',
                      border: '1px solid #e5e7eb',
                      borderRadius: 8,
                      marginBottom: 8,
                    }}
                  >
                    {/* 카테고리 탭 */}
                    <div style={{ display: 'flex', gap: 4, marginBottom: 8, flexWrap: 'wrap' }}>
                      {STICKER_CATEGORIES.map((cat) => (
                        <button
                          key={cat.key}
                          onClick={() => setStickerCategory(cat.key)}
                          style={{
                            flex: 1,
                            minWidth: 70,
                            padding: '5px 4px',
                            fontSize: 10,
                            fontWeight: 600,
                            background: stickerCategory === cat.key ? '#6366f1' : '#fff',
                            color: stickerCategory === cat.key ? '#fff' : '#6b7280',
                            border: '1px solid',
                            borderColor: stickerCategory === cat.key ? '#6366f1' : '#e5e7eb',
                            borderRadius: 5,
                            cursor: 'pointer',
                          }}
                        >
                          {cat.icon} {cat.label}
                        </button>
                      ))}
                    </div>

                    {/* 스티커 그리드 */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr 1fr',
                        gap: 6,
                      }}
                    >
                      {STICKER_LIBRARY.filter((s) => s.category === stickerCategory).map((s) => (
                        <button
                          key={s.libraryId}
                          onClick={() => handleAddSticker(data, s.libraryId)}
                          title={s.label}
                          style={{
                            padding: 0,
                            background: '#fff',
                            border: '1px solid #e5e7eb',
                            borderRadius: 6,
                            cursor: 'pointer',
                            overflow: 'hidden',
                            transition: 'all 0.12s',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = '#6366f1';
                            e.currentTarget.style.transform = 'scale(1.05)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = '#e5e7eb';
                            e.currentTarget.style.transform = 'scale(1)';
                          }}
                        >
                          <div
                            style={{ width: '100%', aspectRatio: '1/1', padding: 4 }}
                            dangerouslySetInnerHTML={{ __html: s.preview }}
                          />
                          <div style={{ fontSize: 9, color: '#6b7280', padding: '0 2px 4px', textAlign: 'center' }}>
                            {s.label}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 현재 추가된 스티커 목록 */}
                {(data.stickers ?? []).length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {(data.stickers ?? []).map((s, i) => (
                      <div
                        key={s.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '5px 8px',
                          background: '#fff',
                          border: '1px solid #e5e7eb',
                          borderRadius: 5,
                          fontSize: 11,
                        }}
                      >
                        <span style={{ color: '#374151' }}>
                          <span style={{ color: '#9ca3af', marginRight: 6 }}>{i + 1}.</span>
                          {getStickerLabel(s)}
                        </span>
                        <button
                          onClick={() => handleDeleteSticker(data, s.id)}
                          title="삭제"
                          style={{
                            width: 20,
                            height: 20,
                            padding: 0,
                            fontSize: 11,
                            background: 'transparent',
                            color: '#ef4444',
                            border: 'none',
                            borderRadius: 4,
                            cursor: 'pointer',
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 액션 버튼: 다른 템플릿 선택 / 해제 */}
              <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                <button
                  onClick={() => onUpdate({ ...data, templateId: undefined as any })}
                  style={{
                    flex: 1,
                    padding: '6px 8px',
                    fontSize: 12,
                    background: '#f3f4f6',
                    border: '1px solid #d1d5db',
                    borderRadius: 6,
                    cursor: 'pointer',
                  }}
                >
                  다른 템플릿 선택
                </button>
                <button
                  onClick={() => {
                    if (confirm('템플릿을 해제하면 모든 텍스트와 스티커가 삭제됩니다. 진행할까요?')) {
                      handleClearTemplate(data);
                    }
                  }}
                  style={{
                    padding: '6px 10px',
                    fontSize: 12,
                    background: '#fef2f2',
                    color: '#991b1b',
                    border: '1px solid #fecaca',
                    borderRadius: 6,
                    cursor: 'pointer',
                  }}
                >
                  해제
                </button>
              </div>
            </div>
          ) : (
            // 템플릿 미적용 상태: 썸네일 그리드
            <div>
              <p style={{ margin: '0 0 8px', fontSize: 11, color: '#6b7280', lineHeight: 1.5 }}>
                검증된 디자인 템플릿을 선택하세요.<br />
                선택 후 할인율 등 일부 항목만 수정할 수 있습니다.
              </p>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 8,
                }}
              >
                {MAIN_VISUAL_TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.id}
                    onClick={() => handleApplyTemplate(data, tpl.id)}
                    style={{
                      padding: 0,
                      background: '#fff',
                      border: '1px solid #e5e7eb',
                      borderRadius: 8,
                      cursor: 'pointer',
                      overflow: 'hidden',
                      textAlign: 'left',
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#6366f1';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(99,102,241,0.2)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#e5e7eb';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <div
                      style={{ width: '100%', aspectRatio: '5/3', background: '#f9fafb' }}
                      dangerouslySetInnerHTML={{ __html: tpl.thumbnail }}
                    />
                    <div style={{ padding: '6px 8px' }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#111827' }}>
                        {tpl.name}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ━━━ 배경 이미지 (템플릿 적용 시 보조용 / 미적용 시 메인용 / 미니멀 템플릿일 땐 필수) ━━━ */}
        <div className="prop-group">
          <div className="prop-group-title">
            배경 이미지
            {currentTemplate && currentTemplate.id === 'minimal' && (
              <span style={{ fontSize: 10, fontWeight: 600, color: '#dc2626', marginLeft: 6 }}>
                (필수 — 사진이 메인이 됩니다)
              </span>
            )}
            {currentTemplate && currentTemplate.id !== 'minimal' && (
              <span style={{ fontSize: 10, fontWeight: 400, color: '#9ca3af', marginLeft: 6 }}>
                (선택사항 — 템플릿 위에 반투명 오버레이)
              </span>
            )}
          </div>
          <FileUploader
            imageUrl={data.bgImage}
            onUpload={(url) => onUpdate({ ...data, bgImage: url })}
            onClear={() => onUpdate({ ...data, bgImage: '' })}
          />
        </div>

        {/*
         * ✨ AI 자동 디자인 — 템플릿 시스템 도입으로 비활성화.
         *    필요 시 위쪽의 핸들러 주석 블록과 함께 살리면 복원 가능.
         */}

        {/* 템플릿 없는 상태에서도 스티커 라이브러리 사용 가능 */}
        {!currentTemplate && (
          <div className="prop-group">
            <div className="prop-group-title">🎨 스티커 ({(data.stickers ?? []).length})</div>
            <button
              onClick={() => setStickerLibraryOpen((v) => !v)}
              style={{
                width: '100%',
                padding: '8px',
                fontSize: 12,
                fontWeight: 600,
                background: stickerLibraryOpen ? '#6366f1' : '#eef2ff',
                color: stickerLibraryOpen ? '#fff' : '#4338ca',
                border: '1px solid #c7d2fe',
                borderRadius: 6,
                cursor: 'pointer',
                marginBottom: 8,
              }}
            >
              {stickerLibraryOpen ? '라이브러리 닫기' : '+ 라이브러리에서 스티커 추가'}
            </button>

            {stickerLibraryOpen && (
              <div
                style={{
                  padding: 8,
                  background: '#fafafa',
                  border: '1px solid #e5e7eb',
                  borderRadius: 8,
                  marginBottom: 8,
                }}
              >
                <div style={{ display: 'flex', gap: 4, marginBottom: 8, flexWrap: 'wrap' }}>
                  {STICKER_CATEGORIES.map((cat) => (
                    <button
                      key={cat.key}
                      onClick={() => setStickerCategory(cat.key)}
                      style={{
                        flex: 1,
                        minWidth: 70,
                        padding: '5px 4px',
                        fontSize: 10,
                        fontWeight: 600,
                        background: stickerCategory === cat.key ? '#6366f1' : '#fff',
                        color: stickerCategory === cat.key ? '#fff' : '#6b7280',
                        border: '1px solid',
                        borderColor: stickerCategory === cat.key ? '#6366f1' : '#e5e7eb',
                        borderRadius: 5,
                        cursor: 'pointer',
                      }}
                    >
                      {cat.icon} {cat.label}
                    </button>
                  ))}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
                  {STICKER_LIBRARY.filter((s) => s.category === stickerCategory).map((s) => (
                    <button
                      key={s.libraryId}
                      onClick={() => handleAddSticker(data, s.libraryId)}
                      title={s.label}
                      style={{
                        padding: 0,
                        background: '#fff',
                        border: '1px solid #e5e7eb',
                        borderRadius: 6,
                        cursor: 'pointer',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{ width: '100%', aspectRatio: '1/1', padding: 4 }}
                        dangerouslySetInnerHTML={{ __html: s.preview }}
                      />
                      <div style={{ fontSize: 9, color: '#6b7280', padding: '0 2px 4px', textAlign: 'center' }}>
                        {s.label}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 추가된 스티커 목록 */}
            {(data.stickers ?? []).length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {(data.stickers ?? []).map((s, i) => (
                  <div
                    key={s.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '5px 8px',
                      background: '#fff',
                      border: '1px solid #e5e7eb',
                      borderRadius: 5,
                      fontSize: 11,
                    }}
                  >
                    <span style={{ color: '#374151' }}>
                      <span style={{ color: '#9ca3af', marginRight: 6 }}>{i + 1}.</span>
                      {getStickerLabel(s)}
                    </span>
                    <button
                      onClick={() => handleDeleteSticker(data, s.id)}
                      title="삭제"
                      style={{
                        width: 20, height: 20, padding: 0, fontSize: 11,
                        background: 'transparent', color: '#ef4444',
                        border: 'none', borderRadius: 4, cursor: 'pointer',
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {!currentTemplate && renderDraggableTextList(data)}
      </div>
    );
  };

  const renderCouponProps = (data: Extract<SectionData, { type: 'coupon' }>) => {
    if (activeTextId && data.texts.find(t => t.id === activeTextId)) {
      return renderTextProps(data.texts.find(t => t.id === activeTextId)!, data);
    }
    const handleUpdateCoupon = (id: string, field: keyof CouponItem, val: string) => {
      onUpdate({ ...data, coupons: data.coupons.map(c => c.id === id ? { ...c, [field]: val } : c) });
    };
    const currentTemplate = data.templateId ? getCouponTemplateById(data.templateId) : undefined;

    return (
      <div>
        {/* ━━━ 🎨 쿠폰 디자인 템플릿 ━━━ */}
        <div className="prop-group">
          <div className="prop-group-title">🎨 쿠폰 디자인 템플릿</div>

          {currentTemplate ? (
            <div>
              <div
                style={{
                  padding: '10px 12px',
                  background: '#eef2ff',
                  border: '1px solid #c7d2fe',
                  borderRadius: 8,
                  marginBottom: 10,
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 700, color: '#3730a3' }}>
                  {currentTemplate.name}
                </div>
                <div style={{ fontSize: 11, color: '#6366f1', marginTop: 2 }}>
                  {currentTemplate.description}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  onClick={() => onUpdate({ ...data, templateId: undefined })}
                  style={{
                    flex: 1,
                    padding: '6px 8px',
                    fontSize: 12,
                    background: '#f3f4f6',
                    border: '1px solid #d1d5db',
                    borderRadius: 6,
                    cursor: 'pointer',
                  }}
                >
                  다른 템플릿 선택
                </button>
                <button
                  onClick={() => {
                    if (confirm('템플릿을 해제하면 쿠폰과 텍스트가 모두 삭제됩니다. 진행할까요?')) {
                      handleClearCouponTemplate(data);
                    }
                  }}
                  style={{
                    padding: '6px 10px',
                    fontSize: 12,
                    background: '#fef2f2',
                    color: '#991b1b',
                    border: '1px solid #fecaca',
                    borderRadius: 6,
                    cursor: 'pointer',
                  }}
                >
                  해제
                </button>
              </div>
            </div>
          ) : (
            <div>
              <p style={{ margin: '0 0 8px', fontSize: 11, color: '#6b7280', lineHeight: 1.5 }}>
                검증된 디자인 템플릿을 선택하세요.<br />
                선택 후 텍스트와 쿠폰 내용만 수정할 수 있습니다.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {COUPON_TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.id}
                    onClick={() => handleApplyCouponTemplate(data, tpl.id)}
                    style={{
                      padding: 0,
                      background: '#fff',
                      border: '1px solid #e5e7eb',
                      borderRadius: 8,
                      cursor: 'pointer',
                      overflow: 'hidden',
                      textAlign: 'left',
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#6366f1';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(99,102,241,0.2)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#e5e7eb';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <div
                      style={{ width: '100%', aspectRatio: '5/3', background: '#f9fafb' }}
                      dangerouslySetInnerHTML={{ __html: tpl.thumbnail }}
                    />
                    <div style={{ padding: '6px 8px' }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#111827' }}>
                        {tpl.name}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 템플릿 적용 시: 헤더 텍스트 + 쿠폰 내용만 노출 */}
        {currentTemplate && (
          <>
            {renderDraggableTextList(data)}

            <div className="prop-group">
              <div className="prop-group-title">쿠폰 내용</div>
              <p style={{ margin: '0 0 10px', fontSize: 11, color: '#6b7280', lineHeight: 1.5 }}>
                라벨, 할인 내역, 링크만 수정할 수 있습니다.<br />
                디자인(색상·모양·배경)은 템플릿이 결정합니다.
              </p>
              <button
                className="add-item-btn"
                onClick={() => {
                  // 템플릿의 첫 번째 쿠폰을 베이스로 새 쿠폰 추가 (디자인 속성 그대로)
                  const base = currentTemplate.coupons[0];
                  const newCoupon: CouponItem = base
                    ? { ...base, id: Date.now().toString(), label: '🎟️ NEW COUPON', name: '신규 쿠폰', link: '#' }
                    : { id: Date.now().toString(), label: '🎟️ NEW COUPON', name: '신규 쿠폰', link: '#' };
                  onUpdate({ ...data, coupons: [...data.coupons, newCoupon] });
                }}
              >
                + 쿠폰 추가
              </button>
              <div className="item-list" style={{ marginTop: 10 }}>
                {data.coupons.map((c, idx) => (
                  <div
                    className="item-card"
                    key={c.id}
                    ref={(el) => { itemRefs.current[c.id] = el; }}
                    style={{ border: activeItemId === c.id ? '2px solid #2563eb' : '1px solid #e5e7eb', transition: 'border 0.2s' }}
                  >
                    <div className="item-card-header">
                      <span>{idx + 1}번 쿠폰</span>
                      <button
                        className="icon-btn danger"
                        onClick={() => onUpdate({ ...data, coupons: data.coupons.filter((x) => x.id !== c.id) })}
                      >
                        ✕
                      </button>
                    </div>
                    <div className="field">
                      <label>라벨 문구</label>
                      <input
                        type="text"
                        value={c.label ?? '🎟️ SPECIAL COUPON'}
                        onChange={(e) => handleUpdateCoupon(c.id, 'label', e.target.value)}
                      />
                    </div>
                    <div className="field">
                      <label>할인 내역</label>
                      <input
                        type="text"
                        value={c.name}
                        onChange={(e) => handleUpdateCoupon(c.id, 'name', e.target.value)}
                      />
                    </div>
                    <div className="field">
                      <label>다운로드 링크</label>
                      <input
                        type="text"
                        value={c.link}
                        placeholder="https://..."
                        onChange={(e) => handleUpdateCoupon(c.id, 'link', e.target.value)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    );
  };

  const renderProductProps = (data: Extract<SectionData, { type: 'product' }>) => {
    if (activeTextId && data.texts.find(t => t.id === activeTextId)) {
      return renderTextProps(data.texts.find(t => t.id === activeTextId)!, data);
    }
    const handleUpdateProduct = (id: string, field: keyof ProductItem, val: any) => {
      onUpdate({ ...data, products: data.products.map(p => p.id === id ? { ...p, [field]: val } : p) });
    };
    const currentTemplate = data.templateId ? getProductTemplateById(data.templateId) : undefined;

    return (
      <div>
        {/* ━━━ 🎨 상품 디자인 템플릿 ━━━ */}
        <div className="prop-group">
          <div className="prop-group-title">🎨 상품 디자인 템플릿</div>

          {currentTemplate ? (
            <div>
              <div
                style={{
                  padding: '10px 12px',
                  background: '#eef2ff',
                  border: '1px solid #c7d2fe',
                  borderRadius: 8,
                  marginBottom: 10,
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 700, color: '#3730a3' }}>
                  {currentTemplate.name}
                </div>
                <div style={{ fontSize: 11, color: '#6366f1', marginTop: 2 }}>
                  {currentTemplate.description}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  onClick={() => onUpdate({ ...data, templateId: undefined })}
                  style={{
                    flex: 1,
                    padding: '6px 8px',
                    fontSize: 12,
                    background: '#f3f4f6',
                    border: '1px solid #d1d5db',
                    borderRadius: 6,
                    cursor: 'pointer',
                  }}
                >
                  다른 템플릿 선택
                </button>
                <button
                  onClick={() => {
                    if (confirm('템플릿을 해제하면 상품과 텍스트가 모두 삭제됩니다. 진행할까요?')) {
                      handleClearProductTemplate(data);
                    }
                  }}
                  style={{
                    padding: '6px 10px',
                    fontSize: 12,
                    background: '#fef2f2',
                    color: '#991b1b',
                    border: '1px solid #fecaca',
                    borderRadius: 6,
                    cursor: 'pointer',
                  }}
                >
                  해제
                </button>
              </div>
            </div>
          ) : (
            <div>
              <p style={{ margin: '0 0 8px', fontSize: 11, color: '#6b7280', lineHeight: 1.5 }}>
                검증된 디자인 템플릿을 선택하세요.<br />
                선택 후 사진·텍스트·뱃지를 수정할 수 있습니다.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {PRODUCT_TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.id}
                    onClick={() => handleApplyProductTemplate(data, tpl.id)}
                    style={{
                      padding: 0,
                      background: '#fff',
                      border: '1px solid #e5e7eb',
                      borderRadius: 8,
                      cursor: 'pointer',
                      overflow: 'hidden',
                      textAlign: 'left',
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#6366f1';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(99,102,241,0.2)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#e5e7eb';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <div
                      style={{ width: '100%', aspectRatio: '5/3', background: '#f9fafb' }}
                      dangerouslySetInnerHTML={{ __html: tpl.thumbnail }}
                    />
                    <div style={{ padding: '6px 8px' }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#111827' }}>
                        {tpl.name}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 템플릿 적용 시: 헤더 텍스트 + 상품 사진/이름만 노출 */}
        {currentTemplate && (
          <>
            {renderDraggableTextList(data)}

            <div className="prop-group">
              <div className="prop-group-title">상품 정보</div>
              <p style={{ margin: '0 0 10px', fontSize: 11, color: '#6b7280', lineHeight: 1.5 }}>
                사진·상품명·서브 설명·할인율·뱃지를 수정할 수 있습니다.<br />
                레이아웃·배경·여백은 템플릿이 결정합니다.
              </p>
              <button
                className="add-item-btn"
                onClick={() => {
                  // 템플릿의 첫 번째 상품을 베이스로 새 상품 추가 (디자인 속성 그대로)
                  const base = currentTemplate.products[0];
                  const newProduct: ProductItem = base
                    ? { ...base, id: Date.now().toString(), name: '신규 상품', image: '' }
                    : { id: Date.now().toString(), name: '신규 상품', discount: 0, image: '', badge: 'none' };
                  onUpdate({ ...data, products: [...data.products, newProduct] });
                }}
              >
                + 상품 추가
              </button>
              <div className="item-list" style={{ marginTop: 10 }}>
                {data.products.map((p, idx) => (
                  <div
                    className="item-card"
                    key={p.id}
                    ref={(el) => { itemRefs.current[p.id] = el; }}
                    style={{ border: activeItemId === p.id ? '2px solid #2563eb' : '1px solid #e5e7eb', transition: 'border 0.2s' }}
                  >
                    <div className="item-card-header">
                      <span>상품 {idx + 1}</span>
                      <button
                        className="icon-btn danger"
                        onClick={() => onUpdate({ ...data, products: data.products.filter((x) => x.id !== p.id) })}
                      >
                        ✕
                      </button>
                    </div>
                    <FileUploader
                      label="상품 이미지"
                      imageUrl={p.image}
                      onUpload={(url) => handleUpdateProduct(p.id, 'image', url)}
                      onClear={() => handleUpdateProduct(p.id, 'image', '')}
                    />

                    {/* ━━━ 상품명 + 폰트 옵션 ━━━ */}
                    <div className="field">
                      <label>상품명</label>
                      <input
                        type="text"
                        value={p.name}
                        onChange={(e) => handleUpdateProduct(p.id, 'name', e.target.value)}
                      />
                    </div>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr auto auto',
                        gap: 6,
                        alignItems: 'end',
                        marginBottom: 8,
                      }}
                    >
                      <div className="slider-container" style={{ margin: 0 }}>
                        <div className="slider-label" style={{ fontSize: 11, color: '#6b7280' }}>
                          상품명 크기: {p.nameFontSize ?? 16}px
                        </div>
                        <input
                          type="range"
                          min="10"
                          max="40"
                          value={p.nameFontSize ?? 16}
                          onChange={(e) => handleUpdateProduct(p.id, 'nameFontSize', parseInt(e.target.value))}
                          className="custom-slider"
                        />
                      </div>
                      <input
                        type="color"
                        title="상품명 색상"
                        value={p.nameColor || '#1f2937'}
                        onChange={(e) => handleUpdateProduct(p.id, 'nameColor', e.target.value)}
                        style={{ width: 32, height: 32, border: '1px solid #d1d5db', borderRadius: 6, padding: 0, cursor: 'pointer' }}
                      />
                      <button
                        type="button"
                        title="템플릿 기본 스타일로 리셋"
                        onClick={() => {
                          onUpdate({
                            ...data,
                            products: data.products.map((x) =>
                              x.id === p.id ? { ...x, nameColor: undefined, nameFontSize: undefined } : x,
                            ),
                          });
                        }}
                        style={{
                          height: 32,
                          padding: '0 8px',
                          fontSize: 11,
                          background: '#f3f4f6',
                          border: '1px solid #d1d5db',
                          borderRadius: 6,
                          cursor: 'pointer',
                          color: '#374151',
                        }}
                      >
                        리셋
                      </button>
                    </div>

                    {/* ━━━ 서브 설명 + 폰트 옵션 ━━━ */}
                    <div className="field">
                      <label>
                        서브 설명 (상품명 아래 표시){' '}
                        <span style={{ color: '#9ca3af', fontSize: 11, fontWeight: 400 }}>(선택)</span>
                      </label>
                      <input
                        type="text"
                        value={p.subtitle ?? ''}
                        placeholder="예: 슬림한 1인용 빈백, 최대 적재 50kg"
                        onChange={(e) => handleUpdateProduct(p.id, 'subtitle', e.target.value)}
                      />
                    </div>
                    {p.subtitle && p.subtitle.trim() !== '' && (
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr auto auto',
                          gap: 6,
                          alignItems: 'end',
                          marginBottom: 8,
                        }}
                      >
                        <div className="slider-container" style={{ margin: 0 }}>
                          <div className="slider-label" style={{ fontSize: 11, color: '#6b7280' }}>
                            서브 크기: {p.subtitleFontSize ?? 13}px
                          </div>
                          <input
                            type="range"
                            min="9"
                            max="24"
                            value={p.subtitleFontSize ?? 13}
                            onChange={(e) => handleUpdateProduct(p.id, 'subtitleFontSize', parseInt(e.target.value))}
                            className="custom-slider"
                          />
                        </div>
                        <input
                          type="color"
                          title="서브 설명 색상"
                          value={p.subtitleColor || '#6b7280'}
                          onChange={(e) => handleUpdateProduct(p.id, 'subtitleColor', e.target.value)}
                          style={{ width: 32, height: 32, border: '1px solid #d1d5db', borderRadius: 6, padding: 0, cursor: 'pointer' }}
                        />
                        <button
                          type="button"
                          title="템플릿 기본 스타일로 리셋"
                          onClick={() => {
                            onUpdate({
                              ...data,
                              products: data.products.map((x) =>
                                x.id === p.id ? { ...x, subtitleColor: undefined, subtitleFontSize: undefined } : x,
                              ),
                            });
                          }}
                          style={{
                            height: 32,
                            padding: '0 8px',
                            fontSize: 11,
                            background: '#f3f4f6',
                            border: '1px solid #d1d5db',
                            borderRadius: 6,
                            cursor: 'pointer',
                            color: '#374151',
                          }}
                        >
                          리셋
                        </button>
                      </div>
                    )}

                    <div className="field">
                      <label>할인율 (%)</label>
                      <input
                        type="number"
                        min="0"
                        max="99"
                        value={p.discount}
                        onChange={(e) => handleUpdateProduct(p.id, 'discount', parseInt(e.target.value) || 0)}
                      />
                    </div>

                    {/* ━━━ 뱃지 종류 선택 (없음 / BEST / NEW / HOT / 직접입력) ━━━ */}
                    <div className="field" style={{ marginTop: 8 }}>
                      <label>뱃지</label>
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(5, 1fr)',
                          gap: 4,
                        }}
                      >
                        {(['none', 'best', 'new', 'hot', 'custom'] as const).map((b) => {
                          const labels: Record<string, string> = {
                            none: '없음', best: 'BEST', new: 'NEW', hot: 'HOT', custom: '직접',
                          };
                          const isActive = p.badge === b;
                          return (
                            <button
                              key={b}
                              onClick={() => handleUpdateProduct(p.id, 'badge', b)}
                              style={{
                                padding: '6px 4px',
                                fontSize: 11,
                                fontWeight: 700,
                                borderRadius: 5,
                                border: isActive ? '1.5px solid #2563eb' : '1px solid #d1d5db',
                                background: isActive ? '#eff6ff' : '#fff',
                                color: isActive ? '#2563eb' : '#374151',
                                cursor: 'pointer',
                              }}
                            >
                              {labels[b]}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* 직접입력 — 뱃지 문구 */}
                    {p.badge === 'custom' && (
                      <div className="field">
                        <label>뱃지 문구</label>
                        <input
                          type="text"
                          value={p.badgeLabel || ''}
                          placeholder="예: MD추천"
                          onChange={(e) => handleUpdateProduct(p.id, 'badgeLabel', e.target.value)}
                        />
                      </div>
                    )}

                    {/* 뱃지 색상 — 뱃지가 있을 때만 노출 */}
                    {p.badge !== 'none' && (
                      <div className="field">
                        <label>뱃지 색상</label>
                        <input
                          type="color"
                          value={
                            p.badgeColor ||
                            (p.badge === 'best'
                              ? '#ec4899'
                              : p.badge === 'new'
                                ? '#3b82f6'
                                : p.badge === 'hot'
                                  ? '#ef4444'
                                  : '#10b981')
                          }
                          onChange={(e) => handleUpdateProduct(p.id, 'badgeColor', e.target.value)}
                          style={{
                            width: '100%',
                            height: 32,
                            border: '1px solid #d1d5db',
                            borderRadius: 6,
                          }}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <aside className="props">
      <div className="props-header">
        <h2>{activeSection.type === 'main' ? '메인 비주얼 속성' : activeSection.type === 'coupon' ? '쿠폰 속성' : '상품 속성'}</h2>
      </div>
      <PromptBuilderLink sectionType={activeSection.type} />
      {activeSection.type === 'main' && renderMainVisualProps(activeSection as any)}
      {activeSection.type === 'coupon' && renderCouponProps(activeSection as any)}
      {activeSection.type === 'product' && renderProductProps(activeSection as any)}
    </aside>
  );
}

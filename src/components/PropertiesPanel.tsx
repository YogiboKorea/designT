'use client';
import React, { useEffect, useRef } from 'react';
import { SectionData, TextItem, CouponItem, ProductItem } from '../app/builder/types';

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

    return (
      <div>
        <div className="prop-group">
          <div className="prop-group-title">배경 이미지</div>
          <FileUploader imageUrl={data.bgImage} onUpload={(url) => onUpdate({ ...data, bgImage: url })} onClear={() => onUpdate({ ...data, bgImage: '' })} />
        </div>
        {renderDraggableTextList(data)}
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
    return (
      <div>
        {renderDraggableTextList(data)}
        <div className="prop-group">
          <div className="prop-group-title">쿠폰 공통</div>
          <div className="field-row">
            <div className="field"><label>배경 색상</label><input type="color" value={data.bgColor} onChange={e => onUpdate({ ...data, bgColor: e.target.value })} /></div>
            <FileUploader label="배경 이미지" imageUrl={data.bgImage} onUpload={url => onUpdate({ ...data, bgImage: url })} onClear={() => onUpdate({ ...data, bgImage: '' })} />
          </div>
        </div>
        <div className="prop-group">
          <div className="prop-group-title">개별 쿠폰 설정</div>
          <button className="add-item-btn" onClick={() => onUpdate({ ...data, coupons: [...data.coupons, { id: Date.now().toString(), label: '🎟️ 특별 쿠폰', name: '신규 쿠폰', link: '#' }] })}>+ 쿠폰 추가</button>
          <div className="item-list" style={{ marginTop: '10px' }}>
            {data.coupons.map((c, idx) => (
              <div
                className="item-card"
                key={c.id}
                ref={el => { itemRefs.current[c.id] = el; }}
                style={{ border: activeItemId === c.id ? '2px solid #2563eb' : '1px solid #e5e7eb', transition: 'border 0.2s' }}
              >
                <div className="item-card-header"><span>{idx + 1}번 쿠폰</span><button className="icon-btn danger" onClick={() => onUpdate({ ...data, coupons: data.coupons.filter(x => x.id !== c.id) })}>✕</button></div>
                <div className="slider-container" style={{ marginBottom: '12px' }}>
                  <div className="slider-label" style={{ fontSize: '12px', fontWeight: 600, color: '#374151' }}>쿠폰 너비: {c.couponWidth ?? 400}px</div>
                  <input type="range" min="200" max="780" value={c.couponWidth ?? 400} onChange={e => onUpdate({ ...data, coupons: data.coupons.map(x => x.id === c.id ? { ...x, couponWidth: parseInt(e.target.value) } : x) })} className="custom-slider" />
                </div>
                <div className="field"><label>라벨 문구</label><input type="text" value={c.label ?? '🎟️ SPECIAL COUPON'} onChange={e => handleUpdateCoupon(c.id, 'label', e.target.value)} /></div>
                <div className="field"><label>할인 내역</label><input type="text" value={c.name} onChange={e => handleUpdateCoupon(c.id, 'name', e.target.value)} /></div>
                <div className="color-picker-row" style={{ marginTop: '12px' }}>
                  <div className="color-picker-col">
                    <div className="color-picker-label" style={{fontSize: '12px'}}>라벨 색상</div>
                    <input type="color" value={c.labelColor || '#ec4899'} onChange={e => handleUpdateCoupon(c.id, 'labelColor', e.target.value)} className="color-picker-input" />
                  </div>
                  <div className="color-picker-col">
                    <div className="color-picker-label" style={{fontSize: '12px'}}>내용 색상</div>
                    <input type="color" value={c.nameColor || '#111827'} onChange={e => handleUpdateCoupon(c.id, 'nameColor', e.target.value)} className="color-picker-input" />
                  </div>
                </div>
                <div className="color-picker-row">
                  <div className="color-picker-col">
                    <div className="color-picker-label" style={{fontSize: '12px'}}>쿠폰 배경색</div>
                    <input type="color" value={c.couponBgColor || '#ffffff'} onChange={e => handleUpdateCoupon(c.id, 'couponBgColor', e.target.value)} className="color-picker-input" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
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
    return (
      <div>
        {renderDraggableTextList(data)}
        <div className="prop-group">
          <div className="prop-group-title">섹션 여백</div>
          <div className="slider-container">
            <div className="slider-label">상단 여백: {data.paddingTop ?? 80}px</div>
            <input type="range" min="20" max="200" value={data.paddingTop ?? 80} onChange={e => onUpdate({ ...data, paddingTop: parseInt(e.target.value) })} className="custom-slider" />
          </div>
          <div className="slider-container">
            <div className="slider-label">하단 여백: {data.paddingBottom ?? 50}px</div>
            <input type="range" min="20" max="200" value={data.paddingBottom ?? 50} onChange={e => onUpdate({ ...data, paddingBottom: parseInt(e.target.value) })} className="custom-slider" />
          </div>
        </div>
        <div className="prop-group">
          <div className="prop-group-title">레이아웃</div>
          <div className="field">
            <label>그리드 방식</label>
            <div className="template-grid" style={{ marginBottom: '10px' }}>
              <button className={`template-btn ${data.layout==='uniform'?'active':''}`} onClick={() => onUpdate({ ...data, layout: 'uniform'})}>기본 격자</button>
              <button className={`template-btn ${data.layout==='featured'?'active':''}`} onClick={() => onUpdate({ ...data, layout: 'featured'})}>강조형 격자</button>
            </div>
            {data.layout === 'uniform' && (
              <div className="align-grid">
                {[1,2,3].map(c => (
                  <button key={c} className={`align-btn ${data.columns===c?'active':''}`} onClick={() => onUpdate({ ...data, columns: c as 1|2|3 })}>{c}열</button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="prop-group">
          <div className="prop-group-title">상품 리스트</div>
          <button className="add-item-btn" onClick={() => onUpdate({ ...data, products: [...data.products, { id: Date.now().toString(), name: '신규 상품', discount: 0, image: '', badge: 'none' }] })}>+ 상품 추가</button>
          <div className="item-list" style={{ marginTop: '10px' }}>
            {data.products.map((p, idx) => (
              <div
                className="item-card"
                key={p.id}
                ref={el => { itemRefs.current[p.id] = el; }}
                style={{ border: activeItemId === p.id ? '2px solid #2563eb' : '1px solid #e5e7eb', transition: 'border 0.2s' }}
              >
                <div className="item-card-header"><span>상품 {idx + 1}</span><button className="icon-btn danger" onClick={() => onUpdate({ ...data, products: data.products.filter(x => x.id !== p.id) })}>✕</button></div>
                <FileUploader label="상품 이미지" imageUrl={p.image} onUpload={url => handleUpdateProduct(p.id, 'image', url)} onClear={() => handleUpdateProduct(p.id, 'image', '')} />
                <div className="field"><label>상품명</label><input type="text" value={p.name} onChange={e => handleUpdateProduct(p.id, 'name', e.target.value)} /></div>

                <div className="field-row">
                  <div className="field"><label>할인율 (%)</label><input type="number" min="0" max="99" value={p.discount} onChange={e => handleUpdateProduct(p.id, 'discount', parseInt(e.target.value) || 0)} /></div>
                  <div className="field">
                    <label>할인 위치</label>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {(['right','left'] as const).map(pos => (
                        <button key={pos} onClick={() => handleUpdateProduct(p.id, 'discountPosition', pos)}
                          style={{ flex: 1, padding: '5px', fontSize: '11px', fontWeight: 700, borderRadius: '5px', border: (p.discountPosition ?? 'right') === pos ? '1.5px solid #2563eb' : '1px solid #d1d5db', background: (p.discountPosition ?? 'right') === pos ? '#eff6ff' : 'white', cursor: 'pointer', color: (p.discountPosition ?? 'right') === pos ? '#2563eb' : '#374151' }}>
                          {pos === 'left' ? '왼쪽' : '오른쪽'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="field">
                  <label>할인 색상</label>
                  <input type="color" value={p.discountColor || '#00d280'} onChange={e => handleUpdateProduct(p.id, 'discountColor', e.target.value)} style={{ width: '100%', height: '32px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                </div>

                <hr style={{ border: 'none', borderTop: '1px dashed #e5e7eb', margin: '10px 0' }} />
                <div className="field-row">
                  <div className="field">
                    <label>뱃지 종류</label>
                    <select value={p.badge} onChange={e => handleUpdateProduct(p.id, 'badge', e.target.value)} style={{ padding: '6px', width: '100%', border: '1px solid #d1d5db', borderRadius: '4px', background: 'white' }}>
                      <option value="none">없음</option>
                      <option value="best">BEST</option>
                      <option value="new">NEW</option>
                      <option value="hot">HOT</option>
                      <option value="custom">직접입력</option>
                    </select>
                  </div>
                  {p.badge !== 'none' && (
                    <div className="field">
                      <label>뱃지 위치</label>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        {(['left','right'] as const).map(pos => (
                          <button key={pos} onClick={() => handleUpdateProduct(p.id, 'badgePosition', pos)}
                            style={{ flex: 1, padding: '5px', fontSize: '11px', fontWeight: 700, borderRadius: '5px', border: (p.badgePosition ?? 'left') === pos ? '1.5px solid #2563eb' : '1px solid #d1d5db', background: (p.badgePosition ?? 'left') === pos ? '#eff6ff' : 'white', cursor: 'pointer', color: (p.badgePosition ?? 'left') === pos ? '#2563eb' : '#374151' }}>
                            {pos === 'left' ? '왼쪽' : '오른쪽'}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                {p.badge !== 'none' && (
                  <>
                    {p.badge === 'custom' && <div className="field"><label>뱃지 문구</label><input type="text" value={p.badgeLabel || ''} placeholder="예: MD추천" onChange={e => handleUpdateProduct(p.id, 'badgeLabel', e.target.value)} /></div>}
                    <div className="field">
                      <label>뱃지 색상</label>
                      <input type="color" value={p.badgeColor || (p.badge === 'best' ? '#ec4899' : p.badge === 'new' ? '#3b82f6' : p.badge === 'hot' ? '#ef4444' : '#10b981')} onChange={e => handleUpdateProduct(p.id, 'badgeColor', e.target.value)} style={{ width: '100%', height: '32px', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <aside className="props">
      <div className="props-header">
        <h2>{activeSection.type === 'main' ? '메인 비주얼 속성' : activeSection.type === 'coupon' ? '쿠폰 속성' : '상품 속성'}</h2>
      </div>
      {activeSection.type === 'main' && renderMainVisualProps(activeSection as any)}
      {activeSection.type === 'coupon' && renderCouponProps(activeSection as any)}
      {activeSection.type === 'product' && renderProductProps(activeSection as any)}
    </aside>
  );
}

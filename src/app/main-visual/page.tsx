'use client';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import Link from 'next/link';
import MainVisualCanvas from '../../components/MainVisualCanvas';
import PreviewModal from '../../components/PreviewModal';
import { TextItem } from '../builder/types';
import {
  MAIN_VISUAL_SIZES,
  MainVisualCanvas as MainVisualCanvasType,
  MainVisualDevice,
  MainVisualState,
  createDefaultText,
  createEmptyMainVisualState,
} from './types';

// ============================================================================
// 메인비주얼 제작기 (웹 1920x680 / 모바일 800x907)
// 이미지 처리 방식: cover — 업로드 이미지는 캔버스를 꽉 채우며 비율에 맞춰 자동 크롭.
// ============================================================================

const CAPTURE_IDS: Record<MainVisualDevice, string> = {
  web: 'main-visual-capture-web',
  mobile: 'main-visual-capture-mobile',
};

export default function MainVisualBuilderPage() {
  const [title, setTitle] = useState('');
  const [device, setDevice] = useState<MainVisualDevice>('web');
  const [state, setState] = useState<MainVisualState>(createEmptyMainVisualState());
  const [activeTextId, setActiveTextId] = useState<string | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [previewWebUrl, setPreviewWebUrl] = useState('');
  const [previewMobileUrl, setPreviewMobileUrl] = useState('');
  const [previewDisplayDevice, setPreviewDisplayDevice] = useState<MainVisualDevice>('web');
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);

  const current = state[device];
  const activeText = current.texts.find((t) => t.id === activeTextId) || null;
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 탭 전환 시 선택 초기화
  useEffect(() => {
    setActiveTextId(null);
  }, [device]);

  // --------------------------------------------------------------------------
  // 상태 업데이트 헬퍼
  // --------------------------------------------------------------------------
  const updateCurrent = (patch: Partial<MainVisualState[MainVisualDevice]>) => {
    setState((prev) => ({ ...prev, [device]: { ...prev[device], ...patch } }));
  };

  const updateTexts = (texts: TextItem[]) => updateCurrent({ texts });

  const handleBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('이미지 파일만 업로드 가능합니다.');
      return;
    }
    const url = URL.createObjectURL(file);
    updateCurrent({ bgImage: url });
    e.target.value = '';
  };

  const handleClearImage = () => {
    updateCurrent({ bgImage: '' });
  };

  // --------------------------------------------------------------------------
  // 텍스트
  // --------------------------------------------------------------------------
  const handleAddText = () => {
    const newText = createDefaultText(device);
    updateTexts([...current.texts, newText]);
    setActiveTextId(newText.id);
  };

  const handleUpdateText = (
    id: string,
    text: string,
    position: { x: number; y: number },
    style: any,
  ) => {
    updateTexts(
      current.texts.map((t) =>
        t.id === id ? { ...t, text, position, style: { ...style } } : t,
      ),
    );
  };

  const handleDeleteText = (id: string) => {
    updateTexts(current.texts.filter((t) => t.id !== id));
    if (activeTextId === id) setActiveTextId(null);
  };

  const handleTextStyleChange = (patch: Partial<TextItem['style']>) => {
    if (!activeText) return;
    updateTexts(
      current.texts.map((t) =>
        t.id === activeText.id ? { ...t, style: { ...t.style, ...patch } } : t,
      ),
    );
  };

  const handleTextContentChange = (val: string) => {
    if (!activeText) return;
    updateTexts(
      current.texts.map((t) =>
        t.id === activeText.id ? { ...t, text: val } : t,
      ),
    );
  };

  // --------------------------------------------------------------------------
  // 캡처 — 숨겨진 원본 크기 캔버스를 찾아서 html2canvas로 PNG 추출
  // --------------------------------------------------------------------------
  const captureDevice = async (dev: MainVisualDevice): Promise<string | null> => {
    const el = document.getElementById(CAPTURE_IDS[dev]) as HTMLElement | null;
    if (!el) return null;
    const { width, height } = MAIN_VISUAL_SIZES[dev];

    // 원래 transform을 저장하고 scale 1로 복원
    const prevTransform = el.style.transform;
    el.style.transform = 'none';

    // 레이아웃 업데이트 대기
    await new Promise((r) => setTimeout(r, 120));

    try {
      const canvas = await html2canvas(el, {
        useCORS: true,
        allowTaint: true,
        backgroundColor: null,
        scale: 1,
        width,
        height,
        windowWidth: width,
        windowHeight: height,
        logging: false,
      });
      return canvas.toDataURL('image/png');
    } finally {
      el.style.transform = prevTransform;
    }
  };

  // --------------------------------------------------------------------------
  // 현재 탭만 빠른 다운로드
  // --------------------------------------------------------------------------
  const handleQuickDownload = async () => {
    setIsSaving(true);
    setActiveTextId(null);
    await new Promise((r) => setTimeout(r, 80));
    try {
      const dataUrl = await captureDevice(device);
      if (!dataUrl) {
        alert('캡처에 실패했습니다.');
        return;
      }
      const link = document.createElement('a');
      link.href = dataUrl;
      const baseName = title || 'main_visual';
      link.download = `${baseName}_${device}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error(e);
      alert('다운로드 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  // --------------------------------------------------------------------------
  // 미리보기 열기 — 웹/모바일 둘 다 캡처해서 모달로
  // --------------------------------------------------------------------------
  const handleOpenPreview = async () => {
    if (!title.trim()) {
      alert('제목을 먼저 입력해주세요.');
      return;
    }
    setIsGeneratingPreview(true);
    setActiveTextId(null);
    await new Promise((r) => setTimeout(r, 80));
    try {
      const [web, mobile] = await Promise.all([
        captureDevice('web'),
        captureDevice('mobile'),
      ]);
      if (!web && !mobile) {
        alert('미리보기 생성에 실패했습니다.');
        return;
      }
      setPreviewWebUrl(web || '');
      setPreviewMobileUrl(mobile || '');
      setPreviewDisplayDevice(device);
      setIsPreviewing(true);
    } catch (e) {
      console.error(e);
      alert('미리보기 생성 중 오류가 발생했습니다.');
    } finally {
      setIsGeneratingPreview(false);
    }
  };

  // --------------------------------------------------------------------------
  // 확정 저장: 다운로드 + FTP + DB. 각 단계 실패를 사용자에게 알림
  // --------------------------------------------------------------------------
  const handleConfirmSaveAll = async () => {
    setIsSaving(true);

    const errors: string[] = [];
    const timestamp = Date.now();
    const baseName = (title || 'main_visual').replace(/[^\w\-가-힣]/g, '_');

    const toUpload: { key: MainVisualDevice; data: string; filename: string }[] = [];
    if (previewWebUrl) {
      toUpload.push({ key: 'web', data: previewWebUrl, filename: `${baseName}_web_${timestamp}.png` });
    }
    if (previewMobileUrl) {
      toUpload.push({ key: 'mobile', data: previewMobileUrl, filename: `${baseName}_mobile_${timestamp}.png` });
    }

    try {
      // 1) 로컬 다운로드
      for (const item of toUpload) {
        const link = document.createElement('a');
        link.href = item.data;
        link.download = item.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        await new Promise((r) => setTimeout(r, 200));
      }

      // 2) FTP 업로드
      const uploaded: Record<string, string> = {};
      for (const item of toUpload) {
        try {
          const res = await fetch('/api/ftp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageBase64: item.data, filename: item.filename }),
          });
          const json = await res.json();
          if (json.success) {
            uploaded[item.key] = json.imageUrl;
          } else {
            errors.push(`FTP (${item.key}): ${json.message || '업로드 실패'}`);
          }
        } catch (err: any) {
          errors.push(`FTP (${item.key}): ${err?.message || '네트워크 오류'}`);
        }
      }

      // 3) DB 기록
      const payload = {
        title,
        eventType: 'banner',
        sections: [
          {
            type: 'mainVisualPair',
            web: {
              bgColor: state.web.bgColor,
              bgImage: uploaded.web || state.web.bgImage,
              texts: state.web.texts,
              imageUrl: uploaded.web || '',
            },
            mobile: {
              bgColor: state.mobile.bgColor,
              bgImage: uploaded.mobile || state.mobile.bgImage,
              texts: state.mobile.texts,
              imageUrl: uploaded.mobile || '',
            },
          },
        ],
        imageUrl: uploaded.web || uploaded.mobile || '',
      };

      let dbSaved = false;
      try {
        const res = await fetch('/api/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (json.success) {
          dbSaved = true;
        } else {
          errors.push(`DB: ${json.message || '저장 실패'}`);
        }
      } catch (err: any) {
        errors.push(`DB: ${err?.message || '네트워크 오류'}`);
      }

      // 4) 결과 안내
      const urls = Object.entries(uploaded)
        .map(([k, v]) => `${k === 'web' ? '웹' : '모바일'}: ${v}`)
        .join('\n');

      let message = '';
      if (dbSaved && urls) {
        message = '✅ 저장 완료!\n\n';
        message += `다운로드: ${toUpload.length}개\n`;
        message += 'FTP 업로드: 완료\n';
        message += 'DB 기록: 완료\n\n';
        message += '[업로드된 URL]\n' + urls;
        try {
          await navigator.clipboard.writeText(urls);
          message += '\n\n(클립보드에 복사됨)';
        } catch { /* noop */ }
      } else {
        message = '⚠ 일부 단계가 실패했습니다.\n\n';
        if (toUpload.length) message += '다운로드: 완료\n';
        message += `FTP 업로드: ${Object.keys(uploaded).length}/${toUpload.length} 성공\n`;
        message += `DB 기록: ${dbSaved ? '성공' : '실패'}\n\n`;
        if (errors.length) {
          message += '[오류 상세]\n' + errors.join('\n');
        }
      }

      alert(message);

      if (dbSaved) {
        setIsPreviewing(false);
      }
    } catch (e: any) {
      console.error(e);
      alert('저장 중 예기치 못한 오류가 발생했습니다: ' + (e?.message || e));
    } finally {
      setIsSaving(false);
    }
  };

  const size = MAIN_VISUAL_SIZES[device];

  const displayedPreviewUrl = useMemo(
    () => (previewDisplayDevice === 'web' ? previewWebUrl : previewMobileUrl),
    [previewDisplayDevice, previewWebUrl, previewMobileUrl],
  );

  // --------------------------------------------------------------------------
  // 렌더
  // --------------------------------------------------------------------------
  return (
    <div style={{ minHeight: '100vh', background: '#f4f5f7', fontFamily: 'var(--font-sans)' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 24px',
          background: '#fff',
          borderBottom: '1px solid #e5e7eb',
          position: 'sticky',
          top: 0,
          zIndex: 20,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Link
            href="/"
            style={{
              textDecoration: 'none',
              color: '#6b7280',
              fontSize: '13px',
              padding: '6px 12px',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            ← 홈
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: '16px',
              }}
            >
              🎨
            </div>
            <h1 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>메인비주얼 제작기</h1>
          </div>
          <input
            type="text"
            placeholder="배너 제목 (필수)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={{
              width: '280px',
              padding: '8px 12px',
              fontSize: '14px',
              borderRadius: '8px',
              border: '1px solid #e5e7eb',
              outline: 'none',
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={handleQuickDownload}
            disabled={isSaving || isGeneratingPreview}
            style={{
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: 600,
              background: '#fff',
              color: '#374151',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              cursor: isSaving || isGeneratingPreview ? 'not-allowed' : 'pointer',
              opacity: isSaving || isGeneratingPreview ? 0.5 : 1,
            }}
          >
            현재 탭만 다운로드
          </button>
          <button
            onClick={handleOpenPreview}
            disabled={isSaving || isGeneratingPreview}
            style={{
              padding: '8px 20px',
              fontSize: '14px',
              fontWeight: 600,
              background: '#2563eb',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              cursor: isSaving || isGeneratingPreview ? 'not-allowed' : 'pointer',
              opacity: isSaving || isGeneratingPreview ? 0.7 : 1,
            }}
          >
            {isGeneratingPreview ? '미리보기 생성 중...' : '👁 미리보기 후 저장'}
          </button>
        </div>
      </div>

      {/* Device Tabs */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '12px 24px',
          background: '#fff',
          borderBottom: '1px solid #e5e7eb',
        }}
      >
        {(Object.keys(MAIN_VISUAL_SIZES) as MainVisualDevice[]).map((d) => (
          <button
            key={d}
            onClick={() => setDevice(d)}
            style={{
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: 600,
              borderRadius: '8px',
              border: device === d ? '1px solid #2563eb' : '1px solid #e5e7eb',
              background: device === d ? '#eff6ff' : '#fff',
              color: device === d ? '#2563eb' : '#374151',
              cursor: 'pointer',
            }}
          >
            {d === 'web' ? '🖥' : '📱'} {MAIN_VISUAL_SIZES[d].label}
          </button>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: '12px', color: '#6b7280' }}>
          원본 사이즈: {size.width} × {size.height} px
        </span>
      </div>

      {/* Main Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '16px', padding: '20px' }}>
        {/* Canvas */}
        <div style={{ minWidth: 0 }}>
          <MainVisualCanvas
            width={size.width}
            height={size.height}
            bgImage={current.bgImage}
            bgColor={current.bgColor}
            texts={current.texts}
            activeTextId={activeTextId}
            onSelectText={setActiveTextId}
            onUpdateText={handleUpdateText}
            onDeleteText={handleDeleteText}
            captureId={CAPTURE_IDS[device]}
            isPreview={isSaving || isGeneratingPreview}
          />

          <div style={{ marginTop: '10px', fontSize: '12px', color: '#6b7280' }}>
            💡 업로드한 이미지는 캔버스를 꽉 채우도록 자동 배치됩니다. 비율이 안 맞는 경우 일부가 잘릴 수 있어요.
          </div>

          {/* 비활성 탭 원본 사이즈 유지 (캡처 대상) */}
          <div style={{ position: 'fixed', left: -99999, top: 0, pointerEvents: 'none', opacity: 0 }} aria-hidden>
            {(Object.keys(MAIN_VISUAL_SIZES) as MainVisualDevice[])
              .filter((d) => d !== device)
              .map((d) => {
                const s = MAIN_VISUAL_SIZES[d];
                const c: MainVisualCanvasType = state[d];
                return (
                  <div
                    key={d}
                    id={CAPTURE_IDS[d]}
                    style={{
                      width: `${s.width}px`,
                      height: `${s.height}px`,
                      position: 'relative',
                      background: c.bgColor || '#ffffff',
                      overflow: 'hidden',
                    }}
                  >
                    {c.bgImage && (
                      <img
                        src={c.bgImage}
                        alt=""
                        crossOrigin="anonymous"
                        style={{
                          position: 'absolute',
                          inset: 0,
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          objectPosition: 'center',
                        }}
                      />
                    )}
                    {c.texts.map((t) => {
                      const style: React.CSSProperties = {
                        position: 'absolute',
                        left: `${t.position.x}px`,
                        top: `${t.position.y}px`,
                        fontSize: `${t.style.fontSize}px`,
                        color: t.style.color,
                        fontWeight: t.style.fontWeight as any,
                        textAlign: t.style.textAlign,
                        letterSpacing:
                          t.style.letterSpacing !== undefined
                            ? `${t.style.letterSpacing}px`
                            : undefined,
                        lineHeight: t.style.lineHeight ?? 1.2,
                        backgroundColor: t.style.backgroundColor || 'transparent',
                        borderRadius: t.style.isPill ? '999px' : '4px',
                        padding: t.style.isPill ? '10px 28px' : '0',
                        whiteSpace: 'pre-wrap',
                        width:
                          t.style.width === 'auto' || !t.style.width
                            ? 'auto'
                            : `${t.style.width}px`,
                      };
                      return (
                        <div key={t.id} style={style}>
                          {t.text}
                        </div>
                      );
                    })}
                    {/* 날짜 바 */}
                    {c.showDateBar && (() => {
                      const dbTop = Math.round(s.height * 0.671);
                      const dbH   = Math.round(s.height * 0.062);
                      const dbFs  = Math.round(s.height * 0.037);
                      return (
                        <div style={{ position: 'absolute', left: 0, right: 0, top: dbTop, height: dbH, background: 'rgba(176,170,224,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
                          <span style={{ fontFamily: "'Pretendard','Apple SD Gothic Neo',sans-serif", fontSize: dbFs, fontWeight: 500, color: '#222222', whiteSpace: 'nowrap' }}>{c.eventDate}</span>
                        </div>
                      );
                    })()}
                    {/* 이벤트 바로가기 버튼 */}
                    {c.showButton && (() => {
                      const bTop  = Math.round(s.height * 0.780);
                      const bW    = Math.round(s.width  * 0.141);
                      const bH    = Math.round(s.height * 0.074);
                      const bFs   = Math.round(s.height * 0.037);
                      return (
                        <div style={{ position: 'absolute', top: bTop, left: '50%', transform: 'translateX(-50%)', width: bW, height: bH, background: '#111111', borderRadius: bH / 2, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
                          <span style={{ fontFamily: "'Pretendard','Apple SD Gothic Neo',sans-serif", fontSize: bFs, fontWeight: 500, color: '#ffffff', whiteSpace: 'nowrap' }}>{c.buttonLabel} →</span>
                        </div>
                      );
                    })()}
                  </div>
                );
              })}
          </div>
        </div>

        {/* Right Panel */}
        <aside
          style={{
            background: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
            padding: '16px',
            height: 'fit-content',
            position: 'sticky',
            top: '120px',
          }}
        >
          {activeText ? (
            /* ---- 텍스트 편집 패널 ---- */
            <>
              <button
                onClick={() => setActiveTextId(null)}
                style={{
                  width: '100%',
                  padding: '8px',
                  background: '#f3f4f6',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  marginBottom: '12px',
                }}
              >
                ← 설정 패널로
              </button>

              <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 700 }}>✏ 텍스트 편집</h3>

              <label style={fieldLabel}>텍스트</label>
              <textarea
                value={activeText.text}
                onChange={(e) => handleTextContentChange(e.target.value)}
                style={{
                  width: '100%',
                  minHeight: '60px',
                  padding: '8px',
                  fontSize: '13px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  resize: 'vertical',
                  marginBottom: '12px',
                  fontFamily: 'inherit',
                }}
              />

              <label style={fieldLabel}>글자 크기 ({activeText.style.fontSize}px)</label>
              <input
                type="range"
                min={12}
                max={240}
                value={activeText.style.fontSize}
                onChange={(e) => handleTextStyleChange({ fontSize: parseInt(e.target.value) })}
                style={{ width: '100%', marginBottom: '12px' }}
              />

              <label style={fieldLabel}>굵기</label>
              <select
                value={String(activeText.style.fontWeight)}
                onChange={(e) => handleTextStyleChange({ fontWeight: parseInt(e.target.value) })}
                style={{ ...numberInput, marginBottom: '12px' }}
              >
                {[300, 400, 500, 600, 700, 800, 900].map((w) => (
                  <option key={w} value={w}>{w}</option>
                ))}
              </select>

              <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                <div style={{ flex: 1 }}>
                  <label style={fieldLabel}>글자색</label>
                  <input
                    type="color"
                    value={activeText.style.color}
                    onChange={(e) => handleTextStyleChange({ color: e.target.value })}
                    style={{ width: '100%', height: '32px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={fieldLabel}>배경색</label>
                  <input
                    type="color"
                    value={activeText.style.backgroundColor || '#ffffff'}
                    onChange={(e) => handleTextStyleChange({ backgroundColor: e.target.value })}
                    style={{ width: '100%', height: '32px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                  />
                </div>
              </div>

              <button
                onClick={() => handleTextStyleChange({ backgroundColor: 'transparent' })}
                style={{
                  width: '100%',
                  padding: '6px',
                  fontSize: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  background: '#fff',
                  cursor: 'pointer',
                  marginBottom: '12px',
                }}
              >
                배경 투명
              </button>

              <label style={fieldLabel}>정렬</label>
              <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
                {(['left', 'center', 'right'] as const).map((a) => (
                  <button
                    key={a}
                    onClick={() => handleTextStyleChange({ textAlign: a })}
                    style={{
                      flex: 1,
                      padding: '6px',
                      fontSize: '12px',
                      borderRadius: '6px',
                      border: activeText.style.textAlign === a ? '1px solid #2563eb' : '1px solid #d1d5db',
                      background: activeText.style.textAlign === a ? '#eff6ff' : '#fff',
                      cursor: 'pointer',
                    }}
                  >
                    {a === 'left' ? '좌' : a === 'center' ? '중앙' : '우'}
                  </button>
                ))}
              </div>

              <button
                onClick={() => handleDeleteText(activeText.id)}
                style={{
                  width: '100%',
                  padding: '8px',
                  background: '#fff',
                  color: '#ef4444',
                  border: '1px solid #fecaca',
                  borderRadius: '6px',
                  fontSize: '12px',
                  cursor: 'pointer',
                }}
              >
                이 텍스트 삭제
              </button>
            </>
          ) : (
            /* ---- 기본 설정 패널 ---- */
            <>
              <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 700 }}>
                {device === 'web' ? '🖥 웹' : '📱 모바일'} 캔버스 설정
              </h3>



              <div style={{ marginBottom: '16px' }}>
                <label style={fieldLabel}>배경 이미지</label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    width: '100%',
                    height: '120px',
                    border: '2px dashed #d1d5db',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundImage: current.bgImage ? `url(${current.bgImage})` : 'none',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    cursor: 'pointer',
                    color: '#9ca3af',
                    fontSize: '12px',
                  }}
                >
                  {!current.bgImage && '클릭하여 이미지 업로드'}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handleBgUpload}
                />
                <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      flex: 1,
                      padding: '6px',
                      fontSize: '12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      background: '#fff',
                      cursor: 'pointer',
                    }}
                  >
                    {current.bgImage ? '변경' : '업로드'}
                  </button>
                  {current.bgImage && (
                    <button
                      onClick={handleClearImage}
                      style={{
                        flex: 1,
                        padding: '6px',
                        fontSize: '12px',
                        border: '1px solid #fecaca',
                        color: '#ef4444',
                        borderRadius: '6px',
                        background: '#fff',
                        cursor: 'pointer',
                      }}
                    >
                      삭제
                    </button>
                  )}
                </div>
                {current.bgImage && (
                  <p
                    style={{
                      margin: '8px 0 0 0',
                      fontSize: '11px',
                      color: '#9ca3af',
                      lineHeight: 1.4,
                    }}
                  >
                    * 캔버스({size.width}×{size.height})를 꽉 채우도록 비율 맞춰 크롭됩니다.<br />
                    원하는 구도를 얻으려면 업로드 전 이미지를 해당 비율로 잘라주세요.
                  </p>
                )}
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={fieldLabel}>배경 색 (이미지 없을 때)</label>
                <input
                  type="color"
                  value={current.bgColor}
                  onChange={(e) => updateCurrent({ bgColor: e.target.value })}
                  style={{ width: '100%', height: '36px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                />
              </div>

              <hr style={{ border: 'none', borderTop: '1px solid #e5e7eb', margin: '12px 0' }} />

              <button
                onClick={handleAddText}
                style={{
                  width: '100%',
                  padding: '10px',
                  background: '#2563eb',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  marginBottom: '12px',
                }}
              >
                + 텍스트 추가
              </button>

              <div>
                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '6px' }}>
                  텍스트 목록 ({current.texts.length})
                </div>
                {current.texts.length === 0 ? (
                  <div style={{ fontSize: '12px', color: '#9ca3af', padding: '8px 0' }}>
                    추가된 텍스트가 없습니다.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {current.texts.map((t) => (
                      <div
                        key={t.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '8px',
                          border: '1px solid #e5e7eb',
                          borderRadius: '6px',
                          background: '#fafafa',
                        }}
                      >
                        <span
                          style={{
                            flex: 1,
                            fontSize: '12px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {t.text || '(빈 텍스트)'}
                        </span>
                        <button
                          onClick={() => setActiveTextId(t.id)}
                          style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '13px' }}
                        >
                          ✎
                        </button>
                        <button
                          onClick={() => handleDeleteText(t.id)}
                          style={{ border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer', fontSize: '13px' }}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </aside>
      </div>

      {/* 미리보기 모달 */}
      <PreviewModal
        isOpen={isPreviewing}
        imageDataUrl={displayedPreviewUrl}
        title={
          title +
          ' · ' +
          (previewDisplayDevice === 'web'
            ? MAIN_VISUAL_SIZES.web.label
            : MAIN_VISUAL_SIZES.mobile.label)
        }
        onClose={() => {
          if (!isSaving) setIsPreviewing(false);
        }}
        onConfirm={handleConfirmSaveAll}
        confirmLabel="웹+모바일 둘 다 저장"
        isProcessing={isSaving}
      />

      {isPreviewing && (
        <div
          style={{
            position: 'fixed',
            bottom: '100px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#111827',
            color: '#fff',
            padding: '6px',
            borderRadius: '999px',
            zIndex: 1100,
            display: 'flex',
            gap: '4px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
          }}
        >
          {(['web', 'mobile'] as MainVisualDevice[]).map((d) => (
            <button
              key={d}
              onClick={() => setPreviewDisplayDevice(d)}
              style={{
                padding: '6px 14px',
                fontSize: '12px',
                fontWeight: 600,
                borderRadius: '999px',
                border: 'none',
                background: previewDisplayDevice === d ? '#2563eb' : 'transparent',
                color: '#fff',
                cursor: 'pointer',
              }}
            >
              {d === 'web' ? '🖥 웹' : '📱 모바일'}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// 공통 인라인 스타일
// ============================================================================
const fieldLabel: React.CSSProperties = {
  display: 'block',
  fontSize: '12px',
  color: '#6b7280',
  marginBottom: '4px',
};

const numberInput: React.CSSProperties = {
  width: '100%',
  padding: '6px 8px',
  border: '1px solid #d1d5db',
  borderRadius: '6px',
  marginBottom: '8px',
  fontSize: '13px',
  fontFamily: 'inherit',
};

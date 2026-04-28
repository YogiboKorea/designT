'use client';
import React, { useState, useEffect, Suspense, useCallback, useRef } from 'react';
import BuilderSidebar from '../../components/BuilderSidebar';
import PropertiesPanel from '../../components/PropertiesPanel';
import MainVisualBuilder from '../../components/MainVisualBuilder';
import CouponBuilder from '../../components/CouponBuilder';
import ProductDescriptionBuilder from '../../components/ProductDescriptionBuilder';
import PreviewModal from '../../components/PreviewModal';
import { useRouter, useSearchParams } from 'next/navigation';
import html2canvas from 'html2canvas';

import { SectionData, TextItem, StickerItem, createDefaultSection } from './types';
import { useHistory } from '../../hooks/useHistory';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';

function BuilderInterface() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get('id');

  // sections 는 history 추적되는 상태 (Undo/Redo 지원)
  const [sections, setSections, history] = useHistory<SectionData[]>([]);
  const [activeSegmentId, setActiveSegmentId] = useState<string | null>(null);
  const [activeTextId, setActiveTextId] = useState<string | null>(null);
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isFetching, setIsFetching] = useState(!!id);

  // 클립보드 — 복사된 요소 보관 (Ctrl+C/V).
  // 'text' / 'sticker' / 'section' 중 하나
  const clipboardRef = useRef<
    | { kind: 'text'; data: TextItem }
    | { kind: 'sticker'; data: StickerItem }
    | { kind: 'section'; data: SectionData }
    | null
  >(null);

  // 미리보기 모달 관련 상태
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [previewDataUrl, setPreviewDataUrl] = useState<string>('');
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);

  useEffect(() => {
    if (id) {
      setIsFetching(true);
      fetch(`/api/events/${id}`)
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setTitle(data.data.title);
            const loadedSections = data.data.sections.map((sec: any) => {
              if (sec.bgImage !== undefined || sec.title !== undefined || sec.description !== undefined) { return sec; }
              return createDefaultSection(sec.type);
            });
            // load 직후 history 전체 초기화 (Undo 로 빈 상태로 가지 않도록)
            history.reset(loadedSections);
            if (loadedSections.length > 0) setActiveSegmentId(loadedSections[0].id);
          }
        })
        .finally(() => setIsFetching(false));
    }
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAddSection = (type: 'main' | 'coupon' | 'product') => {
    const newSec = createDefaultSection(type);
    setSections([...sections, newSec]);
    setActiveSegmentId(newSec.id);
  };

  const handleUpdateSection = (updatedData: SectionData) => {
    setSections(sections.map(s => s.id === updatedData.id ? updatedData : s));
  };

  const handleMoveUp = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const index = sections.findIndex(s => s.id === id);
    if (index <= 0) return;
    const newSections = [...sections];
    const temp = newSections[index - 1];
    newSections[index - 1] = newSections[index];
    newSections[index] = temp;
    setSections(newSections);
  };

  const handleMoveDown = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const index = sections.findIndex(s => s.id === id);
    if (index >= sections.length - 1 || index < 0) return;
    const newSections = [...sections];
    const temp = newSections[index + 1];
    newSections[index + 1] = newSections[index];
    newSections[index] = temp;
    setSections(newSections);
  };

  const handleDelete = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSections(sections.filter(s => s.id !== id));
    if (activeSegmentId === id) setActiveSegmentId(null);
  };

  // ─────────────────────────────────────────────────────────────────
  //  ⌨️ 키보드 단축키 — Undo/Redo, Delete, Copy/Paste
  //
  //   동작 우선순위 (현재 선택 컨텍스트에 따라):
  //     1) 텍스트가 선택돼 있으면 → 텍스트 단위
  //     2) 그 외 섹션이 선택돼 있으면 → 섹션 단위
  //   (스티커는 자체 활성 상태가 없어서 텍스트와 동일하게 처리하지 않음.
  //    필요시 추후 activeStickerId 추가 가능)
  // ─────────────────────────────────────────────────────────────────

  /** 새로운 ID 생성 (시간 기반) */
  const newId = (suffix: string = '') => `${Date.now()}${suffix}`;

  /** 현재 활성 섹션 데이터 */
  const getActiveSectionData = (): SectionData | undefined =>
    sections.find((s) => s.id === activeSegmentId);

  /** 단축키: 삭제 */
  const handleShortcutDelete = useCallback(() => {
    // 1) 텍스트가 선택돼 있으면 텍스트 삭제
    if (activeTextId && activeSegmentId) {
      setSections(
        sections.map((s) => {
          if (s.id !== activeSegmentId) return s;
          if ('texts' in s && s.texts) {
            return { ...s, texts: s.texts.filter((t) => t.id !== activeTextId) } as SectionData;
          }
          return s;
        }),
      );
      setActiveTextId(null);
      return;
    }
    // 2) 섹션 선택 상태면 섹션 삭제
    if (activeSegmentId) {
      if (confirm('선택한 섹션을 삭제할까요? (Ctrl+Z 로 되돌릴 수 있습니다)')) {
        setSections(sections.filter((s) => s.id !== activeSegmentId));
        setActiveSegmentId(null);
      }
    }
  }, [activeTextId, activeSegmentId, sections, setSections]);

  /** 단축키: 복사 */
  const handleShortcutCopy = useCallback(() => {
    const active = getActiveSectionData();
    if (!active) return;

    // 1) 텍스트가 선택돼 있으면 텍스트 복사
    if (activeTextId && 'texts' in active && active.texts) {
      const text = active.texts.find((t) => t.id === activeTextId);
      if (text) {
        clipboardRef.current = { kind: 'text', data: text };
        return;
      }
    }
    // 2) 그 외 섹션 전체 복사
    clipboardRef.current = { kind: 'section', data: active };
  }, [activeTextId, sections, activeSegmentId]); // eslint-disable-line

  /** 단축키: 붙여넣기 */
  const handleShortcutPaste = useCallback(() => {
    const clip = clipboardRef.current;
    if (!clip) return;

    // 1) 텍스트 붙여넣기 — 활성 섹션 안에 추가
    if (clip.kind === 'text' && activeSegmentId) {
      const newText: TextItem = {
        ...clip.data,
        id: newId('t'),
        position: {
          x: clip.data.position.x + 20,
          y: clip.data.position.y + 20,
        },
      };
      setSections(
        sections.map((s) => {
          if (s.id !== activeSegmentId) return s;
          if ('texts' in s && s.texts) {
            return { ...s, texts: [...s.texts, newText] } as SectionData;
          }
          return s;
        }),
      );
      setActiveTextId(newText.id);
      return;
    }

    // 2) 섹션 붙여넣기 — 활성 섹션 바로 뒤에 추가, ID 새로 발급
    if (clip.kind === 'section') {
      const cloned = cloneSection(clip.data);
      const idx = activeSegmentId
        ? sections.findIndex((s) => s.id === activeSegmentId)
        : sections.length - 1;
      const newSections = [...sections];
      newSections.splice(idx + 1, 0, cloned);
      setSections(newSections);
      setActiveSegmentId(cloned.id);
    }
  }, [activeSegmentId, sections, setSections]);

  /** 단축키: Escape / Enter — 선택 해제
   *   1) 텍스트 선택돼 있으면 → 텍스트 선택만 해제 (섹션 선택은 유지)
   *   2) 아이템(쿠폰/상품) 선택돼 있으면 → 아이템 선택만 해제
   *   3) 그 외 → 섹션 선택도 해제
   */
  const handleShortcutEscape = useCallback(() => {
    if (activeTextId) {
      setActiveTextId(null);
      return;
    }
    if (activeItemId) {
      setActiveItemId(null);
      return;
    }
    if (activeSegmentId) {
      setActiveSegmentId(null);
    }
  }, [activeTextId, activeItemId, activeSegmentId]);

  useKeyboardShortcuts({
    onUndo: history.canUndo ? history.undo : undefined,
    onRedo: history.canRedo ? history.redo : undefined,
    onDelete: handleShortcutDelete,
    onCopy: handleShortcutCopy,
    onPaste: handleShortcutPaste,
    onEscape: handleShortcutEscape,
  });

  /**
   * 캔버스를 base64 JPEG으로 캡처.
   * 미리보기와 최종 저장에서 공통으로 사용.
   */
  const captureCanvas = async (): Promise<string | null> => {
    const oldActive = activeSegmentId;
    setActiveSegmentId(null);
    await new Promise(resolve => setTimeout(resolve, 100));

    try {
      const captureElement = document.getElementById('capture-area');
      if (!captureElement) return null;
      const canvas = await html2canvas(captureElement, {
        useCORS: true,
        scale: 2,
        backgroundColor: '#ffffff',
      });
      return canvas.toDataURL('image/jpeg', 0.9);
    } finally {
      setActiveSegmentId(oldActive);
    }
  };

  /** 미리보기 버튼: 캡처 후 모달 오픈 */
  const handleOpenPreview = async () => {
    if (!title) {
      alert('상단에서 이벤트 페이지 제목을 입력해주세요!');
      return;
    }
    if (sections.length === 0) {
      alert('적어도 하나의 섹션을 추가해주세요.');
      return;
    }

    setIsGeneratingPreview(true);
    try {
      const dataUrl = await captureCanvas();
      if (dataUrl) {
        setPreviewDataUrl(dataUrl);
        setIsPreviewing(true);
      } else {
        alert('미리보기 생성에 실패했습니다.');
      }
    } catch (e) {
      console.error(e);
      alert('미리보기 생성 중 오류가 발생했습니다.');
    } finally {
      setIsGeneratingPreview(false);
    }
  };

  /** 모달에서 "확정" 시: 다운로드 + FTP + DB */
  const handleConfirmSaveAndDownload = async () => {
    if (!previewDataUrl) {
      alert('미리보기 이미지가 없습니다.');
      return;
    }

    setIsSaving(true);
    try {
      const base64Image = previewDataUrl;
      const filename = `event_${Date.now()}.jpg`;

      // 1) 로컬 다운로드
      const link = document.createElement('a');
      link.href = base64Image;
      link.download = `${title || 'event_template'}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // 2) FTP 업로드
      let capturedImageUrl = '';
      const ftpRes = await fetch('/api/ftp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64Image, filename }),
      });
      const ftpData = await ftpRes.json();
      if (ftpData.success) capturedImageUrl = ftpData.imageUrl;

      // 3) DB 기록
      const method = id ? 'PUT' : 'POST';
      const endpoint = id ? `/api/events/${id}` : '/api/events';
      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, sections, imageUrl: capturedImageUrl }),
      });

      if (response.ok) {
        if (capturedImageUrl) {
          try {
            await navigator.clipboard.writeText(capturedImageUrl);
            alert(
              '이벤트 템플릿이 성공적으로 저장되고 다운로드 되었습니다!\n\n' +
              '클립보드에 FTP 이미지 경로가 복사되었습니다. Ctrl+V로 붙여넣기 하실 수 있습니다.\n\n경로: ' +
              capturedImageUrl
            );
          } catch {
            alert('이벤트 템플릿이 성공적으로 저장되고 다운로드 되었습니다!\n\n경로: ' + capturedImageUrl);
          }
        } else {
          alert('이벤트 템플릿이 성공적으로 저장되고 다운로드 되었습니다!');
        }
        setIsPreviewing(false);
        router.push('/');
      } else {
        alert('저장 중 오류가 발생했습니다. DB 연동을 확인해주세요.');
      }
    } catch (e) {
      console.error(e);
      alert('저장 중 서버 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const renderCanvasSection = (section: SectionData) => {
    const previewing = isSaving || isGeneratingPreview;
    switch (section.type) {
      case 'main':
        return <MainVisualBuilder key={section.id} data={section as any} onChange={handleUpdateSection} isPreview={previewing} activeTextId={activeTextId} onSelectText={setActiveTextId} />;
      case 'coupon':
        return <CouponBuilder key={section.id} data={section as any} onChange={handleUpdateSection} isPreview={previewing} activeTextId={activeTextId} onSelectText={setActiveTextId} activeItemId={activeItemId} onActivateItem={(id) => { setActiveSegmentId(section.id); setActiveItemId(id); }} />;
      case 'product':
        return <ProductDescriptionBuilder key={section.id} data={section as any} onChange={handleUpdateSection} isPreview={previewing} activeTextId={activeTextId} onSelectText={setActiveTextId} activeItemId={activeItemId} onActivateItem={(id) => { setActiveSegmentId(section.id); setActiveItemId(id); }} />;
      default:
        return null;
    }
  };

  const activeSection = sections.find(s => s.id === activeSegmentId) || null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', fontFamily: 'var(--font-sans)', background: '#f4f5f7' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', background: '#fff', borderBottom: '1px solid #e5e7eb', zIndex: 10 }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '15px' }}>
          <h1 style={{ fontSize: '16px', margin: 0, fontWeight: 'bold' }}>빌더</h1>
          <input 
            type="text" 
            placeholder="이벤트 제목 (필수)" 
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={{ width: '300px', padding: '6px 12px', fontSize: '14px', borderRadius: '6px', border: '1px solid #e5e7eb', outline: 'none' }}
          />
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {/* Undo / Redo 버튼 */}
          <div style={{ display: 'flex', gap: 4, marginRight: 8 }}>
            <button
              onClick={history.undo}
              disabled={!history.canUndo}
              title="실행 취소 (Ctrl+Z)"
              style={{
                width: 36,
                height: 36,
                padding: 0,
                fontSize: 16,
                background: history.canUndo ? '#fff' : '#f3f4f6',
                color: history.canUndo ? '#374151' : '#9ca3af',
                border: '1px solid #e5e7eb',
                borderRadius: 8,
                cursor: history.canUndo ? 'pointer' : 'not-allowed',
              }}
            >
              ↶
            </button>
            <button
              onClick={history.redo}
              disabled={!history.canRedo}
              title="다시 실행 (Ctrl+Y / Ctrl+Shift+Z)"
              style={{
                width: 36,
                height: 36,
                padding: 0,
                fontSize: 16,
                background: history.canRedo ? '#fff' : '#f3f4f6',
                color: history.canRedo ? '#374151' : '#9ca3af',
                border: '1px solid #e5e7eb',
                borderRadius: 8,
                cursor: history.canRedo ? 'pointer' : 'not-allowed',
              }}
            >
              ↷
            </button>
          </div>

          {/* 단축키 도움말 (호버 시) */}
          <div
            title={
              '단축키:\n' +
              '· Ctrl+Z : 실행 취소\n' +
              '· Ctrl+Y : 다시 실행\n' +
              '· Delete : 선택 요소/섹션 삭제\n' +
              '· Ctrl+C : 복사\n' +
              '· Ctrl+V : 붙여넣기\n' +
              '· Esc / Enter : 선택 해제'
            }
            style={{
              width: 36,
              height: 36,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 14,
              background: '#fff',
              color: '#6b7280',
              border: '1px solid #e5e7eb',
              borderRadius: 8,
              cursor: 'help',
              marginRight: 4,
            }}
          >
            ⌨
          </div>

          <button
            onClick={handleOpenPreview}
            disabled={isGeneratingPreview || isSaving}
            style={{
              padding: '8px 20px',
              fontSize: '14px',
              fontWeight: 600,
              background: '#fff',
              color: '#2563eb',
              border: '1px solid #2563eb',
              borderRadius: '8px',
              cursor: isGeneratingPreview || isSaving ? 'not-allowed' : 'pointer',
              opacity: isGeneratingPreview || isSaving ? 0.5 : 1,
            }}
          >
            {isGeneratingPreview ? '미리보기 생성 중...' : '👁 미리보기 후 저장'}
          </button>
        </div>
      </div>

      {/* 3-Pane CSS Grid Wrapper */}
      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr 380px', flex: 1, overflow: 'hidden' }}>
        
        <BuilderSidebar 
          sections={sections}
          activeSegmentId={activeSegmentId}
          onAddSection={handleAddSection} 
          onSelect={setActiveSegmentId}
          onMoveUp={handleMoveUp}
          onMoveDown={handleMoveDown}
          onDelete={handleDelete}
        />

        <div style={{ overflow: 'auto', padding: '40px', background: '#f4f5f7', display: 'flex', justifyContent: 'center', alignItems: 'flex-start' }} onClick={() => setActiveSegmentId(null)}>
          <div id="capture-area" style={{ width: '800px', background: 'white', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', minHeight: '200px', display: 'flex', flexDirection: 'column' }}>
            {isFetching ? <div style={{ padding: '2rem', textAlign: 'center', color: '#999' }}>로딩 중...</div> : ''}
            {sections.length === 0 && !isFetching && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '200px', color: '#9ca3af', fontSize: '14px' }}>
                영역을 추가하여 시작하세요.
              </div>
            )}
            {sections.map((section) => (
              <div 
                key={section.id} 
                onClick={(e) => { e.stopPropagation(); setActiveSegmentId(section.id); }}
                style={{
                  position: 'relative',
                  outline: activeSegmentId === section.id ? '3px solid #2563eb' : 'none',
                  outlineOffset: '-3px',
                  cursor: 'pointer',
                  transition: 'outline 0.15s'
                }}
              >
                {activeSegmentId === section.id && (
                  <span style={{ position: 'absolute', top: 8, left: 8, background: 'rgba(0,0,0,0.55)', color: 'white', fontSize: '11px', padding: '3px 8px', borderRadius: '4px', zIndex: 50, pointerEvents: 'none' }}>
                    {section.type === 'main' ? '메인 비주얼' : section.type === 'coupon' ? '쿠폰 영역' : '상품 영역'}
                  </span>
                )}
                {renderCanvasSection(section)}
              </div>
            ))}
          </div>
        </div>

        <PropertiesPanel
          activeSection={activeSection}
          onUpdate={handleUpdateSection}
          activeTextId={activeTextId}
          onSelectText={setActiveTextId}
          activeItemId={activeItemId}
          onSelectItem={setActiveItemId}
        />
      </div>

      <PreviewModal
        isOpen={isPreviewing}
        imageDataUrl={previewDataUrl}
        title={title}
        onClose={() => {
          if (!isSaving) {
            setIsPreviewing(false);
            setPreviewDataUrl('');
          }
        }}
        onConfirm={handleConfirmSaveAndDownload}
        isProcessing={isSaving}
      />
    </div>
  );
}

export default function BuilderPage() {
  return (
    <Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center' }}>로딩 중...</div>}>
      <BuilderInterface />
    </Suspense>
  );
}

// ─────────────────────────────────────────────────────────────────
// 섹션 깊은 복사 — 모든 ID 를 새로 발급해서 키 충돌 방지
// 클립보드에서 paste 할 때 사용.
// ─────────────────────────────────────────────────────────────────
function cloneSection(section: SectionData): SectionData {
  const stamp = Date.now().toString();
  const sectionId = `${stamp}s`;

  // 깊은 복제 후 ID 만 갈아끼우기
  const cloned: any = JSON.parse(JSON.stringify(section));
  cloned.id = sectionId;

  if (cloned.texts && Array.isArray(cloned.texts)) {
    cloned.texts = cloned.texts.map((t: any, i: number) => ({ ...t, id: `${stamp}t${i}` }));
  }
  if (cloned.stickers && Array.isArray(cloned.stickers)) {
    cloned.stickers = cloned.stickers.map((s: any, i: number) => ({ ...s, id: `${stamp}st${i}` }));
  }
  if (cloned.coupons && Array.isArray(cloned.coupons)) {
    cloned.coupons = cloned.coupons.map((c: any, i: number) => ({ ...c, id: `${stamp}c${i}` }));
  }
  if (cloned.products && Array.isArray(cloned.products)) {
    cloned.products = cloned.products.map((p: any, i: number) => ({ ...p, id: `${stamp}p${i}` }));
  }

  return cloned as SectionData;
}

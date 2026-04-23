'use client';
import React, { useState, useEffect, Suspense } from 'react';
import BuilderSidebar from '../../components/BuilderSidebar';
import PropertiesPanel from '../../components/PropertiesPanel';
import MainVisualBuilder from '../../components/MainVisualBuilder';
import CouponBuilder from '../../components/CouponBuilder';
import ProductDescriptionBuilder from '../../components/ProductDescriptionBuilder';
import PreviewModal from '../../components/PreviewModal';
import { useRouter, useSearchParams } from 'next/navigation';
import html2canvas from 'html2canvas';

import { SectionData, createDefaultSection } from './types';

function BuilderInterface() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get('id');

  const [sections, setSections] = useState<SectionData[]>([]);
  const [activeSegmentId, setActiveSegmentId] = useState<string | null>(null);
  const [activeTextId, setActiveTextId] = useState<string | null>(null);
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isFetching, setIsFetching] = useState(!!id);

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
            setSections(loadedSections);
            if (loadedSections.length > 0) setActiveSegmentId(loadedSections[0].id);
          }
        })
        .finally(() => setIsFetching(false));
    }
  }, [id]);

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
        <div style={{ display: 'flex', gap: '8px' }}>
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

        <PropertiesPanel activeSection={activeSection} onUpdate={handleUpdateSection} activeTextId={activeTextId} onSelectText={setActiveTextId} activeItemId={activeItemId} onSelectItem={setActiveItemId} />
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

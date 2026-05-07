'use client';

import { CSSProperties, useEffect, useRef, useState } from 'react';

/**
 * 프롬프트 빌더 모달
 * ─────────────────────────────────────────────────────────────────
 * 비주얼 제작기 등에서 "프롬프트로 이미지 생성" 카테고리를 클릭했을 때
 * /prompt-builder 페이지를 모달로 표시.
 *
 * 구현 방식 — iframe:
 *   페이지를 그대로 iframe 으로 호출. 사이드바 없이 나오게 ?embed=1 쿼리 전달.
 *   장점: 기존 빌더 페이지 코드 100% 재사용, 유지보수 단일화
 *   단점: 모달 내부와 외부 데이터 공유는 postMessage 로만 가능
 *
 * 향후 개선 가능:
 *   1. iframe 대신 같은 컴포넌트 직접 렌더 (코드 중복 발생, 동기화 필요)
 *   2. 모달 내부에서 결과 프롬프트를 외부로 전달 (postMessage)
 *
 * 사용:
 *   import PromptBuilderModal from '@/components/PromptBuilderModal';
 *
 *   const [open, setOpen] = useState(false);
 *   <button onClick={() => setOpen(true)}>프롬프트로 이미지 생성</button>
 *   <PromptBuilderModal
 *     open={open}
 *     onClose={() => setOpen(false)}
 *     aspectRatio="1080x1080"
 *     onPromptGenerated={(prompt) => console.log(prompt)}
 *   />
 * ─────────────────────────────────────────────────────────────────
 */

export interface PromptBuilderModalProps {
  open: boolean;
  onClose: () => void;
  /** 모달 진입 시 사이즈 자동 선택 */
  aspectRatio?: string;
  /** 프롬프트 생성 시 콜백 (postMessage 통해 받은 결과) */
  onPromptGenerated?: (prompt: string) => void;
}

export default function PromptBuilderModal({
  open,
  onClose,
  aspectRatio,
  onPromptGenerated,
}: PromptBuilderModalProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeLoaded, setIframeLoaded] = useState(false);

  // 모달 열릴 때 body 스크롤 잠금
  useEffect(() => {
    if (open) {
      const original = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = original;
      };
    }
  }, [open]);

  // ESC 키로 닫기
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // iframe 으로부터 결과 프롬프트 수신 (postMessage)
  useEffect(() => {
    if (!open || !onPromptGenerated) return;
    const onMessage = (e: MessageEvent) => {
      // 같은 origin 만 신뢰
      if (e.origin !== window.location.origin) return;
      const data = e.data;
      if (data?.type === 'prompt-builder:result' && typeof data.prompt === 'string') {
        onPromptGenerated(data.prompt);
      }
      if (data?.type === 'prompt-builder:close') {
        onClose();
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [open, onPromptGenerated, onClose]);

  if (!open) return null;

  // iframe URL — embed=1 로 사이드바/네비게이션 숨김
  const params = new URLSearchParams();
  params.set('embed', '1');
  if (aspectRatio) params.set('aspectRatio', aspectRatio);
  const iframeSrc = `/prompt-builder?${params.toString()}`;

  return (
    <div style={S.overlay} onClick={onClose}>
      <div
        style={S.modal}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* 헤더 */}
        <div style={S.header}>
          <div style={S.headerTitle}>
            🎨 디자인 프롬프트 생성
            {aspectRatio && (
              <span style={S.headerBadge}>{aspectRatio}</span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            style={S.closeBtn}
            aria-label="닫기"
          >
            ✕
          </button>
        </div>

        {/* iframe 본문 */}
        <div style={S.body}>
          {!iframeLoaded && (
            <div style={S.loading}>
              <div style={S.spinner}>⟳</div>
              <div>프롬프트 빌더 불러오는 중...</div>
            </div>
          )}
          <iframe
            ref={iframeRef}
            src={iframeSrc}
            style={{
              ...S.iframe,
              opacity: iframeLoaded ? 1 : 0,
            }}
            onLoad={() => setIframeLoaded(true)}
            title="프롬프트 빌더"
          />
        </div>

        {/* 푸터 안내 */}
        <div style={S.footer}>
          <span style={S.footerText}>
            💡 모달 안에서 프롬프트를 생성한 뒤 복사 버튼을 눌러 사용하세요.
            ESC 또는 외부 영역 클릭으로 닫힙니다.
          </span>
        </div>
      </div>
    </div>
  );
}

const S: Record<string, CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(15, 23, 42, 0.7)',
    backdropFilter: 'blur(2px)',
    zIndex: 200,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modal: {
    background: '#fff',
    borderRadius: 12,
    boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
    width: '95%',
    maxWidth: 1200,
    height: '92vh',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '14px 20px',
    borderBottom: '1px solid #e5e7eb',
    background: '#0f172a',
    color: '#fff',
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  headerBadge: {
    fontSize: 10,
    fontWeight: 600,
    padding: '3px 8px',
    background: '#334155',
    borderRadius: 12,
    color: '#cbd5e1',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 6,
    border: 0,
    background: 'transparent',
    color: '#cbd5e1',
    fontSize: 18,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  body: {
    flex: 1,
    position: 'relative',
    background: '#f9fafb',
    overflow: 'hidden',
  },
  iframe: {
    width: '100%',
    height: '100%',
    border: 0,
    transition: 'opacity 0.2s',
  },
  loading: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    fontSize: 13,
    color: '#64748b',
  },
  spinner: {
    fontSize: 32,
    animation: 'spin 1s linear infinite',
  },

  footer: {
    padding: '10px 20px',
    background: '#f8fafc',
    borderTop: '1px solid #e5e7eb',
  },
  footerText: { fontSize: 11, color: '#64748b' },
};

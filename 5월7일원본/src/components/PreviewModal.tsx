'use client';
import React from 'react';

interface PreviewModalProps {
  isOpen: boolean;
  imageDataUrl: string;
  title?: string;
  onClose: () => void;
  onConfirm: () => void;
  confirmLabel?: string;
  isProcessing?: boolean;
}

/**
 * 캡처된 이미지를 최종 확인용으로 보여주는 모달.
 * - 수정으로 돌아가기 / 확정 후 저장·다운로드 두 가지 분기를 제공
 */
export default function PreviewModal({
  isOpen,
  imageDataUrl,
  title,
  onClose,
  onConfirm,
  confirmLabel = '확정하고 저장/다운로드',
  isProcessing = false,
}: PreviewModalProps) {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={isProcessing ? undefined : onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.75)',
        zIndex: 1000,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '24px',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff',
          borderRadius: '16px',
          boxShadow: '0 24px 48px rgba(0,0,0,0.25)',
          width: '100%',
          maxWidth: '960px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px 24px',
            borderBottom: '1px solid #e5e7eb',
            background: '#f9fafb',
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>
              최종 미리보기
            </h2>
            {title && (
              <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#6b7280' }}>
                {title}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            disabled={isProcessing}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '20px',
              cursor: isProcessing ? 'not-allowed' : 'pointer',
              color: '#6b7280',
              padding: '4px 8px',
              opacity: isProcessing ? 0.4 : 1,
            }}
            aria-label="닫기"
          >
            ✕
          </button>
        </div>

        <div
          style={{
            flex: 1,
            overflow: 'auto',
            padding: '24px',
            background: '#f4f5f7',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'flex-start',
          }}
        >
          {imageDataUrl ? (
            <img
              src={imageDataUrl}
              alt="preview"
              style={{
                maxWidth: '100%',
                height: 'auto',
                boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
                background: '#fff',
              }}
            />
          ) : (
            <div style={{ padding: '40px', color: '#9ca3af' }}>미리보기를 생성하는 중...</div>
          )}
        </div>

        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid #e5e7eb',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '12px',
            background: '#fff',
          }}
        >
          <span style={{ fontSize: '13px', color: '#6b7280' }}>
            이 이미지로 저장 · FTP 업로드 · DB 기록이 진행됩니다.
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={onClose}
              disabled={isProcessing}
              style={{
                padding: '10px 20px',
                fontSize: '14px',
                fontWeight: 600,
                background: '#fff',
                color: '#374151',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                cursor: isProcessing ? 'not-allowed' : 'pointer',
                opacity: isProcessing ? 0.5 : 1,
              }}
            >
              ← 돌아가서 수정
            </button>
            <button
              onClick={onConfirm}
              disabled={isProcessing || !imageDataUrl}
              style={{
                padding: '10px 24px',
                fontSize: '14px',
                fontWeight: 700,
                background: '#2563eb',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                cursor: isProcessing ? 'not-allowed' : 'pointer',
                opacity: isProcessing ? 0.6 : 1,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              {isProcessing ? '처리 중...' : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

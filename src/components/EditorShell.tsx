'use client';

import { CSSProperties, useState } from 'react';
import Link from 'next/link';
import AppShell from './AppShell';
import PromptBuilderModal from './PromptBuilderModal';

/**
 * 비주얼 제작기 셸
 * ─────────────────────────────────────────────────────────────────
 * 자사몰/스마트스토어/SNS 공통으로 사용하는 비주얼 제작기 UI.
 *
 * 구조:
 *   ┌───────────────┬──────────────────────────────────────┐
 *   │ 좌측 도구 카드 │  중앙 캔버스 (placeholder — Phase 4) │
 *   │              │                                      │
 *   │ 🎨 프롬프트로 │  [선택한 사이즈 의 빈 캔버스]        │
 *   │   이미지 생성 │                                      │
 *   │ 🖼️ 이미지 업로드│                                     │
 *   │ ✏️  텍스트 추가 │                                     │
 *   │ 🎴  배경 변경  │                                     │
 *   │ 💾  저장      │                                     │
 *   └───────────────┴──────────────────────────────────────┘
 *
 * "🎨 프롬프트로 이미지 생성" 클릭 → PromptBuilderModal 표시
 *   → 모달 안에서 프롬프트 생성 → 결과를 외부 도구로 활용
 *   → (Phase 4 에서) 결과 이미지를 캔버스에 자동 배치
 *
 * 풀 캔버스 에디터 (drag/drop, 텍스트 편집, export) 는
 * 별도 거대한 작업이라 여기서는 진입점 + 모달 통합까지만 담당.
 * 기존 main-visual 페이지와 점진 통합 예정.
 * ─────────────────────────────────────────────────────────────────
 */

export interface EditorTool {
  key: string;
  emoji: string;
  label: string;
  description: string;
  /** 클릭 시 동작: 'prompt-modal' | 'upload' | 'text' | 'external' | 'soon' */
  action: 'prompt-modal' | 'upload' | 'text' | 'external' | 'soon';
  /** action='external' 일 때 이동할 URL */
  externalUrl?: string;
}

const DEFAULT_TOOLS: EditorTool[] = [
  {
    key: 'prompt',
    emoji: '🎨',
    label: '프롬프트로 이미지 생성',
    description: 'AI 도구용 정교한 프롬프트를 모달에서 만들고 ChatGPT 등에 사용',
    action: 'prompt-modal',
  },
  {
    key: 'upload',
    emoji: '🖼️',
    label: '이미지 업로드',
    description: 'PC에서 이미지를 가져와 캔버스에 배치',
    action: 'soon',
  },
  {
    key: 'text',
    emoji: '✏️',
    label: '텍스트 추가',
    description: '제목/본문/CTA 버튼 등 텍스트 요소',
    action: 'soon',
  },
  {
    key: 'background',
    emoji: '🎴',
    label: '배경 변경',
    description: '단색 / 그라디언트 / 이미지 배경',
    action: 'soon',
  },
  {
    key: 'save',
    emoji: '💾',
    label: '저장 / 내보내기',
    description: 'PNG / JPG 로 저장, 자사몰 업로드',
    action: 'soon',
  },
];

export interface EditorShellProps {
  emoji: string;
  title: string;
  breadcrumbLabel: string;
  /** 사이즈 (예: '1920x680') */
  aspectRatio: string;
  width: number;
  height: number; // 0 = 가변
  designCodeLabel?: string;
  /** 빌더 페이지로 돌아가는 URL (예: '/banner/cafe24') */
  backUrl: string;
}

export default function EditorShell({
  emoji,
  title,
  breadcrumbLabel,
  aspectRatio,
  width,
  height,
  designCodeLabel,
  backUrl,
}: EditorShellProps) {
  const [promptModalOpen, setPromptModalOpen] = useState(false);
  const [generatedPrompt, setGeneratedPrompt] = useState<string>('');

  const handleToolClick = (tool: EditorTool) => {
    if (tool.action === 'prompt-modal') {
      setPromptModalOpen(true);
    } else if (tool.action === 'soon') {
      // Phase 4 안내
      alert('이 기능은 다음 단계에서 구현됩니다.');
    }
  };

  // 캔버스 표시 비율 계산 (큰 사이즈는 축소)
  const displayMaxWidth = 800;
  const ratioH = height === 0 ? width * 0.6 : height; // 가변은 600 정도로 가정
  const scale = Math.min(displayMaxWidth / width, 1);
  const canvasW = width * scale;
  const canvasH = ratioH * scale;

  return (
    <AppShell>
      <div style={S.container}>
        {/* 헤더 */}
        <header style={S.header}>
          <div style={S.crumb}>
            <Link href="/" style={S.crumbLink}>홈</Link>
            <span style={S.crumbSep}>/</span>
            <Link href={backUrl} style={S.crumbLink}>배너 빌더</Link>
            <span style={S.crumbSep}>/</span>
            <span style={S.crumbActive}>{breadcrumbLabel} 제작기</span>
          </div>
          <div style={S.titleRow}>
            <h1 style={S.title}>
              <span style={S.titleEmoji}>{emoji}</span>
              {title} — 비주얼 제작기
            </h1>
            <span style={S.sizeBadge}>
              {width}×{height === 0 ? '가변' : height}
            </span>
            {designCodeLabel && (
              <span style={S.codeBadge}>{designCodeLabel}</span>
            )}
          </div>
        </header>

        {/* 본문 — 좌측 도구 + 우측 캔버스 */}
        <div style={S.workspace}>
          {/* 좌측: 도구 카드 */}
          <aside style={S.toolPanel}>
            <h3 style={S.toolPanelTitle}>🛠 제작 도구</h3>
            <div style={S.toolList}>
              {DEFAULT_TOOLS.filter((tool) => tool.action !== 'soon').map((tool) => (
                <button
                  key={tool.key}
                  type="button"
                  onClick={() => handleToolClick(tool)}
                  style={{
                    ...S.toolCard,
                    ...(tool.action === 'prompt-modal' ? S.toolCardPrimary : {}),
                  }}
                >
                  <div style={S.toolEmoji}>{tool.emoji}</div>
                  <div style={S.toolLabel}>{tool.label}</div>
                  <div style={S.toolDesc}>{tool.description}</div>
                  {tool.action === 'prompt-modal' && (
                    <div style={S.toolBadge}>⭐ 추천</div>
                  )}
                </button>
              ))}
            </div>

            {generatedPrompt && (
              <div style={S.lastPromptBox}>
                <div style={S.lastPromptTitle}>🎉 마지막 생성 프롬프트</div>
                <div style={S.lastPromptText}>
                  {generatedPrompt.slice(0, 100)}
                  {generatedPrompt.length > 100 && '...'}
                </div>
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(generatedPrompt)}
                  style={S.copyBtn}
                >
                  📋 전체 복사
                </button>
              </div>
            )}
          </aside>

          {/* 우측: 캔버스 영역 */}
          <main style={S.canvasArea}>
            <div style={S.canvasMeta}>
              사이즈: {width}×{height === 0 ? '가변' : height} px
              {height !== 0 && ` (표시 ${Math.round(canvasW)}×${Math.round(canvasH)})`}
            </div>
            <div
              style={{
                ...S.canvas,
                width: canvasW,
                height: canvasH,
              }}
            >
              <div style={S.canvasPlaceholder}>
                <div style={S.canvasEmoji}>🎨</div>
                <div style={S.canvasMsg}>
                  좌측 도구를 사용해 캔버스를 채워보세요.
                </div>
                <div style={S.canvasHint}>
                  "🎨 프롬프트로 이미지 생성" 으로 시작 →
                </div>
              </div>
            </div>
            <div style={S.canvasFooter}>
              💡 풀 캔버스 에디터 (이미지 합성 / 텍스트 편집 / export) 는 다음 단계에서 구현됩니다.
              지금은 프롬프트 생성에 집중하세요.
            </div>
          </main>
        </div>

        {/* 프롬프트 빌더 모달 */}
        <PromptBuilderModal
          open={promptModalOpen}
          onClose={() => setPromptModalOpen(false)}
          aspectRatio={aspectRatio}
          onPromptGenerated={(p) => {
            setGeneratedPrompt(p);
            // 모달은 자동으로 닫지 않음 — 사용자가 직접 복사 후 닫게 함
          }}
        />
      </div>
    </AppShell>
  );
}

const S: Record<string, CSSProperties> = {
  container: { padding: '20px 28px', maxWidth: 1400, margin: '0 auto' },
  header: { marginBottom: 18 },
  crumb: { fontSize: 12, color: '#94a3b8', marginBottom: 8, display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' },
  crumbLink: { color: '#64748b', textDecoration: 'none' },
  crumbSep: { color: '#cbd5e1' },
  crumbActive: { color: '#0f172a', fontWeight: 600 },

  titleRow: { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  title: { fontSize: 20, fontWeight: 800, margin: 0, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 },
  titleEmoji: { fontSize: 24 },
  sizeBadge: { fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 12, background: '#0f172a', color: '#fff', fontFamily: 'SF Mono, Monaco, monospace' },
  codeBadge: { fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 12, background: '#fef3c7', color: '#92400e' },

  workspace: {
    display: 'grid',
    gridTemplateColumns: '280px 1fr',
    gap: 16,
    alignItems: 'start',
  },

  // 좌측 도구 패널
  toolPanel: {
    background: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: 10,
    padding: 14,
    position: 'sticky',
    top: 20,
  },
  toolPanelTitle: { fontSize: 12, fontWeight: 700, color: '#475569', margin: '0 0 10px' },
  toolList: { display: 'flex', flexDirection: 'column', gap: 8 },
  toolCard: {
    position: 'relative',
    padding: '12px 12px',
    border: '1px solid #e5e7eb',
    borderRadius: 8,
    background: '#fff',
    textAlign: 'left',
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  toolCardPrimary: {
    background: '#fef3c7',
    borderColor: '#fbbf24',
  },
  toolCardDisabled: { opacity: 0.55, cursor: 'not-allowed' },
  toolEmoji: { fontSize: 22, marginBottom: 4 },
  toolLabel: { fontSize: 12, fontWeight: 700, marginBottom: 3, color: '#0f172a' },
  toolDesc: { fontSize: 11, color: '#64748b', lineHeight: 1.4 },
  toolBadge: { position: 'absolute', top: 8, right: 8, fontSize: 9, fontWeight: 700, padding: '2px 6px', background: '#92400e', color: '#fff', borderRadius: 8 },
  toolBadgeMuted: { position: 'absolute', top: 8, right: 8, fontSize: 9, fontWeight: 700, padding: '2px 6px', background: '#e2e8f0', color: '#94a3b8', borderRadius: 8 },

  lastPromptBox: { marginTop: 14, padding: 10, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6 },
  lastPromptTitle: { fontSize: 11, fontWeight: 700, color: '#15803d', marginBottom: 4 },
  lastPromptText: { fontSize: 10, color: '#166534', lineHeight: 1.4, marginBottom: 6, fontFamily: 'SF Mono, Monaco, monospace' },
  copyBtn: { width: '100%', padding: '5px 8px', fontSize: 10, background: '#fff', border: '1px solid #bbf7d0', borderRadius: 4, color: '#15803d', fontWeight: 600, cursor: 'pointer' },

  // 우측 캔버스
  canvasArea: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 20, minHeight: 400 },
  canvasMeta: { fontSize: 11, color: '#94a3b8', marginBottom: 10, fontFamily: 'SF Mono, Monaco, monospace' },
  canvas: {
    background: '#f8fafc',
    border: '2px dashed #cbd5e1',
    borderRadius: 8,
    margin: '0 auto',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  canvasPlaceholder: { textAlign: 'center', color: '#94a3b8' },
  canvasEmoji: { fontSize: 40, marginBottom: 10 },
  canvasMsg: { fontSize: 13, color: '#64748b', marginBottom: 4 },
  canvasHint: { fontSize: 11, color: '#94a3b8' },
  canvasFooter: { marginTop: 12, padding: 10, background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 6, fontSize: 11, color: '#1e3a8a' },
};

'use client';

import { CSSProperties, useState } from 'react';
import Link from 'next/link';
import AppShell from './AppShell';

/**
 * 배너 빌더 공통 셸
 * ─────────────────────────────────────────────────────────────────
 * 자사몰 / 스마트스토어 / SNS 배너 페이지가 공유하는 UI.
 *
 * 각 페이지는 다음 prop 만 다르게 넘기면 됨:
 *   - title, emoji, subtitle, breadcrumb
 *   - sizes: 해당 플랫폼의 사이즈 목록
 *
 * 동작:
 *   1. 사이즈 선택 그리드 (해당 플랫폼만)
 *   2. 선택된 사이즈의 디자인 코드 / 매칭 카테고리 표시
 *   3. "🎨 프롬프트 빌더로" 버튼 → /prompt-builder?aspectRatio=...&from=...
 *      (URL 쿼리로 사이즈 자동 선택 — Phase 3 에서 모달로 변경 예정)
 *   4. 비주얼 제작기 진입 (별도 페이지 — main-visual 등 기존 빌더가 있으면 연결)
 *
 * Phase 3 (v4.6) 에서 변경 예정:
 *   - "프롬프트로 이미지 생성" 카테고리가 모달로 변경
 *   - 모달 닫기 후 결과를 제작기에 전달
 * ─────────────────────────────────────────────────────────────────
 */

export interface BannerSize {
  value: string;
  label: string;
  width: number;
  height: number; // 0 = 가변
  designCodeKey: string;
  designCodeLabel: string;
  referenceCategory: string;
  description?: string;
  /** 외부 비주얼 제작기 URL (있으면 "비주얼 제작기" 버튼 표시) */
  visualEditorUrl?: string;
}

export interface BannerBuilderShellProps {
  emoji: string;
  title: string;
  subtitle: string;
  breadcrumbLabel: string;
  sizes: BannerSize[];
  platformBadge?: string;
  /**
   * 비주얼 제작기 base 경로 (예: '/editor/cafe24').
   * 사이즈 선택 시 자동으로 `${editorBasePath}?size=${size.value}` 로 연결.
   * 없으면 "준비 중" 표시.
   */
  editorBasePath?: string;
}

export default function BannerBuilderShell({
  emoji,
  title,
  subtitle,
  breadcrumbLabel,
  sizes,
  platformBadge,
  editorBasePath,
}: BannerBuilderShellProps) {
  const [selectedSize, setSelectedSize] = useState<string>(sizes[0]?.value ?? '');
  const selectedMeta = sizes.find((s) => s.value === selectedSize);

  return (
    <AppShell>
      <div style={S.container}>
        {/* 헤더 */}
        <header style={S.header}>
          <div style={S.crumb}>
            <Link href="/" style={S.crumbLink}>홈</Link>
            <span style={S.crumbSep}>/</span>
            <span>배너 생성</span>
            <span style={S.crumbSep}>/</span>
            <span style={S.crumbActive}>{breadcrumbLabel}</span>
          </div>
          <div style={S.titleRow}>
            <h1 style={S.title}>
              <span style={S.titleEmoji}>{emoji}</span>
              {title}
            </h1>
            {platformBadge && (
              <span style={S.platformBadge}>{platformBadge}</span>
            )}
          </div>
          <p style={S.subtitle}>{subtitle}</p>
        </header>

        {/* Step 1: 사이즈 선택 */}
        <section style={S.section}>
          <h2 style={S.h2}>① 사이즈 선택</h2>
          <div style={S.sizeGrid}>
            {sizes.map((s) => {
              const isSelected = s.value === selectedSize;
              return (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setSelectedSize(s.value)}
                  style={{
                    ...S.sizeCard,
                    ...(isSelected ? S.sizeCardActive : {}),
                  }}
                >
                  {isSelected && <div style={S.sizeBadge}>✓</div>}
                  <div style={S.sizeLabel}>{s.label}</div>
                  <div style={S.sizeDim}>
                    {s.width}{s.height === 0 ? '×가변' : `×${s.height}`} px
                  </div>
                  {s.description && (
                    <div style={S.sizeDesc}>{s.description}</div>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        {/* Step 2: 선택된 사이즈 정보 */}
        {selectedMeta && (
          <section style={S.section}>
            <h2 style={S.h2}>② 디자인 정보</h2>
            <div style={S.infoGrid}>
              <div style={S.infoCard}>
                <div style={S.infoLabel}>📐 사이즈</div>
                <div style={S.infoValue}>
                  {selectedMeta.width}×
                  {selectedMeta.height === 0 ? '가변' : selectedMeta.height} px
                </div>
              </div>
              <div style={S.infoCard}>
                <div style={S.infoLabel}>🎨 디자인 코드</div>
                <div style={S.infoValue}>{selectedMeta.designCodeLabel}</div>
              </div>
              <div style={S.infoCard}>
                <div style={S.infoLabel}>📚 매칭 레퍼런스</div>
                <div style={S.infoValue}>
                  {categoryLabel(selectedMeta.referenceCategory)}
                </div>
              </div>
            </div>

            <div style={S.hint}>
              💡 빌더 진입 시 이 사이즈에 맞는 디자인 코드와 매칭 카테고리 레퍼런스가 자동 적용됩니다.
            </div>
          </section>
        )}

        {/* Step 3: 액션 */}
        {selectedMeta && (
          <section style={S.section}>
            <h2 style={S.h2}>③ 작업 시작</h2>

            <div style={S.actionGrid}>
              {/* 프롬프트 빌더로 (URL 쿼리로 사이즈 전달) */}
              <Link
                href={`/prompt-builder?aspectRatio=${encodeURIComponent(selectedMeta.value)}`}
                style={S.actionCard}
              >
                <div style={S.actionEmoji}>🎨</div>
                <div style={S.actionTitle}>AI 프롬프트로 시작</div>
                <div style={S.actionDesc}>
                  캠페인 정보 + 디자인 코드 적용된 정교한 프롬프트 자동 생성.
                  ChatGPT / Midjourney / fal.ai 에 바로 사용.
                </div>
                <div style={S.actionTag}>⭐ 추천</div>
              </Link>

              {/* 비주얼 제작기 — editorBasePath 가 있으면 자동 연결 */}
              {(() => {
                const editorUrl = selectedMeta.visualEditorUrl
                  ?? (editorBasePath
                    ? `${editorBasePath}?size=${encodeURIComponent(selectedMeta.value)}`
                    : null);

                if (editorUrl) {
                  return (
                    <Link
                      href={editorUrl}
                      style={S.actionCard}
                    >
                      <div style={S.actionEmoji}>🖌️</div>
                      <div style={S.actionTitle}>비주얼 제작기</div>
                      <div style={S.actionDesc}>
                        캔버스 에디터 진입. 좌측 도구에서 "프롬프트로 이미지 생성" 모달 사용 가능.
                      </div>
                      <div style={S.actionTagNew}>v4.6 신규</div>
                    </Link>
                  );
                }

                return (
                  <div style={{ ...S.actionCard, ...S.actionCardDisabled }}>
                    <div style={S.actionEmoji}>🖌️</div>
                    <div style={S.actionTitle}>비주얼 제작기</div>
                    <div style={S.actionDesc}>
                      준비 중입니다.
                    </div>
                    <div style={S.actionTagMuted}>준비 중</div>
                  </div>
                );
              })()}
            </div>
          </section>
        )}
      </div>
    </AppShell>
  );
}

function categoryLabel(category: string): string {
  const map: Record<string, string> = {
    'web-banner': '🖥️ 웹 배너',
    'sns': '📷 SNS',
    'sns-story': '📱 SNS 세로 (스토리/릴스)',
    'mobile': '📱 모바일',
    'thumbnail': '🖼️ 썸네일',
  };
  return map[category] || category;
}

const S: Record<string, CSSProperties> = {
  container: { maxWidth: 1100, margin: '0 auto', padding: '28px 28px' },
  header: { marginBottom: 24 },
  crumb: { fontSize: 12, color: '#94a3b8', marginBottom: 8, display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' },
  crumbLink: { color: '#64748b', textDecoration: 'none' },
  crumbSep: { color: '#cbd5e1' },
  crumbActive: { color: '#0f172a', fontWeight: 600 },
  titleRow: { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  title: { fontSize: 22, fontWeight: 800, margin: 0, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 },
  titleEmoji: { fontSize: 26 },
  platformBadge: {
    fontSize: 11,
    fontWeight: 700,
    padding: '4px 10px',
    borderRadius: 12,
    background: '#0f172a',
    color: '#fff',
  },
  subtitle: { fontSize: 13, color: '#64748b', marginTop: 6, lineHeight: 1.6 },

  section: {
    background: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  h2: { fontSize: 15, fontWeight: 700, margin: '0 0 14px', color: '#0f172a' },

  sizeGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
    gap: 10,
  },
  sizeCard: {
    position: 'relative',
    padding: '12px 14px',
    border: '2px solid #e5e7eb',
    borderRadius: 10,
    background: '#fff',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'all 0.15s',
  },
  sizeCardActive: {
    borderColor: '#dc2626',
    borderWidth: 3,
    background: '#fef2f2',
    boxShadow: '0 0 0 4px rgba(220, 38, 38, 0.12)',
  },
  sizeBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 22,
    height: 22,
    borderRadius: '50%',
    background: '#dc2626',
    color: '#fff',
    fontSize: 12,
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sizeLabel: { fontSize: 13, fontWeight: 700, marginBottom: 4 },
  sizeDim: { fontSize: 12, color: '#7c3aed', fontFamily: 'SF Mono, Monaco, monospace', marginBottom: 4 },
  sizeDesc: { fontSize: 11, color: '#6b7280', lineHeight: 1.4 },

  infoGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, marginBottom: 12 },
  infoCard: { padding: 12, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8 },
  infoLabel: { fontSize: 10, fontWeight: 600, color: '#64748b', marginBottom: 4 },
  infoValue: { fontSize: 13, fontWeight: 700, color: '#0f172a' },
  hint: { padding: '10px 12px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 6, fontSize: 12, color: '#1e3a8a' },

  actionGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: 12,
  },
  actionCard: {
    position: 'relative',
    display: 'block',
    padding: 18,
    border: '2px solid #e5e7eb',
    borderRadius: 10,
    background: '#fff',
    textDecoration: 'none',
    color: 'inherit',
    transition: 'all 0.15s',
    cursor: 'pointer',
  },
  actionCardDisabled: { opacity: 0.6, cursor: 'not-allowed', pointerEvents: 'none' },
  actionEmoji: { fontSize: 28, marginBottom: 8 },
  actionTitle: { fontSize: 14, fontWeight: 700, marginBottom: 6, color: '#0f172a' },
  actionDesc: { fontSize: 12, color: '#64748b', lineHeight: 1.5 },
  actionTag: {
    position: 'absolute',
    top: 12,
    right: 12,
    fontSize: 10,
    fontWeight: 700,
    padding: '3px 8px',
    borderRadius: 12,
    background: '#fef3c7',
    color: '#92400e',
  },
  actionTagMuted: {
    position: 'absolute',
    top: 12,
    right: 12,
    fontSize: 10,
    fontWeight: 700,
    padding: '3px 8px',
    borderRadius: 12,
    background: '#f1f5f9',
    color: '#94a3b8',
  },
  actionTagNew: {
    position: 'absolute',
    top: 12,
    right: 12,
    fontSize: 10,
    fontWeight: 700,
    padding: '3px 8px',
    borderRadius: 12,
    background: '#dbeafe',
    color: '#1e40af',
  },
};

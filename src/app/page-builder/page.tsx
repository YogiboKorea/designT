'use client';

import { CSSProperties, useState } from 'react';
import Link from 'next/link';
import AppShell from '@/components/AppShell';
import PromptBuilderModal from '@/components/PromptBuilderModal';

/**
 * 페이지 개발 — 이벤트/상세 페이지 빌더
 * ─────────────────────────────────────────────────────────────────
 * 긴 세로 페이지 (자사몰 800×가변, 스마트스토어 860×가변) 빌더.
 *
 * 구조:
 *   - 섹션 목록 (히어로 / 컨텐츠 / 갤러리 / FAQ / CTA 등)
 *   - 각 섹션마다 "🎨 프롬프트로 이미지 생성" 버튼
 *      → 그 섹션 사이즈에 맞는 프롬프트 빌더 모달
 *
 * 풀 페이지 빌더 (실제 섹션 합성, 미리보기, export) 는 별도 작업.
 * 여기서는 섹션 구조 + 프롬프트 모달 통합까지.
 * ─────────────────────────────────────────────────────────────────
 */

interface PageSection {
  id: string;
  emoji: string;
  type: string;
  description: string;
  /** 섹션 사이즈 (자사몰 기준) */
  width: number;
  height: number;
  designCodeLabel: string;
  aspectRatio: string;
}

const DEFAULT_SECTIONS: PageSection[] = [
  {
    id: 'hero',
    emoji: '🎯',
    type: '히어로 섹션',
    description: '페이지 최상단 메인 비주얼 — 큰 카피 + 메인 이미지',
    width: 800,
    height: 600,
    designCodeLabel: '모바일 히어로',
    aspectRatio: '800x907', // 자사몰 모바일 메인 사이즈에 맵핑
  },
  {
    id: 'feature',
    emoji: '⭐',
    type: '특징 소개',
    description: '제품 특징/장점 3~5개 카드 형태',
    width: 800,
    height: 800,
    designCodeLabel: '모바일 롱 페이지',
    aspectRatio: '800x-',
  },
  {
    id: 'gallery',
    emoji: '🖼️',
    type: '제품 갤러리',
    description: '제품 사진 그리드 (2~4장)',
    width: 800,
    height: 600,
    designCodeLabel: '모바일 롱 페이지',
    aspectRatio: '800x-',
  },
  {
    id: 'lifestyle',
    emoji: '🛋️',
    type: '라이프스타일',
    description: '실사용 모델/씬 — 톤앤매너 강조',
    width: 800,
    height: 700,
    designCodeLabel: '모바일 롱 페이지',
    aspectRatio: '800x-',
  },
  {
    id: 'cta',
    emoji: '🛒',
    type: 'CTA 섹션',
    description: '구매 유도 — 큰 버튼 + 행동 카피',
    width: 800,
    height: 400,
    designCodeLabel: '모바일 롱 페이지',
    aspectRatio: '800x-',
  },
];

export default function PageBuilderPage() {
  const [activeSection, setActiveSection] = useState<PageSection | null>(null);

  return (
    <AppShell>
      <div style={S.container}>
        <header style={S.header}>
          <div style={S.crumb}>
            <Link href="/" style={S.crumbLink}>홈</Link>
            <span style={S.crumbSep}>/</span>
            <span style={S.crumbActive}>페이지 개발</span>
          </div>
          <h1 style={S.title}>📄 페이지 개발</h1>
          <p style={S.subtitle}>
            긴 세로 이벤트/상세 페이지 빌더. 각 섹션마다 디자인 프롬프트 모달을 호출해 이미지를 생성합니다.
          </p>
        </header>

        <section style={S.section}>
          <h2 style={S.h2}>📋 페이지 섹션 구조</h2>
          <p style={S.sectionDesc}>
            아래 섹션 카드를 클릭하면 해당 섹션 사이즈에 맞는 프롬프트 빌더가 모달로 열립니다.
            각 섹션의 이미지를 따로 생성한 뒤 페이지로 합치는 워크플로입니다.
          </p>

          <div style={S.sectionList}>
            {DEFAULT_SECTIONS.map((sec, idx) => (
              <div key={sec.id} style={S.sectionCard}>
                <div style={S.sectionLeft}>
                  <div style={S.sectionNum}>{idx + 1}</div>
                </div>

                <div style={S.sectionMid}>
                  <div style={S.sectionTitleRow}>
                    <span style={S.sectionEmoji}>{sec.emoji}</span>
                    <h3 style={S.sectionType}>{sec.type}</h3>
                  </div>
                  <div style={S.sectionMeta}>
                    📐 {sec.width}×{sec.height === 0 ? '가변' : sec.height} px
                    {' · '}
                    🎨 {sec.designCodeLabel}
                  </div>
                  <div style={S.sectionDescription}>{sec.description}</div>
                </div>

                <div style={S.sectionRight}>
                  <button
                    type="button"
                    onClick={() => setActiveSection(sec)}
                    style={S.sectionBtn}
                  >
                    🎨 프롬프트 생성
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <div style={S.notice}>
          <div style={S.noticeTitle}>📌 페이지 빌더 사용 흐름</div>
          <ol style={S.noticeList}>
            <li>각 섹션 카드 → "🎨 프롬프트 생성" 클릭</li>
            <li>모달 안에서 그 섹션에 맞는 캠페인 정보 입력 + 프롬프트 생성</li>
            <li>생성된 프롬프트를 ChatGPT/Midjourney 등에 사용해 이미지 받기</li>
            <li>생성된 이미지를 자사몰/스마트스토어 페이지에 합성</li>
          </ol>
          <div style={S.noticeFooter}>
            💡 풀 페이지 합성 (자동 결합 + export) 는 향후 단계에서 구현 예정.
            지금은 섹션별로 프롬프트만 빠르게 생성할 수 있습니다.
          </div>
        </div>

        {/* 섹션별 프롬프트 모달 */}
        <PromptBuilderModal
          open={activeSection !== null}
          onClose={() => setActiveSection(null)}
          aspectRatio={activeSection?.aspectRatio}
        />
      </div>
    </AppShell>
  );
}

const S: Record<string, CSSProperties> = {
  container: { maxWidth: 1100, margin: '0 auto', padding: '28px 28px' },
  header: { marginBottom: 20 },
  crumb: { fontSize: 12, color: '#94a3b8', marginBottom: 8, display: 'flex', gap: 6, alignItems: 'center' },
  crumbLink: { color: '#64748b', textDecoration: 'none' },
  crumbSep: { color: '#cbd5e1' },
  crumbActive: { color: '#0f172a', fontWeight: 600 },
  title: { fontSize: 22, fontWeight: 800, margin: 0, color: '#0f172a' },
  subtitle: { fontSize: 13, color: '#64748b', marginTop: 6, lineHeight: 1.6 },

  section: {
    background: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  h2: { fontSize: 15, fontWeight: 700, margin: '0 0 8px', color: '#0f172a' },
  sectionDesc: { fontSize: 12, color: '#64748b', lineHeight: 1.6, marginBottom: 16 },

  sectionList: { display: 'flex', flexDirection: 'column', gap: 10 },
  sectionCard: {
    display: 'grid',
    gridTemplateColumns: 'auto 1fr auto',
    gap: 14,
    alignItems: 'center',
    padding: '12px 14px',
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: 8,
  },
  sectionLeft: {
    width: 32,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionNum: {
    width: 28,
    height: 28,
    borderRadius: '50%',
    background: '#0f172a',
    color: '#fff',
    fontSize: 12,
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionMid: { minWidth: 0 },
  sectionTitleRow: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 },
  sectionEmoji: { fontSize: 18 },
  sectionType: { fontSize: 14, fontWeight: 700, margin: 0, color: '#0f172a' },
  sectionMeta: { fontSize: 11, color: '#7c3aed', fontFamily: 'SF Mono, Monaco, monospace', marginBottom: 3 },
  sectionDescription: { fontSize: 12, color: '#64748b', lineHeight: 1.5 },

  sectionRight: { flexShrink: 0 },
  sectionBtn: {
    padding: '8px 14px',
    background: '#0f172a',
    color: '#fff',
    border: 0,
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },

  notice: {
    padding: 16,
    background: '#eff6ff',
    border: '1px solid #bfdbfe',
    borderRadius: 10,
  },
  noticeTitle: { fontSize: 13, fontWeight: 700, color: '#1e40af', marginBottom: 8 },
  noticeList: { fontSize: 12, color: '#1e3a8a', lineHeight: 1.8, margin: '0 0 10px', paddingLeft: 20 },
  noticeFooter: { fontSize: 11, color: '#475569', borderTop: '1px solid #bfdbfe', paddingTop: 8 },
};

'use client';

import { CSSProperties } from 'react';
import Link from 'next/link';
import AppShell from '@/components/AppShell';

interface ShortcutCard {
  href: string;
  emoji: string;
  title: string;
  description: string;
  badge?: string;
}

const SHORTCUTS: ShortcutCard[] = [
  // /prompt-builder(GPT용 프롬프트)와 /products(제품 등록)는 메뉴에서 숨김.
  // 제품 정보는 youtube 프로젝트 products.json 을 기준으로 쓰고 있어 출처가 다르다.
  // 라우트 자체는 살아 있으므로 URL 직접 접근은 가능하다.
  {
    href: '/image-studio',
    emoji: '🎨',
    title: '이미지 생성',
    description: '레퍼런스 “풍” + 우리 제품 → 텍스트 없는 배너 비주얼 (폴더별 관리)',
    badge: '핵심',
  },
  {
    href: '/references',
    emoji: '📚',
    title: '레퍼런스 등록',
    description: '캠페인 작업 시 참고할 톤/스타일 이미지 갤러리 (카테고리별 분류)',
  },
  {
    href: '/banner/cafe24',
    emoji: '🏠',
    title: '자사몰 배너',
    description: 'Cafe24 운영 사이즈 (1920×680, 모바일 메인 등) 빌더',
    badge: '예정',
  },
  {
    href: '/banner/smart-store',
    emoji: '🛒',
    title: '스마트스토어 배너',
    description: '네이버 스마트스토어 PC/모바일 배너 빌더',
    badge: '예정',
  },
  {
    href: '/banner/sns',
    emoji: '📷',
    title: 'SNS 배너',
    description: '인스타 정사각/세로/스토리/릴스 빌더 (모바일 가독성 최적화)',
    badge: '예정',
  },
  {
    href: '/builder',
    emoji: '📄',
    title: '페이지 개발',
    description: '이벤트 페이지 / 상세 페이지 빌더 (메인 비주얼 + 쿠폰 + 상품 영역)',
    badge: '핵심',
  },
];

export default function Home() {
  return (
    <AppShell>
      <div style={S.container}>
        <header style={S.header}>
          <h1 style={S.title}>Yogibo 디자인 빌더</h1>
          <p style={S.subtitle}>
            레퍼런스 “풍”을 따라 배너 비주얼 생성 + 이벤트 페이지 · 배너 제작
          </p>
        </header>

        <div style={S.grid}>
          {SHORTCUTS.map((card) => (
            <Link key={card.href} href={card.href} style={S.card}>
              <div style={S.cardHead}>
                <div style={S.cardEmoji}>{card.emoji}</div>
                {card.badge && (
                  <div
                    style={{
                      ...S.cardBadge,
                      ...(card.badge === '핵심' ? S.cardBadgePrimary : {}),
                      ...(card.badge === '예정' ? S.cardBadgeMuted : {}),
                    }}
                  >
                    {card.badge}
                  </div>
                )}
              </div>
              <div style={S.cardTitle}>{card.title}</div>
              <div style={S.cardDesc}>{card.description}</div>
            </Link>
          ))}
        </div>

        <div style={S.notice}>
          <div style={S.noticeTitle}>📌 사이드바 메뉴 안내</div>
          <div style={S.noticeBody}>
            "AI 이미지 생성" 하위에 레퍼런스 등록 / 이미지 생성이 있고,
            "배너 생성" 하위에 자사몰/스마트스토어/SNS 가 있습니다.
            생성된 이미지는 텍스트가 없는 순수 비주얼이며, 한글 카피는 배너 생성에서 얹습니다.
          </div>
        </div>
      </div>
    </AppShell>
  );
}

const S: Record<string, CSSProperties> = {
  container: { maxWidth: 1200, margin: '0 auto', padding: '32px 28px' },
  header: { marginBottom: 32 },
  title: { fontSize: 26, fontWeight: 800, margin: 0, color: '#0f172a' },
  subtitle: { fontSize: 14, color: '#64748b', marginTop: 6 },

  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: 16,
    marginBottom: 28,
  },
  card: {
    display: 'block',
    background: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: 12,
    padding: 20,
    textDecoration: 'none',
    color: 'inherit',
    transition: 'all 0.15s',
  },
  cardHead: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  cardEmoji: { fontSize: 28 },
  cardBadge: {
    fontSize: 10,
    fontWeight: 700,
    padding: '3px 8px',
    borderRadius: 12,
    background: '#f1f5f9',
    color: '#64748b',
  },
  cardBadgePrimary: { background: '#fef3c7', color: '#92400e' },
  cardBadgeMuted: { background: '#f1f5f9', color: '#94a3b8' },
  cardTitle: { fontSize: 15, fontWeight: 700, marginBottom: 6, color: '#0f172a' },
  cardDesc: { fontSize: 12, color: '#64748b', lineHeight: 1.5 },

  notice: {
    padding: 16,
    background: '#eff6ff',
    border: '1px solid #bfdbfe',
    borderRadius: 10,
  },
  noticeTitle: { fontSize: 13, fontWeight: 700, color: '#1e40af', marginBottom: 6 },
  noticeBody: { fontSize: 12, color: '#1e3a8a', lineHeight: 1.6 },
};

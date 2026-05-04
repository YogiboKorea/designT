'use client';
/**
 * TopNav — 공유 상단 네비게이션 바.
 *
 * 디자인:
 *   기존 / (홈) 페이지 헤더 톤에 맞춰 구성 — 흰색 글래스 배경 + 다크 버튼.
 *
 * 사용 예:
 *   import TopNav from '@/components/TopNav';
 *   <TopNav active="references" />
 *
 * active prop:
 *   'home' | 'event' | 'banner' | 'references' | 'import'
 */
import Link from 'next/link';
import { CSSProperties } from 'react';

interface Props {
  active?: 'home' | 'event' | 'banner' | 'references' | 'import' | 'prompt-builder' | 'products';
}

export default function TopNav({ active }: Props) {
  return (
    <header style={S.header}>
      <div style={S.inner}>
        {/* ─── 좌: 로고 ─── */}
        <Link href="/" style={S.linkReset}>
          <div style={S.logoBox}>
            <div style={S.logoY}>Y</div>
            <div>
              <div style={S.logoTitle}>Yogibo Template Studio</div>
              <div style={S.logoSub}>이벤트 페이지 & 배너 빌더</div>
            </div>
          </div>
        </Link>

        {/* ─── 중: 카테고리 메뉴 ─── */}
        <nav style={S.nav}>
          <NavTab href="/" label="대시보드" active={active === 'home'} />
          <NavTab
            href="/references"
            label="📚 레퍼런스"
            active={active === 'references'}
          />
          <NavTab
            href="/references/import"
            label="📥 일괄 등록"
            active={active === 'import'}
          />
          <NavTab
            href="/products"
            label="📦 제품"
            active={active === 'products'}
          />
          <NavTab
            href="/prompt-builder"
            label="🪄 프롬프트 받기"
            active={active === 'prompt-builder'}
          />
        </nav>

        {/* ─── 우: 페이지 만들기 (CTA) ─── */}
        <div style={S.cta}>
          <Link href="/builder" style={S.linkReset}>
            <button style={S.btnPrimary}>
              <span style={S.plus}>＋</span>
              이벤트 페이지
            </button>
          </Link>
          <Link href="/main-visual" style={S.linkReset}>
            <button style={S.btnSecondary}>
              <span style={S.plus}>＋</span>
              자사몰 비주얼
            </button>
          </Link>
        </div>
      </div>
    </header>
  );
}

// ─────────────────────────────────────────────────────────────
function NavTab({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active?: boolean;
}) {
  return (
    <Link href={href} style={S.linkReset}>
      <button
        style={{
          ...S.tab,
          ...(active ? S.tabActive : {}),
        }}
      >
        {label}
      </button>
    </Link>
  );
}

// ─────────────────────────────────────────────────────────────
const S: Record<string, CSSProperties> = {
  header: {
    position: 'sticky',
    top: 0,
    zIndex: 30,
    background: 'rgba(255,255,255,0.85)',
    backdropFilter: 'saturate(180%) blur(12px)',
    WebkitBackdropFilter: 'saturate(180%) blur(12px)',
    borderBottom: '1px solid #ececea',
  },
  inner: {
    maxWidth: 1280,
    margin: '0 auto',
    padding: '12px 24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    flexWrap: 'wrap',
  },
  linkReset: {
    color: 'inherit',
    textDecoration: 'none',
  },
  logoBox: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    cursor: 'pointer',
  },
  logoY: {
    width: 32,
    height: 32,
    borderRadius: 10,
    background: 'linear-gradient(135deg, #111827 0%, #374151 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontWeight: 700,
    fontSize: 14,
    letterSpacing: '-0.5px',
  },
  logoTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: '#111827',
    letterSpacing: '-0.2px',
  },
  logoSub: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 1,
  },
  nav: {
    display: 'flex',
    gap: 4,
    alignItems: 'center',
    background: '#f3f4f6',
    padding: 4,
    borderRadius: 10,
  },
  tab: {
    padding: '7px 14px',
    fontSize: 13,
    fontWeight: 600,
    background: 'transparent',
    color: '#6b7280',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    transition: 'all 0.15s',
    whiteSpace: 'nowrap',
  },
  tabActive: {
    background: '#fff',
    color: '#111827',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
  },
  cta: {
    display: 'flex',
    gap: 8,
    alignItems: 'center',
  },
  btnPrimary: {
    padding: '8px 14px',
    fontSize: 13,
    fontWeight: 600,
    background: '#111827',
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  btnSecondary: {
    padding: '8px 14px',
    fontSize: 13,
    fontWeight: 600,
    background: '#fff',
    color: '#111827',
    border: '1px solid #e5e7eb',
    borderRadius: 10,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  plus: {
    fontSize: 14,
  },
};

'use client';

import { CSSProperties, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

/**
 * 사이드바 — Yogibo 디자인 빌더 메뉴
 * ─────────────────────────────────────────────────────────────────
 * 메뉴 구조:
 *   🎨 디자인 프롬프트 생성     (/prompt-builder)
 *      ├ 📚 레퍼런스 등록      (/references)
 *      ├ 📦 제품 등록          (/products)
 *      └ 📥 일괄 등록          (/references/import)
 *
 *   📄 페이지 개발              (/page-builder)
 *
 *   🖼️ 배너 생성
 *      ├ 🏠 자사몰 배너        (/banner/cafe24)
 *      ├ 🛒 스마트스토어 배너  (/banner/smart-store)
 *      └ 📷 SNS 배너           (/banner/sns)
 *
 * 활성 메뉴는 자동으로 강조됨 (현재 pathname 기준).
 * 모바일에서는 토글 버튼으로 열고 닫기.
 * ─────────────────────────────────────────────────────────────────
 */

interface MenuItem {
  href: string;
  label: string;
  emoji: string;
  matchPaths?: string[]; // 추가 매칭 경로 (예: 자식 경로)
  children?: MenuItem[];
}

const MENU: MenuItem[] = [
  {
    href: '/prompt-builder',
    label: '디자인 프롬프트 생성',
    emoji: '🎨',
    children: [
      { href: '/references',         label: '레퍼런스 등록', emoji: '📚' },
      { href: '/products',           label: '제품 등록',     emoji: '📦' },
      { href: '/references/import',  label: '일괄 등록',     emoji: '📥' },
    ],
  },
  {
    href: '/builder',
    label: '페이지 개발',
    emoji: '📄',
    matchPaths: ['/builder', '/event'],
  },

  {
    href: '/banner',
    label: '배너 생성',
    emoji: '🖼️',
    matchPaths: ['/main-visual', '/banner'],
    children: [
      { href: '/banner/cafe24',       label: '자사몰 배너',        emoji: '🏠', matchPaths: ['/banner/cafe24', '/main-visual'] },
      { href: '/banner/smart-store',  label: '스마트스토어 배너',  emoji: '🛒' },
      { href: '/banner/sns',          label: 'SNS 배너',           emoji: '📷' },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname() || '';
  const [mobileOpen, setMobileOpen] = useState(false);

  // 라우트 변경 시 모바일 메뉴 자동 닫기
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const isActive = (item: MenuItem): boolean => {
    if (pathname === item.href) return true;
    if (item.matchPaths?.some((p) => pathname.startsWith(p))) return true;
    if (item.children?.some((c) => pathname === c.href || pathname.startsWith(c.href + '/'))) {
      return true;
    }
    return false;
  };

  const isExactActive = (item: MenuItem): boolean => {
    return pathname === item.href || pathname.startsWith(item.href + '/');
  };

  return (
    <>
      {/* 모바일 토글 버튼 */}
      <button
        type="button"
        onClick={() => setMobileOpen((v) => !v)}
        style={S.mobileToggle}
        aria-label="메뉴 토글"
      >
        {mobileOpen ? '✕' : '☰'}
      </button>

      {/* 모바일 오버레이 */}
      {mobileOpen && (
        <div
          style={S.overlay}
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        style={{
          ...S.sidebar,
          ...(mobileOpen ? S.sidebarMobileOpen : {}),
        }}
      >
        {/* 로고 / 타이틀 */}
        <Link href="/" style={S.logo}>
          <div style={S.logoMark}>Y</div>
          <div>
            <div style={S.logoTitle}>Yogibo</div>
            <div style={S.logoSubtitle}>디자인 빌더</div>
          </div>
        </Link>

        {/* 메뉴 */}
        <nav style={S.nav}>
          {MENU.map((item) => {
            const active = isActive(item);
            const exact = isExactActive(item);

            return (
              <div key={item.href} style={S.menuGroup}>
                <Link
                  href={item.href}
                  style={{
                    ...S.menuItem,
                    ...(exact ? S.menuItemActive : {}),
                  }}
                >
                  <span style={S.menuEmoji}>{item.emoji}</span>
                  <span>{item.label}</span>
                </Link>

                {/* 자식 메뉴 — 부모가 active 일 때만 펼침 */}
                {item.children && active && (
                  <div style={S.subMenu}>
                    {item.children.map((child) => {
                      const childActive = pathname === child.href ||
                        pathname.startsWith(child.href + '/');
                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          style={{
                            ...S.subMenuItem,
                            ...(childActive ? S.subMenuItemActive : {}),
                          }}
                        >
                          <span style={S.subMenuEmoji}>{child.emoji}</span>
                          <span>{child.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div style={S.footer}>
          <div style={S.footerText}>v4.4 — 사이드바 적용</div>
        </div>
      </aside>
    </>
  );
}

const SIDEBAR_WIDTH = 260;

const S: Record<string, CSSProperties> = {
  sidebar: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: SIDEBAR_WIDTH,
    height: '100vh',
    background: '#0f172a',
    color: '#e2e8f0',
    display: 'flex',
    flexDirection: 'column',
    padding: '20px 0',
    zIndex: 50,
    boxShadow: '2px 0 12px rgba(0,0,0,0.05)',
    overflowY: 'auto',
  },
  sidebarMobileOpen: {
    transform: 'translateX(0)',
  },

  mobileToggle: {
    position: 'fixed',
    top: 16,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 8,
    border: 0,
    background: '#0f172a',
    color: '#fff',
    fontSize: 18,
    cursor: 'pointer',
    zIndex: 100,
    display: 'none', // 기본 숨김 (CSS 미디어쿼리는 인라인 스타일로 한계라 prod 에서는 globals.css 추가 권장)
  },
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.5)',
    zIndex: 40,
  },

  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '0 20px 20px',
    borderBottom: '1px solid #1e293b',
    textDecoration: 'none',
    color: '#fff',
  },
  logoMark: {
    width: 36,
    height: 36,
    borderRadius: 8,
    background: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 800,
    fontSize: 18,
    color: '#fff',
  },
  logoTitle: { fontWeight: 800, fontSize: 15, color: '#fff' },
  logoSubtitle: { fontSize: 11, color: '#94a3b8' },

  nav: {
    flex: 1,
    padding: '16px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  menuGroup: {
    display: 'flex',
    flexDirection: 'column',
  },
  menuItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '10px 12px',
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 600,
    color: '#cbd5e1',
    textDecoration: 'none',
    transition: 'all 0.15s',
  },
  menuItemActive: {
    background: '#1e293b',
    color: '#fff',
  },
  menuEmoji: {
    fontSize: 16,
    width: 20,
    textAlign: 'center',
    display: 'inline-block',
  },

  subMenu: {
    marginLeft: 12,
    marginTop: 4,
    marginBottom: 4,
    paddingLeft: 12,
    borderLeft: '1px solid #334155',
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  subMenuItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '7px 10px',
    borderRadius: 6,
    fontSize: 12,
    color: '#94a3b8',
    textDecoration: 'none',
    transition: 'all 0.15s',
  },
  subMenuItemActive: {
    background: '#334155',
    color: '#fff',
    fontWeight: 600,
  },
  subMenuEmoji: {
    fontSize: 13,
    width: 16,
    textAlign: 'center',
    display: 'inline-block',
  },

  footer: {
    padding: '14px 20px 0',
    borderTop: '1px solid #1e293b',
  },
  footerText: {
    fontSize: 10,
    color: '#475569',
  },
};

// 사이드바 너비를 다른 컴포넌트에서 참조할 수 있도록 export
export { SIDEBAR_WIDTH };

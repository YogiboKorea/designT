'use client';

import { CSSProperties, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

/**
 * 사이드바 — Yogibo 디자인 빌더
 * ─────────────────────────────────────────────────────────────────
 * - 콘텐츠 자산: 디자인 프롬프트 생성 (+ 자식)
 * - 페이지 · 배너: 페이지 개발(저장된 페이지 동적 sub-list 노출), 배너 생성
 * - 이벤트: 이벤트 페이지 목록 / 제작
 *
 * "페이지 개발" 클릭 시 /page-builder(템플릿 게시판) 로 이동하고,
 * 사이드바에 저장된 페이지 템플릿(eventType==='page')이 sub-list 로 노출됨.
 * sub-item 클릭 시 /builder?id=... 로 즉시 이동.
 * ─────────────────────────────────────────────────────────────────
 */

interface MenuItem {
  href: string;
  label: string;
  emoji: string;
  matchPaths?: string[];
  children?: MenuItem[];
  /** 동적으로 fetch 하는 항목 식별자 */
  dynamicChildren?: 'pageTemplates';
}

interface MenuSection {
  title?: string;
  items: MenuItem[];
}

const MENU: MenuSection[] = [
  {
    title: '콘텐츠 자산',
    items: [
      {
        href: '/image-studio',
        label: 'AI 이미지 생성',
        emoji: '🎨',
        // 숨김 처리한 항목 (라우트는 살아 있고 메뉴에서만 뺀다):
        //   · /prompt-builder — GPT 붙여넣기용 프롬프트. 지금은 Higgsfield 파이프라인을 쓰므로 미노출.
        //   · /products       — 제품 정보는 youtube 프로젝트의 products.json(70종, 실측/기하/8방향뷰)을
        //                       기준으로 쓰기 때문에, 이 목록은 출처가 달라 혼선만 준다.
        children: [
          { href: '/references', label: '레퍼런스 등록', emoji: '📚' },
          { href: '/image-studio', label: '이미지 생성',  emoji: '🖼️' },
        ],
      },
    ],
  },
  {
    title: '페이지 · 배너',
    items: [
      {
        href: '/page-builder',
        label: '페이지 개발',
        emoji: '📐',
        matchPaths: ['/page-builder', '/builder'],
        dynamicChildren: 'pageTemplates',
      },
      {
        href: '/banner',
        label: '배너 생성',
        emoji: '🖼️',
        matchPaths: ['/main-visual', '/banner'],
        children: [
          { href: '/banner/cafe24',      label: '자사몰 배너',       emoji: '🏠', matchPaths: ['/banner/cafe24', '/main-visual'] },
          { href: '/banner/smart-store', label: '스마트스토어 배너', emoji: '🛒' },
          { href: '/banner/sns',         label: 'SNS 배너',          emoji: '📷' },
        ],
      },
    ],
  },
  {
    title: '이벤트',
    items: [
      {
        href: '/events/list',
        label: '이벤트 페이지',
        emoji: '🎉',
        matchPaths: ['/events'],
        children: [
          { href: '/events/list',   label: '이벤트 목록', emoji: '📋' },
          { href: '/events/create', label: '이벤트 제작', emoji: '✨' },
        ],
      },
    ],
  },
  {
    title: '도움말',
    items: [
      {
        href: '/help',
        label: '사용 설명서',
        emoji: '📖',
        matchPaths: ['/help'],
        children: [
          { href: '/help#prompt',       label: 'GPT 프롬프트 사용방법',   emoji: '✨' },
          { href: '/help#page-builder', label: '페이지 개발 이용방법',     emoji: '📐' },
          { href: '/help#banner',       label: '배너 생성 관리방법',       emoji: '🖼️' },
          { href: '/help#event',        label: '이벤트 페이지 제작 방법', emoji: '🎉' },
        ],
      },
    ],
  },
];

interface PageTemplate {
  _id: string;
  title?: string;
  eventType?: string;
  updatedAt?: string;
  createdAt?: string;
}

export default function Sidebar() {
  const pathname = usePathname() || '';
  const [mobileOpen, setMobileOpen] = useState(false);
  const [pageTemplates, setPageTemplates] = useState<PageTemplate[]>([]);
  // 해시(`#prompt` 등)는 usePathname 으로 안 잡혀서 별도 추적 — /help 같은 anchor 메뉴 active 표시용
  const [currentHash, setCurrentHash] = useState('');

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  useEffect(() => {
    const sync = () => setCurrentHash(window.location.hash);
    sync();
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, [pathname]);

  // 저장된 페이지 템플릿 fetch — 페이지 개발 sub-list 에 표시
  useEffect(() => {
    let cancelled = false;
    fetch('/api/events')
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        if (!json?.success) return;
        const list: PageTemplate[] = (json.data || [])
          .filter((ev: PageTemplate) => ev.eventType === 'page')
          .sort((a: PageTemplate, b: PageTemplate) => {
            const ta = new Date(a.updatedAt || a.createdAt || 0).getTime();
            const tb = new Date(b.updatedAt || b.createdAt || 0).getTime();
            return tb - ta;
          })
          .slice(0, 10);
        setPageTemplates(list);
      })
      .catch(() => { /* silent */ });
    return () => { cancelled = true; };
  }, [pathname]);

  // 부모 항목의 "활성 표시" — 본인 경로이거나 자식 경로일 때.
  const isExactActive = (item: MenuItem): boolean => {
    if (pathname === item.href || pathname.startsWith(item.href + '/')) return true;
    if (item.matchPaths?.some((p) => pathname.startsWith(p))) return true;
    if (item.children?.some((c) => pathname === c.href || pathname.startsWith(c.href + '/'))) return true;
    return false;
  };

  return (
    <>
      <button type="button" onClick={() => setMobileOpen((v) => !v)} style={S.mobileToggle} aria-label="메뉴 토글">
        {mobileOpen ? '✕' : '☰'}
      </button>

      {mobileOpen && <div style={S.overlay} onClick={() => setMobileOpen(false)} />}

      <aside style={{ ...S.sidebar, ...(mobileOpen ? S.sidebarMobileOpen : {}) }}>
        {/* 로고 */}
        <Link href="/" style={S.logo}>
          <div style={S.logoMark}>
            <img
              src="https://yogibo.kr/web/img/icon/logo3_on.png"
              alt="Yogibo"
              style={S.logoImg}
            />
          </div>
          <div>
            <div style={S.logoTitle}>Yogibo</div>
            <div style={S.logoSubtitle}>디자인 빌더</div>
          </div>
        </Link>

        {/* 메뉴 */}
        <nav style={S.nav}>
          {MENU.map((section, si) => (
            <div
              key={section.title || `section-${si}`}
              style={{
                ...S.section,
                ...(si === MENU.length - 1 ? { borderBottom: 'none', marginBottom: 0, paddingBottom: 0 } : {}),
              }}
            >
              {section.title && <div style={S.sectionTitle}>{section.title}</div>}
              {section.items.map((item) => {
                const exact = isExactActive(item);
                const dynChildren = item.dynamicChildren === 'pageTemplates' ? pageTemplates : null;

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
                      <span style={{ flex: 1 }}>{item.label}</span>
                    </Link>

                    {/* 정적 자식 메뉴 — 항상 노출 (사용자가 부모 클릭 안 해도 접근 가능) */}
                    {item.children && (
                      <div style={S.subMenu}>
                        {item.children.map((child) => {
                          const [childBase, childHash] = child.href.split('#');
                          const childActive = childHash
                            ? pathname === childBase && currentHash === `#${childHash}`
                            : pathname === child.href || pathname.startsWith(child.href + '/');
                          return (
                            <Link
                              key={child.href}
                              href={child.href}
                              style={{ ...S.subMenuItem, ...(childActive ? S.subMenuItemActive : {}) }}
                            >
                              <span style={S.subMenuEmoji}>{child.emoji}</span>
                              <span>{child.label}</span>
                            </Link>
                          );
                        })}
                      </div>
                    )}

                    {/* 동적: 페이지 템플릿 sub-list — 항상 노출 */}
                    {dynChildren && (
                      <div style={S.subMenu}>
                        <Link href="/builder" style={{ ...S.subMenuItem, ...S.subMenuItemNew }}>
                          <span style={S.subMenuEmoji}>＋</span>
                          <span>새 페이지</span>
                        </Link>
                        {dynChildren.length === 0 ? (
                          <div style={S.subMenuEmpty}>저장된 페이지 없음</div>
                        ) : (
                          dynChildren.map((tpl) => {
                            const href = `/builder?id=${tpl._id}`;
                            const childActive = pathname.startsWith('/builder') && pathname.includes(tpl._id);
                            return (
                              <Link
                                key={tpl._id}
                                href={href}
                                style={{ ...S.subMenuItem, ...(childActive ? S.subMenuItemActive : {}) }}
                                title={tpl.title || '제목 없음'}
                              >
                                <span style={S.subMenuEmoji}>📄</span>
                                <span style={S.subMenuItemTruncate}>{tpl.title || '제목 없음'}</span>
                              </Link>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </nav>

        <div style={S.footer}>
          <div style={S.footerText}>v4.5</div>
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
    background: '#111827',
    color: '#e5e7eb',
    display: 'flex',
    flexDirection: 'column',
    padding: '24px 0 0',
    zIndex: 50,
    boxShadow: '2px 0 16px rgba(0,0,0,0.08)',
    overflowY: 'auto',
  },
  sidebarMobileOpen: { transform: 'translateX(0)' },

  mobileToggle: {
    position: 'fixed',
    top: 16,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 8,
    border: 0,
    background: '#111827',
    color: '#fff',
    fontSize: 18,
    cursor: 'pointer',
    zIndex: 100,
    display: 'none',
  },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 40 },

  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '0 20px 20px',
    borderBottom: '1px solid #1f2937',
    textDecoration: 'none',
    color: '#fff',
  },
  logoMark: {
    width: 40,
    height: 40,
    borderRadius: 10,
    background: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
  },
  logoImg: { width: '78%', height: '78%', objectFit: 'contain' },
  logoTitle: { fontWeight: 800, fontSize: 15, color: '#fff', letterSpacing: '-0.01em' },
  logoSubtitle: { fontSize: 11, color: '#9ca3af', marginTop: 2 },

  nav: {
    flex: 1,
    padding: '20px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    paddingBottom: 14,
    marginBottom: 8,
    borderBottom: '1px solid #1f2937',
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: '#6b7280',
    padding: '4px 12px 10px',
  },
  menuGroup: { display: 'flex', flexDirection: 'column' },
  menuItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '10px 12px',
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 600,
    color: '#d1d5db',
    textDecoration: 'none',
    transition: 'all 0.15s',
  },
  menuItemActive: {
    background: '#1f2937',
    color: '#fff',
    boxShadow: 'inset 2px 0 0 #fe6326',
  },
  menuEmoji: { fontSize: 16, width: 20, textAlign: 'center', display: 'inline-block' },

  subMenu: {
    marginLeft: 14,
    marginTop: 4,
    marginBottom: 4,
    paddingLeft: 12,
    borderLeft: '1px solid #374151',
    display: 'flex',
    flexDirection: 'column',
    gap: 1,
  },
  subMenuItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '7px 10px',
    borderRadius: 6,
    fontSize: 12,
    color: '#9ca3af',
    textDecoration: 'none',
    transition: 'all 0.15s',
  },
  subMenuItemActive: { background: '#374151', color: '#fff', fontWeight: 600 },
  subMenuItemNew: { color: '#fe6326', fontWeight: 600 },
  subMenuItemTruncate: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    flex: 1,
  } as CSSProperties,
  subMenuEmoji: { fontSize: 12, width: 16, textAlign: 'center', display: 'inline-block' },
  subMenuEmpty: { fontSize: 11, color: '#6b7280', padding: '6px 10px', fontStyle: 'italic' },

  footer: { padding: '14px 20px 18px', borderTop: '1px solid #1f2937' },
  footerText: { fontSize: 10, color: '#4b5563' },
};

export { SIDEBAR_WIDTH };

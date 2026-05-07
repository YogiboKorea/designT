'use client';

import { CSSProperties, ReactNode } from 'react';
import Sidebar, { SIDEBAR_WIDTH } from './Sidebar';

/**
 * AppShell — 사이드바 + 컨텐츠 래퍼
 * ─────────────────────────────────────────────────────────────────
 * 모든 페이지의 최상위 래퍼. 사이드바를 좌측에 두고
 * 메인 컨텐츠를 사이드바 너비만큼 우측으로 밀어 배치.
 *
 * 사용 (각 페이지에서):
 *   import AppShell from '@/components/AppShell';
 *
 *   export default function MyPage() {
 *     return (
 *       <AppShell>
 *         <div>페이지 내용...</div>
 *       </AppShell>
 *     );
 *   }
 *
 * 또는 src/app/layout.tsx 에 한 번만 적용해 모든 페이지에 자동 적용 가능.
 * (단, 일부 페이지는 사이드바 없이 풀스크린이 필요하면 그 페이지만 AppShell 빼면 됨)
 * ─────────────────────────────────────────────────────────────────
 */

export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <div style={S.root}>
      <Sidebar />
      <main style={S.main}>{children}</main>
    </div>
  );
}

const S: Record<string, CSSProperties> = {
  root: {
    minHeight: '100vh',
    background: '#f9fafb',
  },
  main: {
    marginLeft: SIDEBAR_WIDTH,
    minHeight: '100vh',
    /**
     * 모바일 대응:
     * - 작은 화면에서는 사이드바를 숨기고 컨텐츠가 전체 너비 사용
     * - 인라인 스타일은 미디어쿼리 미지원이라 globals.css 에서:
     *
     *   @media (max-width: 768px) {
     *     [data-app-main] { margin-left: 0 !important; }
     *     [data-sidebar] { transform: translateX(-100%); }
     *   }
     *
     * 일단 데스크톱 우선으로 두고, 모바일 대응이 필요하면 추후 추가.
     */
  },
};

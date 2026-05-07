'use client';

import BannerBuilderShell, {
  type BannerSize,
} from '@/components/BannerBuilderShell';

const SIZES: BannerSize[] = [
  {
    value: '1920x680',
    label: '🏠 자사몰 웹 메인',
    width: 1920,
    height: 680,
    designCodeKey: 'web-banner-wide',
    designCodeLabel: '와이드 가로 배너',
    referenceCategory: 'web-banner',
    description: '데스크톱 메인 비주얼 — 좌우 분할, 다중 텍스트 레벨',
  },
  {
    value: '800x907',
    label: '📱 자사몰 모바일 메인',
    width: 800,
    height: 907,
    designCodeKey: 'mobile-hero',
    designCodeLabel: '모바일 히어로',
    referenceCategory: 'mobile',
    description: '모바일 메인 — 큰 텍스트, 세로 우선, 1메시지',
  },
  {
    value: '800x-',
    label: '📄 자사몰 이벤트 페이지',
    width: 800,
    height: 0,
    designCodeKey: 'mobile-long',
    designCodeLabel: '모바일 롱 페이지',
    referenceCategory: 'mobile',
    description: '긴 세로 이벤트/상세 페이지 — 섹션 구조',
  },
];

export default function Cafe24BannerPage() {
  return (
    <BannerBuilderShell
      emoji="🏠"
      title="자사몰 배너 빌더"
      breadcrumbLabel="자사몰 배너"
      platformBadge="Cafe24"
      subtitle="Cafe24 운영 사이즈에 맞춘 배너 비주얼 제작. 사이즈에 따라 디자인 코드와 매칭 레퍼런스가 자동 적용됩니다."
      sizes={SIZES}
      editorBasePath="/main-visual"
    />
  );
}

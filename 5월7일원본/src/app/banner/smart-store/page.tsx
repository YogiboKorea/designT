'use client';

import BannerBuilderShell, {
  type BannerSize,
} from '@/components/BannerBuilderShell';

const SIZES: BannerSize[] = [
  {
    value: '1920x400',
    label: '🛒 PC 메인',
    width: 1920,
    height: 400,
    designCodeKey: 'web-banner-slim',
    designCodeLabel: '슬림 가로 배너',
    referenceCategory: 'web-banner',
    description: '스마트스토어 PC 메인 — 헤드라인 + CTA 단순화',
  },
  {
    value: '750x600',
    label: '📱 모바일 메인',
    width: 750,
    height: 600,
    designCodeKey: 'mobile-hero',
    designCodeLabel: '모바일 히어로',
    referenceCategory: 'mobile',
    description: '모바일 메인 — 큰 텍스트, 세로 우선',
  },
  {
    value: '1280x200',
    label: '🎟️ PC 쿠폰/홍보',
    width: 1280,
    height: 200,
    designCodeKey: 'web-banner-thin',
    designCodeLabel: '얇은 띠 배너',
    referenceCategory: 'web-banner',
    description: '한 줄 띠 배너 — 쿠폰형',
  },
  {
    value: '750x240',
    label: '🎟️ 모바일 쿠폰',
    width: 750,
    height: 240,
    designCodeKey: 'mobile-thin',
    designCodeLabel: '모바일 띠',
    referenceCategory: 'mobile',
    description: '모바일 쿠폰 띠 — 단일 메시지',
  },
  {
    value: '1300x1300',
    label: '🖼️ 대표 이미지',
    width: 1300,
    height: 1300,
    designCodeKey: 'thumbnail-square',
    designCodeLabel: '정사각 썸네일',
    referenceCategory: 'thumbnail',
    description: '제품 단독 컷 — 텍스트 최소',
  },
  {
    value: '860x-',
    label: '📄 상세 페이지',
    width: 860,
    height: 0,
    designCodeKey: 'mobile-long',
    designCodeLabel: '모바일 롱 페이지',
    referenceCategory: 'mobile',
    description: '긴 세로 상세 페이지 — 섹션 구조',
  },
];

export default function SmartStoreBannerPage() {
  return (
    <BannerBuilderShell
      emoji="🛒"
      title="스마트스토어 배너 빌더"
      breadcrumbLabel="스마트스토어 배너"
      platformBadge="네이버"
      subtitle="네이버 스마트스토어 운영 사이즈에 맞춘 배너 비주얼 제작. 사이즈에 따라 디자인 코드와 매칭 레퍼런스가 자동 적용됩니다."
      sizes={SIZES}
      editorBasePath="/main-visual"
    />
  );
}

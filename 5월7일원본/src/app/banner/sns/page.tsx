'use client';

import BannerBuilderShell, {
  type BannerSize,
} from '@/components/BannerBuilderShell';

const SIZES: BannerSize[] = [
  {
    value: '1080x1080',
    label: '📷 인스타 정사각',
    width: 1080,
    height: 1080,
    designCodeKey: 'sns-square',
    designCodeLabel: 'SNS 정사각 (인스타 피드)',
    referenceCategory: 'sns',
    description: '모바일 가독성 + 임팩트 + 1메시지',
  },
  {
    value: '1080x1350',
    label: '📷 인스타 세로형',
    width: 1080,
    height: 1350,
    designCodeKey: 'sns-portrait',
    designCodeLabel: 'SNS 4:5 세로',
    referenceCategory: 'sns',
    description: '인스타 4:5 비율 — 화면 차지율 최대',
  },
];

export default function SnsBannerPage() {
  return (
    <BannerBuilderShell
      emoji="📷"
      title="SNS 배너 빌더"
      breadcrumbLabel="SNS 배너"
      platformBadge="Instagram"
      subtitle="인스타그램 정사각/세로/스토리/릴스 — 모바일 가독성과 임팩트 최적화. v4.3 SNS 디자인 코드가 자동 적용됩니다."
      sizes={SIZES}
      editorBasePath="/main-visual"
    />
  );
}

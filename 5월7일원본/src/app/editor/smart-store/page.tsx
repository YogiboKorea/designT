'use client';

import { useSearchParams } from 'next/navigation';
import EditorShell from '@/components/EditorShell';

const SIZE_MAP: Record<string, { w: number; h: number; label: string; codeLabel: string }> = {
  '1920x400':   { w: 1920, h: 400,  label: '🛒 PC 메인', codeLabel: '슬림 가로 배너' },
  '750x600':    { w: 750,  h: 600,  label: '📱 모바일 메인', codeLabel: '모바일 히어로' },
  '1280x200':   { w: 1280, h: 200,  label: '🎟️ PC 쿠폰/홍보', codeLabel: '얇은 띠 배너' },
  '750x240':    { w: 750,  h: 240,  label: '🎟️ 모바일 쿠폰', codeLabel: '모바일 띠' },
  '1300x1300':  { w: 1300, h: 1300, label: '🖼️ 대표 이미지', codeLabel: '정사각 썸네일' },
  '860x-':      { w: 860,  h: 0,    label: '📄 상세 페이지', codeLabel: '모바일 롱 페이지' },
};

export default function SmartStoreEditorPage() {
  const searchParams = useSearchParams();
  const sizeKey = searchParams?.get('size') || '1920x400';
  const meta = SIZE_MAP[sizeKey] || SIZE_MAP['1920x400'];

  return (
    <EditorShell
      emoji="🛒"
      title={meta.label}
      breadcrumbLabel="스마트스토어"
      aspectRatio={sizeKey}
      width={meta.w}
      height={meta.h}
      designCodeLabel={meta.codeLabel}
      backUrl="/banner/smart-store"
    />
  );
}

'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import EditorShell from '@/components/EditorShell';

const SIZE_MAP: Record<string, { w: number; h: number; label: string; codeLabel: string }> = {
  '1920x680': { w: 1920, h: 680, label: '🏠 자사몰 웹 메인', codeLabel: '와이드 가로 배너' },
  '800x907':  { w: 800,  h: 907, label: '📱 자사몰 모바일 메인', codeLabel: '모바일 히어로' },
  '800x-':    { w: 800,  h: 0,   label: '📄 자사몰 이벤트 페이지', codeLabel: '모바일 롱 페이지' },
};

function Cafe24EditorInner() {
  const searchParams = useSearchParams();
  const sizeKey = searchParams?.get('size') || '1920x680';
  const meta = SIZE_MAP[sizeKey] || SIZE_MAP['1920x680'];

  return (
    <EditorShell
      emoji="🏠"
      title={meta.label}
      breadcrumbLabel="자사몰"
      aspectRatio={sizeKey}
      width={meta.w}
      height={meta.h}
      designCodeLabel={meta.codeLabel}
      backUrl="/banner/cafe24"
    />
  );
}

export default function Cafe24EditorPage() {
  return (
    <Suspense fallback={null}>
      <Cafe24EditorInner />
    </Suspense>
  );
}

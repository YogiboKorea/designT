'use client';

import { useSearchParams } from 'next/navigation';
import EditorShell from '@/components/EditorShell';

const SIZE_MAP: Record<string, { w: number; h: number; label: string; codeLabel: string }> = {
  '1080x1080': { w: 1080, h: 1080, label: '📷 인스타 정사각', codeLabel: 'SNS 정사각' },
  '1080x1350': { w: 1080, h: 1350, label: '📷 인스타 세로형', codeLabel: 'SNS 4:5' },
};

export default function SnsEditorPage() {
  const searchParams = useSearchParams();
  const sizeKey = searchParams?.get('size') || '1080x1080';
  const meta = SIZE_MAP[sizeKey] || SIZE_MAP['1080x1080'];

  return (
    <EditorShell
      emoji="📷"
      title={meta.label}
      breadcrumbLabel="SNS"
      aspectRatio={sizeKey}
      width={meta.w}
      height={meta.h}
      designCodeLabel={meta.codeLabel}
      backUrl="/banner/sns"
    />
  );
}

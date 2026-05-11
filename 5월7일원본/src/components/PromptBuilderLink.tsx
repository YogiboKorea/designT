'use client';
/**
 * PromptBuilderLink
 * ─────────────────────────────────────────────────────────────────
 * 빌더 우측 속성 패널에 표시되는 작은 안내 카드.
 * 클릭 시 /prompt-builder 를 팝업 모달로 오픈.
 * ─────────────────────────────────────────────────────────────────
 */
import { CSSProperties, useState } from 'react';
import PromptBuilderModal from './PromptBuilderModal';

interface Props {
  sectionType?: 'main' | 'coupon' | 'product';
}

export default function PromptBuilderLink({ sectionType }: Props) {
  const [open, setOpen] = useState(false);
  const hint = getHintForSectionType(sectionType);

  // 섹션 유형별 aspectRatio 힌트
  const aspectRatio =
    sectionType === 'main'    ? '800x-'   :
    sectionType === 'coupon'  ? '800x400' :
    sectionType === 'product' ? '800x600' :
    undefined;

  return (
    <>
      <div style={S.root}>
        <div style={S.headerRow}>
          <span style={S.emoji}>🪄</span>
          <span style={S.title}>AI 이미지 만들기</span>
        </div>

        <p style={S.desc}>
          프롬프트 빌더에서 캠페인 양식을 선택하고
          ChatGPT/Midjourney 등에 바로 쓸 수 있는
          <strong style={S.strong}> 정교한 영문 프롬프트</strong>를
          받아보세요.
        </p>

        {hint && <div style={S.hintBox}>💡 {hint}</div>}

        <button type="button" onClick={() => setOpen(true)} style={S.btn}>
          🚀 프롬프트 빌더 열기
          <span style={S.arrow}>↗</span>
        </button>

        <div style={S.tools}>
          지원 도구:&nbsp;
          <span style={S.tool}>ChatGPT</span>
          <span style={S.toolSep}>·</span>
          <span style={S.tool}>Midjourney</span>
          <span style={S.toolSep}>·</span>
          <span style={S.tool}>Gemini</span>
          <span style={S.toolSep}>·</span>
          <span style={S.tool}>fal.ai</span>
          <span style={S.toolSep}>·</span>
          <span style={S.tool}>NanoBanana</span>
        </div>
      </div>

      {/* 팝업 모달 */}
      <PromptBuilderModal
        open={open}
        onClose={() => setOpen(false)}
        aspectRatio={aspectRatio}
      />
    </>
  );
}

// ─────────────────────────────────────────────────────────────
function getHintForSectionType(t?: string): string | null {
  if (t === 'main')    return '메인 비주얼은 16:9 또는 와이드 비율을 추천합니다.';
  if (t === 'coupon')  return '쿠폰 섹션은 "쿠폰/특가" 양식을 사용해보세요.';
  if (t === 'product') return '제품 섹션은 "신상 출시" 양식을 사용해보세요.';
  return null;
}

// ─────────────────────────────────────────────────────────────
const S: Record<string, CSSProperties> = {
  root: {
    margin: '12px 14px 16px',
    padding: 14,
    border: '1px solid #e9d5ff',
    borderRadius: 10,
    background: 'linear-gradient(180deg, #faf5ff 0%, #ffffff 100%)',
  },
  headerRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  emoji: { fontSize: 18 },
  title: {
    fontSize: 13,
    fontWeight: 700,
    color: '#6b21a8',
    letterSpacing: '-0.2px',
  },
  desc: {
    margin: '0 0 10px',
    fontSize: 12,
    color: '#4b5563',
    lineHeight: 1.55,
  },
  strong: {
    color: '#6b21a8',
    fontWeight: 700,
  },
  hintBox: {
    padding: '8px 10px',
    background: 'rgba(124, 58, 237, 0.06)',
    border: '1px solid #e9d5ff',
    borderRadius: 6,
    fontSize: 11,
    color: '#6b21a8',
    marginBottom: 10,
    lineHeight: 1.5,
  },
  btn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    width: '100%',
    padding: '10px 12px',
    background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'transform 0.1s',
  },
  arrow: {
    fontSize: 12,
    fontWeight: 400,
    opacity: 0.85,
  },
  tools: {
    marginTop: 10,
    fontSize: 10,
    color: '#9ca3af',
    textAlign: 'center',
    letterSpacing: '0.2px',
  },
  tool: {
    color: '#6b7280',
    fontWeight: 500,
  },
  toolSep: {
    margin: '0 4px',
    color: '#d1d5db',
  },
};

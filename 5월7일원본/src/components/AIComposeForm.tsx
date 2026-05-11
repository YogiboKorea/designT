'use client';
/**
 * AIComposeForm
 * ─────────────────────────────────────────────────────────────────
 * 빌더 우측 속성 패널 상단에 표시되는 AI 자동 디자인 폼.
 *
 * 사용자 입력은 단 2개:
 *   1. 대표 텍스트 (메인 카피)
 *   2. 할인율 (%)
 *
 * → /api/ai-compose 호출 → 받은 SectionData 를 onApply 로 전달
 * → 빌더가 즉시 활성 섹션을 교체.
 *
 * 사용 예 (PropertiesPanel.tsx):
 *   import AIComposeForm from './AIComposeForm';
 *   <AIComposeForm
 *     sectionType={activeSection.type}
 *     onApply={(section) => onUpdate(section)}
 *   />
 * ─────────────────────────────────────────────────────────────────
 */
import { useState, CSSProperties } from 'react';
import type { SectionData } from '../app/builder/types';

interface Props {
  sectionType: 'main' | 'coupon' | 'product';
  onApply: (section: SectionData) => void;
  /** 추가 태그 필터 (선택) — 비우면 최근순 */
  filterTags?: string[];
}

export default function AIComposeForm({ sectionType, onApply, filterTags }: Props) {
  const [mainText, setMainText] = useState('');
  const [discount, setDiscount] = useState(30);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ kind: 'info' | 'ok' | 'err'; msg: string } | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [submitHover, setSubmitHover] = useState(false);

  const handleGenerate = async () => {
    if (!mainText.trim()) {
      setStatus({ kind: 'err', msg: '대표 텍스트를 입력하세요.' });
      return;
    }
    if (discount < 1 || discount > 99) {
      setStatus({ kind: 'err', msg: '할인율은 1~99 사이여야 합니다.' });
      return;
    }

    setLoading(true);
    setStatus({ kind: 'info', msg: '🪄 과거 작업물 분석 중…' });

    try {
      const res = await fetch('/api/ai-compose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mainText: mainText.trim(),
          discount,
          sectionType,
          filterTags,
        }),
      });
      const json = await res.json();

      if (!json.ok) {
        throw new Error(json.message || 'AI 생성 실패');
      }

      const { tier1 = 0, tier2 = 0 } = json.usedReferences ?? {};
      setStatus({
        kind: 'ok',
        msg: `✅ 레퍼런스 ${tier1 + tier2}개 기반 생성 완료 (빌더 ${tier1} + 외부 ${tier2})`,
      });
      onApply(json.section);

      setTimeout(() => setStatus(null), 3000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '알 수 없는 오류';
      setStatus({ kind: 'err', msg: '❌ ' + msg });
      setTimeout(() => setStatus(null), 6000);
    } finally {
      setLoading(false);
    }
  };

  const submitDisabled = loading || !mainText.trim();

  return (
    <div style={S.root}>
      <button
        type="button"
        style={S.header}
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        <span style={S.title}>🤖 AI 자동 디자인</span>
        <span style={S.chevron}>{expanded ? '▾' : '▸'}</span>
      </button>

      {expanded && (
        <div style={S.body}>
          <p style={S.hint}>
            과거 채택된 작업물의 디자인 톤을 따라 자동 생성합니다.
            대표 텍스트와 할인율만 입력하세요.
          </p>

          <label style={S.field}>
            <span style={S.label}>대표 텍스트</span>
            <input
              type="text"
              value={mainText}
              onChange={(e) => setMainText(e.target.value)}
              placeholder="예: 여름맞이 시원한 세일"
              disabled={loading}
              maxLength={50}
              style={{
                ...S.input,
                ...(loading ? S.inputDisabled : {}),
              }}
            />
          </label>

          <label style={S.field}>
            <span style={S.label}>할인율 (%)</span>
            <input
              type="number"
              value={discount}
              onChange={(e) => setDiscount(Number(e.target.value))}
              min={1}
              max={99}
              disabled={loading}
              style={{
                ...S.input,
                ...(loading ? S.inputDisabled : {}),
              }}
            />
          </label>

          <button
            type="button"
            onClick={handleGenerate}
            disabled={submitDisabled}
            onMouseEnter={() => setSubmitHover(true)}
            onMouseLeave={() => setSubmitHover(false)}
            style={{
              ...S.submit,
              ...(submitDisabled ? S.submitDisabled : {}),
              ...(submitHover && !submitDisabled ? S.submitHover : {}),
            }}
          >
            {loading ? '생성 중…' : '✨ AI 디자인 생성'}
          </button>

          {status && (
            <div
              style={{
                ...S.status,
                ...(status.kind === 'ok' ? S.statusOk : {}),
                ...(status.kind === 'err' ? S.statusErr : {}),
                ...(status.kind === 'info' ? S.statusInfo : {}),
              }}
            >
              {status.msg}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 스타일 (인라인) — 빌더 globals.css 와 충돌 없이 적용
// ─────────────────────────────────────────────────────────────
const S: Record<string, CSSProperties> = {
  root: {
    marginBottom: 16,
    border: '1px solid #e9d5ff',
    borderRadius: 8,
    background: 'linear-gradient(180deg, #faf5ff 0%, #ffffff 100%)',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    padding: '12px 14px',
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 700,
    color: '#6b21a8',
  },
  title: { letterSpacing: '-0.2px' },
  chevron: { fontSize: 12, color: '#9333ea' },
  body: { padding: '0 14px 14px' },
  hint: {
    margin: '0 0 12px',
    fontSize: 12,
    color: '#6b7280',
    lineHeight: 1.5,
  },
  field: { display: 'block', marginBottom: 10 },
  label: {
    display: 'block',
    marginBottom: 4,
    fontSize: 12,
    fontWeight: 600,
    color: '#374151',
  },
  input: {
    width: '100%',
    padding: '8px 10px',
    border: '1px solid #d1d5db',
    borderRadius: 6,
    fontSize: 13,
    fontFamily: 'inherit',
    background: '#fff',
    boxSizing: 'border-box',
  },
  inputDisabled: { background: '#f3f4f6', cursor: 'not-allowed' },
  submit: {
    width: '100%',
    padding: 10,
    marginTop: 4,
    background: '#7c3aed',
    color: 'white',
    border: 'none',
    borderRadius: 6,
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'background 0.15s',
  },
  submitHover: { background: '#6d28d9' },
  submitDisabled: { opacity: 0.5, cursor: 'not-allowed' },
  status: {
    marginTop: 10,
    padding: '8px 10px',
    fontSize: 12,
    borderRadius: 4,
    lineHeight: 1.4,
  },
  statusInfo: { background: '#f3f4f6', color: '#374151' },
  statusOk: {
    background: '#f0fdf4',
    color: '#15803d',
    border: '1px solid #bbf7d0',
  },
  statusErr: {
    background: '#fef2f2',
    color: '#b91c1c',
    border: '1px solid #fecaca',
  },
};

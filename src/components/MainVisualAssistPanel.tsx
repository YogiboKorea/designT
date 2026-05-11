'use client';
/**
 * 메인 비주얼 어시스턴트 패널 (/builder PropertiesPanel 의 main 섹션 상단에 노출)
 *  · AI 자동 처리 옵션 (배경 제거 / 색상 매칭 — 현재 UI placeholder)
 *  · 레이아웃 프리셋 (기본/A/E/F 4종) — 클릭 시 bgColor + texts + height 한 번에 세팅
 *  · 배경 이미지 업로드 / cafe24 썸네일 가져오기는 기존 FileUploader 영역에서 처리
 */
import { CSSProperties, useState } from 'react';
import type { SectionData } from '../app/builder/types';
import { BUILDER_MAIN_PRESETS, getBuilderMainPresetById, type BuilderMainPreset } from '../data/builder-main-presets';
import { sampleEdgeColor, runBackgroundRemoval, loadImage, getContrastTextColor, isNeutralColor } from '../lib/ai-image';

interface Props {
  data: Extract<SectionData, { type: 'main' }>;
  onChange: (next: Extract<SectionData, { type: 'main' }>) => void;
}

export default function MainVisualAssistPanel({ data, onChange }: Props) {
  const [aiRemove, setAiRemove] = useState(false);
  const [aiMatchColor, setAiMatchColor] = useState(true);
  const [converting, setConverting] = useState(false);
  const [progress, setProgress] = useState('');

  const cloneTextsWithFreshIds = (preset: BuilderMainPreset) =>
    preset.texts.map((t) => ({
      ...t,
      id: `${t.id.split('-')[0]}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    }));

  /**
   * 스티커 라이브러리의 discount 스티커는 {discount}% 같은 템플릿 변수를 사용함.
   * 프리셋 적용 시 templateVars 에 기본값을 세팅해야 빈 placeholder({discount} 등)가
   * 그대로 노출되는 문제를 막을 수 있다. 기존 사용자 값이 있으면 보존.
   */
  const buildTemplateVars = (): Record<string, string | number> => ({
    discount: 30,
    startDate: '04.23',
    endDate: '04.30',
    ...(data.templateVars || {}),
  });

  const applyPreset = (preset: BuilderMainPreset) => {
    onChange({
      ...data,
      // 프리셋 한 번에 적용 — 기존 templateId / stickers 는 초기화
      templateId: undefined,
      templateVars: buildTemplateVars(),
      stickers: [],
      presetId: preset.id,
      bgColor: preset.bgColor,
      height: preset.height,
      decorations: preset.decorations,
      texts: cloneTextsWithFreshIds(preset),
    });
  };

  /**
   * 배너 스타일로 변환:
   *  1. 프리셋 결정 (선택돼 있으면 그것 / 이미지만 있으면 기본 타입)
   *  2. (옵션) 배경 자동 제거 — bgImage 누끼 처리
   *  3. (옵션) 색상 자동 매칭 — bgImage 가장자리 색을 샘플링해 프리셋 bgColor 대체
   *  4. 프리셋 적용 (texts + decorations + bgColor + height)
   */
  const handleConvertToBannerStyle = async () => {
    let targetPresetId = data.presetId;
    if (!targetPresetId) {
      if (!data.bgImage) {
        alert('프리셋을 먼저 선택하거나, 배경 이미지를 업로드 후 시도해주세요.');
        return;
      }
      targetPresetId = 'default';
    }
    const preset = getBuilderMainPresetById(targetPresetId);
    if (!preset) return;

    setConverting(true);
    let finalBgImage = data.bgImage;
    let finalBgColor = preset.bgColor;

    try {
      // 1) 배경 자동 제거 (체크 + 이미지 있음)
      if (aiRemove && data.bgImage) {
        setProgress('🤖 AI 배경 제거 중… (최초 1회 모델 다운로드 ~30MB)');
        try {
          finalBgImage = await runBackgroundRemoval(data.bgImage, (label, pct) => {
            setProgress(`🤖 ${label} ${pct}%`);
          });
        } catch (err) {
          console.error('[배경 제거 실패]', err);
          setProgress('⚠️ 배경 제거 실패 — 원본 그대로 진행');
          await new Promise((r) => setTimeout(r, 1200));
        }
      }

      // 2) 색상 자동 매칭 (체크 + 이미지 있음)
      if (aiMatchColor && data.bgImage) {
        setProgress('🎨 이미지 색상 샘플링…');
        try {
          // 누끼 처리된 이미지는 가장자리가 투명이라 색상 샘플이 무의미 → 원본 사용.
          const probe = await loadImage(data.bgImage);
          const sampled = sampleEdgeColor(probe, { edge: 'left', mixWhite: 0.25 });
          if (sampled) finalBgColor = sampled;
        } catch (err) {
          console.warn('[색상 매칭 실패]', err);
        }
      }

      // 3) 텍스트 색상 자동 조정 — 새 배경색 대비 가독성 확보.
      //    무채색(흰/검/회색) 텍스트만 대비색으로 교체. 노랑/주황/파랑 등 액센트 색은 그대로 유지.
      const contrast = getContrastTextColor(finalBgColor);
      const adjustedTexts = cloneTextsWithFreshIds(preset).map((t) => {
        const origColor = t.style.color;
        if (origColor && isNeutralColor(origColor)) {
          return { ...t, style: { ...t.style, color: contrast } };
        }
        return t;
      });

      // 4) 프리셋 적용
      onChange({
        ...data,
        bgImage: finalBgImage || data.bgImage,
        templateId: undefined,
        templateVars: buildTemplateVars(),
        stickers: [],
        presetId: preset.id,
        bgColor: finalBgColor,
        height: preset.height,
        decorations: preset.decorations,
        texts: adjustedTexts,
      });
      setProgress('✅ 배너 스타일 적용 완료');
      setTimeout(() => setProgress(''), 1500);
    } finally {
      setConverting(false);
    }
  };

  return (
    <div style={S.root}>
      {/* === AI 자동 처리 === */}
      <div style={S.card}>
        <div style={S.cardHeader}>
          <span style={S.cardEmoji}>🪄</span>
          <span style={S.cardTitle}>AI 자동 처리</span>
        </div>

        <label style={S.checkRow}>
          <input
            type="checkbox"
            checked={aiRemove}
            onChange={(e) => setAiRemove(e.target.checked)}
            style={S.check}
          />
          <div style={S.checkBody}>
            <div style={S.checkLabel}>배경 자동 제거</div>
            <div style={S.checkDesc}>피사체만 남기고 배경을 투명 처리 (~10초, 최초 1회 모델 다운로드)</div>
          </div>
        </label>

        <label style={S.checkRow}>
          <input
            type="checkbox"
            checked={aiMatchColor}
            onChange={(e) => setAiMatchColor(e.target.checked)}
            style={S.check}
          />
          <div style={S.checkBody}>
            <div style={S.checkLabel}>색상 자동 매칭</div>
            <div style={S.checkDesc}>이미지 가장자리 색을 샘플링해 배경에 반영</div>
          </div>
        </label>

        <button
          type="button"
          style={{ ...S.convertBtn, ...(converting ? S.convertBtnBusy : {}) }}
          onClick={handleConvertToBannerStyle}
          disabled={converting}
        >
          {converting ? '⏳ 처리 중…' : '🎨 배너 스타일로 변환'}
        </button>
        {progress && (
          <div style={S.progressBox}>{progress}</div>
        )}
        <p style={S.helperNote}>* 체크박스 옵션은 변환 시 자동 적용 / 이미지 색상을 샘플링해 배경에 매칭.</p>
      </div>

      {/* === 레이아웃 프리셋 (4종) === */}
      <div style={S.card}>
        <div style={S.cardHeader}>
          <span style={S.cardEmoji}>📐</span>
          <span style={S.cardTitle}>레이아웃 프리셋</span>
        </div>

        <div style={S.presetGrid}>
          {BUILDER_MAIN_PRESETS.map((p) => {
            const active = data.presetId === p.id;
            return (
              <button
                key={p.id}
                type="button"
                style={{ ...S.presetCard, ...(active ? S.presetCardActive : {}) }}
                onClick={() => applyPreset(p)}
                title={p.description}
              >
                <div
                  style={S.presetThumb}
                  dangerouslySetInnerHTML={{ __html: p.thumbnail }}
                />
                <div style={S.presetMeta}>
                  <span style={S.presetEmoji}>{p.emoji}</span>
                  <span style={S.presetLabel}>{p.label}</span>
                </div>
              </button>
            );
          })}
        </div>

        <p style={S.helperNote}>
          * 모든 프리셋에 <strong>할인율 / 기간</strong> 텍스트가 포함됩니다. 캔버스에서 텍스트 클릭으로 수정.
        </p>
      </div>
    </div>
  );
}

const S: Record<string, CSSProperties> = {
  root: { display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 18 },

  card: {
    border: '1px solid var(--border)',
    background: '#fff',
    borderRadius: 10,
    padding: '14px 14px 12px',
  },
  cardHeader: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 },
  cardEmoji: { fontSize: 16 },
  cardTitle: { fontSize: 13, fontWeight: 700, color: 'var(--text)' },

  checkRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 10,
    padding: '8px 0',
    cursor: 'pointer',
    borderTop: '1px dashed var(--border)',
  },
  check: { marginTop: 3, accentColor: 'var(--accent)', cursor: 'pointer' },
  checkBody: { flex: 1, minWidth: 0 },
  checkLabel: { fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 2 },
  checkDesc: { fontSize: 10, color: 'var(--text-muted)', lineHeight: 1.4 },

  convertBtn: {
    width: '100%',
    marginTop: 10,
    padding: '10px',
    background: 'var(--accent-soft)',
    color: 'var(--accent)',
    border: '1px dashed var(--accent)',
    borderRadius: 8,
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'background 0.12s ease',
  },
  convertBtnBusy: {
    background: '#f3f4f6',
    color: '#9ca3af',
    borderColor: '#d1d5db',
    cursor: 'not-allowed',
  },
  progressBox: {
    marginTop: 8,
    padding: '8px 10px',
    background: '#f8fafc',
    border: '1px solid var(--border)',
    borderRadius: 6,
    fontSize: 11,
    color: 'var(--text-muted)',
    textAlign: 'center',
    lineHeight: 1.5,
  },

  helperNote: {
    fontSize: 10,
    color: 'var(--text-subtle)',
    margin: '8px 0 0',
    lineHeight: 1.5,
  },

  presetGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 8,
  },
  presetCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    padding: 6,
    background: '#fff',
    border: '1px solid var(--border)',
    borderRadius: 8,
    cursor: 'pointer',
    transition: 'border-color 0.12s ease, box-shadow 0.12s ease, transform 0.12s ease',
    textAlign: 'left',
  },
  presetCardActive: {
    borderColor: 'var(--accent)',
    boxShadow: '0 0 0 3px var(--accent-soft)',
  },
  presetThumb: {
    width: '100%',
    aspectRatio: '16 / 9',
    borderRadius: 5,
    overflow: 'hidden',
    background: '#f3f4f6',
    display: 'flex',
  },
  presetMeta: { display: 'flex', alignItems: 'center', gap: 5, paddingLeft: 2 },
  presetEmoji: { fontSize: 13 },
  presetLabel: { fontSize: 11, fontWeight: 700, color: 'var(--text)' },
};

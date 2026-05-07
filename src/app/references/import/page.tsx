'use client';

import { CSSProperties, useRef, useState } from 'react';
import Link from 'next/link';
import AppShell from '@/components/AppShell';

/**
 * 레퍼런스 일괄 등록
 * ─────────────────────────────────────────────────────────────────
 * 다중 파일 선택 → 공통 카테고리/태그 적용 → 일괄 FTP 업로드 + DB 등록.
 *
 * 흐름:
 *   1. 공통 설정 입력 (카테고리, 플랫폼, 태그)
 *   2. 파일 다중 선택
 *   3. 각 파일별 제목 자동 추측 (파일명 기반, 수정 가능)
 *   4. "전체 업로드" 클릭
 *      → 각 파일에 대해:
 *         a. /api/ftp 업로드
 *         b. /api/references POST (공통 카테고리 + 개별 제목)
 *      → 진행률 표시
 *   5. 완료 후 갤러리로 이동 또는 추가 업로드
 * ─────────────────────────────────────────────────────────────────
 */

const CATEGORY_OPTIONS = [
  { value: 'web-banner', emoji: '🖥️', label: '웹 배너' },
  { value: 'sns', emoji: '📷', label: 'SNS' },
  { value: 'sns-story', emoji: '📱', label: 'SNS 세로형' },
  { value: 'mobile', emoji: '📱', label: '모바일' },
  { value: 'thumbnail', emoji: '🖼️', label: '썸네일' },
];

const PLATFORM_OPTIONS = [
  { value: '', emoji: '—', label: '미지정' },
  { value: 'instagram', emoji: '📷', label: 'Instagram' },
  { value: 'instagram-story', emoji: '📱', label: 'Instagram 스토리' },
  { value: 'facebook', emoji: 'f', label: 'Facebook' },
  { value: 'kakao', emoji: '💛', label: '카카오톡' },
  { value: 'naver-blog', emoji: 'N', label: '네이버 블로그' },
  { value: 'youtube', emoji: '▶', label: 'YouTube' },
  { value: 'cafe24', emoji: '🛒', label: '자사몰' },
  { value: 'smart-store', emoji: '🏪', label: '스마트스토어' },
];

interface PendingItem {
  id: string;
  file: File;
  title: string;
  preview: string;
  status: 'pending' | 'uploading' | 'done' | 'error';
  errorMsg?: string;
}

export default function ReferencesImportPage() {
  // 공통 설정
  const [commonCategory, setCommonCategory] = useState('web-banner');
  const [commonPlatform, setCommonPlatform] = useState('');
  const [commonTags, setCommonTags] = useState('');

  // 파일 큐
  const [items, setItems] = useState<PendingItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [completed, setCompleted] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onFilesAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList) return;

    const newItems: PendingItem[] = Array.from(fileList).map((f) => {
      const id = `${f.name}-${f.size}-${Date.now()}-${Math.random()}`;
      const title = f.name.replace(/\.(png|jpe?g|webp|gif|avif)$/i, '');

      // 미리보기 (FileReader 비동기지만, state 에 들어간 뒤 갱신됨)
      const item: PendingItem = {
        id,
        file: f,
        title,
        preview: '',
        status: 'pending',
      };

      const reader = new FileReader();
      reader.onload = (ev) => {
        const data = String(ev.target?.result ?? '');
        setItems((prev) =>
          prev.map((it) => (it.id === id ? { ...it, preview: data } : it)),
        );
      };
      reader.readAsDataURL(f);

      return item;
    });

    setItems((prev) => [...prev, ...newItems]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const updateTitle = (id: string, title: string) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, title } : it)),
    );
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  const clearAll = () => {
    if (items.length === 0) return;
    if (!confirm(`${items.length}개 파일을 모두 비우시겠습니까?`)) return;
    setItems([]);
    setCompleted(0);
  };

  const submitAll = async () => {
    if (items.length === 0) return;
    if (!commonCategory) {
      alert('공통 카테고리를 선택하세요.');
      return;
    }

    setSubmitting(true);
    setProgress({ done: 0, total: items.length });
    let doneCount = 0;
    let okCount = 0;

    const tagsList = commonTags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    for (const item of items) {
      // 이미 완료 / 에러 처리된 건 skip
      if (item.status === 'done') {
        doneCount += 1;
        okCount += 1;
        setProgress({ done: doneCount, total: items.length });
        continue;
      }

      // 처리 시작 표시
      setItems((prev) =>
        prev.map((it) =>
          it.id === item.id ? { ...it, status: 'uploading' } : it,
        ),
      );

      try {
        // 1. FTP 업로드
        const fd = new FormData();
        fd.append('file', item.file);
        const ftpRes = await fetch('/api/ftp', { method: 'POST', body: fd });
        const ftpJson = await ftpRes.json();
        if (!ftpRes.ok || !ftpJson.success || !ftpJson.imageUrl) {
          throw new Error(ftpJson.message || 'FTP 업로드 실패');
        }

        // 2. DB 등록
        const dbRes = await fetch('/api/references', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: item.title.trim() || item.file.name,
            imageUrl: ftpJson.imageUrl,
            category: commonCategory,
            platform: commonPlatform || null,
            tags: tagsList,
          }),
        });
        const dbJson = await dbRes.json();
        if (!dbRes.ok || !dbJson.ok) {
          throw new Error(dbJson.message || '등록 실패');
        }

        setItems((prev) =>
          prev.map((it) =>
            it.id === item.id ? { ...it, status: 'done' } : it,
          ),
        );
        okCount += 1;
      } catch (err: any) {
        setItems((prev) =>
          prev.map((it) =>
            it.id === item.id
              ? { ...it, status: 'error', errorMsg: err?.message ?? '오류' }
              : it,
          ),
        );
      }

      doneCount += 1;
      setProgress({ done: doneCount, total: items.length });
    }

    setSubmitting(false);
    setCompleted(okCount);
  };

  const pendingCount = items.filter((i) => i.status !== 'done').length;
  const errorCount = items.filter((i) => i.status === 'error').length;

  return (
    <AppShell>
      <div style={S.container}>
        <header style={S.header}>
          <div style={S.crumb}>
            <Link href="/" style={S.crumbLink}>홈</Link>
            <span style={S.crumbSep}>/</span>
            <Link href="/prompt-builder" style={S.crumbLink}>디자인 프롬프트 생성</Link>
            <span style={S.crumbSep}>/</span>
            <span style={S.crumbActive}>일괄 등록</span>
          </div>
          <h1 style={S.title}>📥 레퍼런스 일괄 등록</h1>
          <p style={S.subtitle}>
            여러 이미지 파일을 한꺼번에 업로드합니다. 공통 카테고리/태그가 모든 파일에 적용됩니다.
          </p>
        </header>

        {/* Step 1: 공통 설정 */}
        <section style={S.section}>
          <h2 style={S.h2}>① 공통 설정 (모든 파일에 동일 적용)</h2>
          <div style={S.row2}>
            <div>
              <label style={S.label}>카테고리 *</label>
              <select
                value={commonCategory}
                onChange={(e) => setCommonCategory(e.target.value)}
                style={S.select}
                disabled={submitting}
              >
                {CATEGORY_OPTIONS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.emoji} {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={S.label}>플랫폼 (선택)</label>
              <select
                value={commonPlatform}
                onChange={(e) => setCommonPlatform(e.target.value)}
                style={S.select}
                disabled={submitting}
              >
                {PLATFORM_OPTIONS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.emoji} {p.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div style={{ marginTop: 10 }}>
            <label style={S.label}>공통 태그 (쉼표 구분)</label>
            <input
              type="text"
              value={commonTags}
              onChange={(e) => setCommonTags(e.target.value)}
              placeholder="예: 봄, 핑크, 미니멀"
              style={S.input}
              disabled={submitting}
            />
          </div>
        </section>

        {/* Step 2: 파일 추가 */}
        <section style={S.section}>
          <h2 style={S.h2}>
            ② 파일 추가
            {items.length > 0 && (
              <span style={S.h2Badge}>{items.length}개</span>
            )}
          </h2>

          <div style={S.fileAddRow}>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={onFilesAdd}
              style={S.fileInput}
              disabled={submitting}
            />
            {items.length > 0 && (
              <button
                type="button"
                onClick={clearAll}
                style={S.clearBtn}
                disabled={submitting}
              >
                전체 비우기
              </button>
            )}
          </div>

          {items.length > 0 && (
            <div style={S.itemsGrid}>
              {items.map((it) => (
                <div
                  key={it.id}
                  style={{
                    ...S.itemCard,
                    ...(it.status === 'done' ? S.itemCardDone : {}),
                    ...(it.status === 'error' ? S.itemCardError : {}),
                    ...(it.status === 'uploading' ? S.itemCardUploading : {}),
                  }}
                >
                  {it.preview ? (
                    <img src={it.preview} alt="" style={S.itemPreview} />
                  ) : (
                    <div style={{ ...S.itemPreview, ...S.itemPreviewLoading }}>
                      ...
                    </div>
                  )}

                  <input
                    type="text"
                    value={it.title}
                    onChange={(e) => updateTitle(it.id, e.target.value)}
                    style={S.itemTitleInput}
                    disabled={submitting || it.status === 'done'}
                  />

                  <div style={S.itemStatus}>
                    {it.status === 'pending' && (
                      <span style={S.statusPending}>대기 중</span>
                    )}
                    {it.status === 'uploading' && (
                      <span style={S.statusUploading}>⟳ 업로드 중...</span>
                    )}
                    {it.status === 'done' && (
                      <span style={S.statusDone}>✓ 완료</span>
                    )}
                    {it.status === 'error' && (
                      <span style={S.statusError} title={it.errorMsg}>
                        ✕ 오류
                      </span>
                    )}
                  </div>

                  {it.status !== 'done' && !submitting && (
                    <button
                      type="button"
                      onClick={() => removeItem(it.id)}
                      style={S.itemRemove}
                      title="제거"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Step 3: 일괄 업로드 */}
        {items.length > 0 && (
          <section style={S.section}>
            <h2 style={S.h2}>③ 일괄 업로드</h2>

            {submitting && (
              <div style={S.progressBox}>
                <div style={S.progressBar}>
                  <div
                    style={{
                      ...S.progressFill,
                      width: `${progress.total === 0 ? 0 : (progress.done / progress.total) * 100}%`,
                    }}
                  />
                </div>
                <div style={S.progressLabel}>
                  {progress.done} / {progress.total} 처리 중...
                </div>
              </div>
            )}

            {!submitting && completed > 0 && (
              <div style={S.successBox}>
                ✅ {completed}개 등록 완료
                {errorCount > 0 && ` (오류 ${errorCount}개)`}
                {' · '}
                <Link href="/references" style={S.successLink}>
                  레퍼런스 갤러리에서 확인 →
                </Link>
              </div>
            )}

            {!submitting && (
              <div style={S.actionRow}>
                <button
                  type="button"
                  onClick={submitAll}
                  disabled={pendingCount === 0}
                  style={{
                    ...S.submitBtn,
                    ...(pendingCount === 0 ? S.submitBtnDisabled : {}),
                  }}
                >
                  {pendingCount === 0
                    ? '✓ 모두 완료됨'
                    : `🚀 ${pendingCount}개 일괄 업로드`}
                </button>
                {errorCount > 0 && (
                  <span style={S.errorHint}>
                    ⚠️ 오류 {errorCount}개 — 다시 시도하려면 위에서 재업로드
                  </span>
                )}
              </div>
            )}
          </section>
        )}
      </div>
    </AppShell>
  );
}

const S: Record<string, CSSProperties> = {
  container: { maxWidth: 1100, margin: '0 auto', padding: '28px 28px' },
  header: { marginBottom: 20 },
  crumb: { fontSize: 12, color: '#94a3b8', marginBottom: 8, display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' },
  crumbLink: { color: '#64748b', textDecoration: 'none' },
  crumbSep: { color: '#cbd5e1' },
  crumbActive: { color: '#0f172a', fontWeight: 600 },
  title: { fontSize: 22, fontWeight: 800, margin: 0, color: '#0f172a' },
  subtitle: { fontSize: 13, color: '#64748b', marginTop: 6, lineHeight: 1.6 },

  section: {
    background: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  h2: { fontSize: 15, fontWeight: 700, margin: '0 0 14px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 },
  h2Badge: {
    fontSize: 11,
    fontWeight: 600,
    padding: '2px 8px',
    background: '#f1f5f9',
    color: '#475569',
    borderRadius: 10,
  },

  row2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 },
  label: { display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 },
  input: { width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, boxSizing: 'border-box' },
  select: { width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, background: '#fff', boxSizing: 'border-box' },

  fileAddRow: { display: 'flex', gap: 10, alignItems: 'center', marginBottom: 14 },
  fileInput: { flex: 1, padding: 8, border: '1px dashed #cbd5e1', borderRadius: 6, fontSize: 12 },
  clearBtn: {
    padding: '8px 14px',
    background: '#fff',
    color: '#dc2626',
    border: '1px solid #fecaca',
    borderRadius: 6,
    fontSize: 12,
    cursor: 'pointer',
  },

  itemsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
    gap: 12,
  },
  itemCard: {
    position: 'relative',
    padding: 10,
    background: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: 8,
  },
  itemCardDone: { background: '#f0fdf4', borderColor: '#bbf7d0' },
  itemCardError: { background: '#fef2f2', borderColor: '#fecaca' },
  itemCardUploading: { background: '#eff6ff', borderColor: '#bfdbfe' },

  itemPreview: { width: '100%', aspectRatio: '4/3', objectFit: 'cover', borderRadius: 4, background: '#f3f4f6', display: 'block', marginBottom: 8 },
  itemPreviewLoading: { display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 11 },

  itemTitleInput: { width: '100%', padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 12, marginBottom: 6, boxSizing: 'border-box' },

  itemStatus: { fontSize: 11 },
  statusPending: { color: '#6b7280' },
  statusUploading: { color: '#1e40af', fontWeight: 600 },
  statusDone: { color: '#15803d', fontWeight: 700 },
  statusError: { color: '#b91c1c', fontWeight: 700, cursor: 'help' },

  itemRemove: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: '50%',
    border: 0,
    background: 'rgba(220, 38, 38, 0.85)',
    color: '#fff',
    fontSize: 11,
    cursor: 'pointer',
  },

  progressBox: { marginBottom: 12 },
  progressBar: { width: '100%', height: 8, background: '#e2e8f0', borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', background: '#3b82f6', transition: 'width 0.2s' },
  progressLabel: { marginTop: 6, fontSize: 12, color: '#475569' },

  successBox: { padding: '10px 14px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6, fontSize: 12, color: '#15803d', marginBottom: 12 },
  successLink: { color: '#15803d', fontWeight: 700, textDecoration: 'underline' },

  actionRow: { display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' },
  submitBtn: {
    padding: '12px 24px',
    background: '#10b981',
    color: '#fff',
    border: 0,
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
  },
  submitBtnDisabled: { background: '#a7f3d0', cursor: 'not-allowed' },
  errorHint: { fontSize: 12, color: '#b91c1c' },
};

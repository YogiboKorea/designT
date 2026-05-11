'use client';

import { useEffect, useState, CSSProperties, useRef } from 'react';
import AppShell from '@/components/AppShell';
import SafeImage from '@/components/SafeImage';

interface ReferenceItem {
  _id: string;
  title: string;
  imageUrl: string;
  category: string;
  platform?: string | null;
  tags: string[];
  visualNotes?: string;
  active: boolean;
  createdAt: string;
}

const CATEGORY_OPTIONS = [
  { value: 'web-banner', emoji: '🖥️', label: '웹 배너 (자사몰/스마트스토어 가로형)' },
  { value: 'sns',        emoji: '📷', label: 'SNS (인스타 정사각, 카카오톡 등)' },
  { value: 'sns-story',  emoji: '📱', label: 'SNS 세로형 (스토리/릴스)' },
  { value: 'mobile',     emoji: '📱', label: '모바일 메인/히어로' },
  { value: 'thumbnail',  emoji: '🖼️', label: '썸네일 (작은 사이즈)' },
];

const PLATFORM_OPTIONS = [
  { value: '',                emoji: '—',  label: '미지정' },
  { value: 'instagram',       emoji: '📷', label: 'Instagram (피드)' },
  { value: 'instagram-story', emoji: '📱', label: 'Instagram (스토리/릴스)' },
  { value: 'facebook',        emoji: 'f',  label: 'Facebook' },
  { value: 'kakao',           emoji: '💛', label: '카카오톡' },
  { value: 'naver-blog',      emoji: 'N',  label: '네이버 블로그' },
  { value: 'youtube',         emoji: '▶',  label: 'YouTube 썸네일' },
  { value: 'cafe24',          emoji: '🛒', label: '자사몰 (Cafe24)' },
  { value: 'smart-store',     emoji: '🏪', label: '스마트스토어' },
];

export default function ReferencesPage() {
  const [items, setItems] = useState<ReferenceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState<string>('all');

  // 등록 폼
  const [showForm, setShowForm] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState('web-banner');
  const [formPlatform, setFormPlatform] = useState('');
  const [formTags, setFormTags] = useState('');
  const [formVisualNotes, setFormVisualNotes] = useState('');
  const [formFile, setFormFile] = useState<File | null>(null);
  const [formPreview, setFormPreview] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadItems = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/references?limit=200');
      const json = await res.json();
      if (json.ok) setItems(json.items);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, []);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setFormFile(f);
    if (f) {
      // 로컬 미리보기
      const reader = new FileReader();
      reader.onload = (ev) => setFormPreview(String(ev.target?.result ?? ''));
      reader.readAsDataURL(f);
      // 제목 비어있으면 파일명에서 자동 채움
      if (!formTitle) setFormTitle(f.name.replace(/\.(png|jpe?g|webp|gif)$/i, ''));
    } else {
      setFormPreview('');
    }
  };

  const resetForm = () => {
    setFormTitle('');
    setFormCategory('web-banner');
    setFormPlatform('');
    setFormTags('');
    setFormVisualNotes('');
    setFormFile(null);
    setFormPreview('');
    setErrorMsg('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const submitForm = async () => {
    setErrorMsg('');

    if (!formTitle.trim()) {
      setErrorMsg('제목을 입력하세요.');
      return;
    }
    if (!formFile) {
      setErrorMsg('이미지 파일을 선택하세요.');
      return;
    }

    setSubmitting(true);
    try {
      // 1. FTP 업로드
      const fd = new FormData();
      fd.append('file', formFile);
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
          title: formTitle.trim(),
          imageUrl: ftpJson.imageUrl,
          category: formCategory,
          platform: formPlatform || null,
          tags: formTags.split(',').map((t) => t.trim()).filter(Boolean),
          visualNotes: formVisualNotes.trim(),
        }),
      });
      const dbJson = await dbRes.json();
      if (!dbRes.ok || !dbJson.ok) {
        throw new Error(dbJson.message || '등록 실패');
      }

      // 3. 폼 초기화 + 목록 새로고침
      resetForm();
      setShowForm(false);
      loadItems();
    } catch (err: any) {
      setErrorMsg(err?.message ?? '알 수 없는 오류');
    } finally {
      setSubmitting(false);
    }
  };

  const removeItem = async (id: string) => {
    if (!confirm('이 레퍼런스를 삭제하시겠습니까? (목록에서 숨김 처리)')) return;
    const res = await fetch(`/api/references/${id}`, { method: 'DELETE' });
    const json = await res.json();
    if (json.ok) loadItems();
    else alert('삭제 실패: ' + (json.message ?? ''));
  };

  const filtered =
    filterCategory === 'all'
      ? items
      : items.filter((i) => i.category === filterCategory);

  return (
    <AppShell>
      <div style={S.page}>

      <div style={S.container}>
        <div style={S.header}>
          <div>
            <h1 style={S.title}>📚 레퍼런스 갤러리</h1>
            <div style={S.subtitle}>
              캠페인 작업 시 톤/스타일 참고용 이미지. 카테고리별로 분류됩니다.
            </div>
          </div>
          <button
            type="button"
            style={S.addBtn}
            onClick={() => {
              setShowForm((v) => !v);
              if (!showForm) resetForm();
            }}
          >
            {showForm ? '✕ 닫기' : '➕ 새 레퍼런스 추가'}
          </button>
        </div>

        {/* 등록 폼 */}
        {showForm && (
          <div style={S.formBox}>
            <h3 style={S.formTitle}>새 레퍼런스 추가</h3>

            <div style={S.formRow}>
              <label style={S.label}>이미지 파일 *</label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={onFileChange}
                style={S.input}
              />
              {formPreview && (
                <div style={S.previewBox}>
                  <img src={formPreview} alt="미리보기" style={S.previewImg} />
                </div>
              )}
            </div>

            <div style={S.formRow}>
              <label style={S.label}>제목 *</label>
              <input
                type="text"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="예: 봄 시즌 핑크 톤 배너"
                style={S.input}
              />
            </div>

            <div style={S.formGrid2}>
              <div>
                <label style={S.label}>카테고리 *</label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  style={S.select}
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
                  value={formPlatform}
                  onChange={(e) => setFormPlatform(e.target.value)}
                  style={S.select}
                >
                  {PLATFORM_OPTIONS.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.emoji} {p.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={S.formRow}>
              <label style={S.label}>태그 (쉼표 구분)</label>
              <input
                type="text"
                value={formTags}
                onChange={(e) => setFormTags(e.target.value)}
                placeholder="예: 봄, 핑크, 미니멀"
                style={S.input}
              />
            </div>

            <div style={S.formRow}>
              <label style={S.label}>시각 메모 (AI 프롬프트 보충용, 선택)</label>
              <textarea
                value={formVisualNotes}
                onChange={(e) => setFormVisualNotes(e.target.value)}
                placeholder="예: 파스텔 색감, 산세리프 폰트, 좌측 텍스트/우측 제품 분할 구도"
                rows={2}
                style={S.textarea}
              />
            </div>

            {errorMsg && <div style={S.errorBox}>⚠️ {errorMsg}</div>}

            <div style={S.formActions}>
              <button
                type="button"
                onClick={submitForm}
                disabled={submitting}
                style={{
                  ...S.submitBtn,
                  ...(submitting ? S.submitBtnDisabled : {}),
                }}
              >
                {submitting ? '업로드 중...' : '✓ 등록'}
              </button>
              <button type="button" onClick={resetForm} style={S.resetBtn}>
                초기화
              </button>
            </div>
          </div>
        )}

        {/* 카테고리 필터 */}
        <div style={S.filterRow}>
          <button
            type="button"
            onClick={() => setFilterCategory('all')}
            style={{
              ...S.filterChip,
              ...(filterCategory === 'all' ? S.filterChipActive : {}),
            }}
          >
            전체 ({items.length})
          </button>
          {CATEGORY_OPTIONS.map((c) => {
            const cnt = items.filter((i) => i.category === c.value).length;
            return (
              <button
                key={c.value}
                type="button"
                onClick={() => setFilterCategory(c.value)}
                style={{
                  ...S.filterChip,
                  ...(filterCategory === c.value ? S.filterChipActive : {}),
                }}
              >
                {c.emoji} {c.label.split(' ')[0]} ({cnt})
              </button>
            );
          })}
        </div>

        {/* 그리드 */}
        {loading ? (
          <div style={S.empty}>불러오는 중...</div>
        ) : filtered.length === 0 ? (
          <div style={S.empty}>
            등록된 레퍼런스가 없습니다.
            <br />
            <span style={{ fontSize: 12, color: '#9ca3af' }}>
              ➕ 새 레퍼런스 추가 버튼으로 등록하세요.
            </span>
          </div>
        ) : (
          <div style={S.grid}>
            {filtered.map((item) => (
              <div key={item._id} style={S.card}>
                <img
                  src={item.imageUrl}
                  alt={item.title}
                  style={S.cardImg}
                />
                <div style={S.cardBody}>
                  <div style={S.cardCategory}>
                    {CATEGORY_OPTIONS.find((c) => c.value === item.category)?.emoji ?? '📌'}
                    {' '}
                    {CATEGORY_OPTIONS.find((c) => c.value === item.category)?.label.split(' ')[0] ?? item.category}
                  </div>
                  <div style={S.cardTitle}>{item.title}</div>
                  {item.tags?.length > 0 && (
                    <div style={S.cardTags}>
                      {item.tags.map((t) => (
                        <span key={t} style={S.tag}>#{t}</span>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => removeItem(item._id)}
                  style={S.deleteBtn}
                  title="삭제"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      </div>
    </AppShell>
  );
}

const S: Record<string, CSSProperties> = {
  page: { minHeight: '100vh', background: '#f9fafb' },
  container: { maxWidth: 1280, margin: '0 auto', padding: '24px 20px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 },
  title: { fontSize: 22, fontWeight: 800, margin: 0 },
  subtitle: { fontSize: 12, color: '#6b7280', marginTop: 4 },
  addBtn: {
    padding: '10px 18px',
    background: '#7c3aed',
    color: '#fff',
    border: 0,
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
  },

  formBox: {
    background: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  formTitle: { fontSize: 15, fontWeight: 700, margin: '0 0 14px' },
  formRow: { marginBottom: 12 },
  formGrid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 },
  label: { display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 },
  input: { width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, boxSizing: 'border-box' },
  select: { width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, background: '#fff', boxSizing: 'border-box' },
  textarea: { width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' },

  previewBox: { marginTop: 8, padding: 8, background: '#f9fafb', border: '1px dashed #d1d5db', borderRadius: 6 },
  previewImg: { maxWidth: 240, maxHeight: 160, objectFit: 'contain', display: 'block' },

  errorBox: { padding: '8px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, color: '#b91c1c', fontSize: 12, marginBottom: 10 },

  formActions: { display: 'flex', gap: 8 },
  submitBtn: {
    padding: '10px 22px',
    background: '#10b981',
    color: '#fff',
    border: 0,
    borderRadius: 6,
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
  },
  submitBtnDisabled: { background: '#a7f3d0', cursor: 'not-allowed' },
  resetBtn: {
    padding: '10px 18px',
    background: '#fff',
    color: '#6b7280',
    border: '1px solid #d1d5db',
    borderRadius: 6,
    fontSize: 13,
    cursor: 'pointer',
  },

  filterRow: { display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' },
  filterChip: {
    padding: '6px 12px',
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: '#d1d5db',
    borderRadius: 16,
    background: '#fff',
    fontSize: 12,
    cursor: 'pointer',
    color: '#4b5563',
  },
  filterChipActive: {
    background: '#7c3aed',
    color: '#fff',
    borderColor: '#7c3aed',
    fontWeight: 700,
  },

  empty: { padding: '60px 0', textAlign: 'center', color: '#6b7280', fontSize: 14, lineHeight: 1.8 },

  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: 14,
  },
  card: {
    position: 'relative',
    background: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: 10,
    overflow: 'hidden',
  },
  cardImg: { width: '100%', aspectRatio: '16/10', objectFit: 'cover', display: 'block', background: '#f3f4f6' },
  cardBody: { padding: 10 },
  cardCategory: { fontSize: 10, color: '#6b7280', marginBottom: 4 },
  cardTitle: { fontSize: 13, fontWeight: 600, marginBottom: 6 },
  cardTags: { display: 'flex', gap: 4, flexWrap: 'wrap' },
  tag: { fontSize: 10, color: '#7c3aed', background: '#faf5ff', padding: '2px 6px', borderRadius: 4 },

  deleteBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    border: 0,
    borderRadius: '50%',
    background: 'rgba(220, 38, 38, 0.85)',
    color: '#fff',
    fontSize: 12,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
};

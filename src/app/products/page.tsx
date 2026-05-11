'use client';
/**
 * /products — 제품 사진 라이브러리 관리 페이지
 *
 * 기능:
 *   - 카테고리별 필터 + 그리드 보기
 *   - 새 제품 추가 (이미지 업로드 → FTP → DB 저장)
 *   - 단건 삭제 / 활성화 토글
 */
import { useState, useEffect, CSSProperties } from 'react';
import AppShell from '@/components/AppShell';

interface Product {
  _id: string;
  category: 'beanbag' | 'body-pillow' | 'plush';
  variant?: string;
  nameKr: string;
  nameEn: string;
  productImageUrl: string;
  thumbnailUrl?: string;
  visualNotes?: string;
  tags: string[];
  recommendedTool?: string;
  active: boolean;
}

const CATEGORIES = [
  { id: 'beanbag', emoji: '🛋', label: '빈백' },
  { id: 'body-pillow', emoji: '🤗', label: '바디필로우' },
  { id: 'plush', emoji: '🧸', label: '인형' },
];

export default function ProductsPage() {
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [showAddForm, setShowAddForm] = useState(false);

  // 신규 등록 폼 상태
  const [newCategory, setNewCategory] = useState<'beanbag' | 'body-pillow' | 'plush'>('beanbag');
  const [newVariant, setNewVariant] = useState('');
  const [newNameKr, setNewNameKr] = useState('');
  const [newNameEn, setNewNameEn] = useState('');
  const [newTags, setNewTags] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [newRecommendedTool, setNewRecommendedTool] = useState('');
  const [newImageBase64, setNewImageBase64] = useState('');
  const [newImagePreview, setNewImagePreview] = useState('');
  const [newImageFilename, setNewImageFilename] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterCategory) params.set('category', filterCategory);
      params.set('limit', '200');
      const res = await fetch(`/api/products?${params.toString()}`);
      const json = await res.json();
      if (json.ok) setItems(json.items);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterCategory]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setCreateError('이미지 파일만 가능합니다.');
      return;
    }
    setNewImageFilename(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setNewImageBase64(dataUrl);
      setNewImagePreview(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const submitCreate = async () => {
    setCreateError('');
    if (!newNameKr.trim() || !newNameEn.trim()) {
      setCreateError('제품명(한글/영문) 은 필수입니다.');
      return;
    }
    if (!newImageBase64) {
      setCreateError('제품 이미지를 선택해주세요.');
      return;
    }

    setCreating(true);
    try {
      const tags = newTags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: newCategory,
          variant: newVariant || undefined,
          nameKr: newNameKr,
          nameEn: newNameEn,
          imageBase64: newImageBase64,
          filename: `product_${newCategory}_${Date.now()}_${newImageFilename}`,
          tags,
          visualNotes: newNotes,
          recommendedTool: newRecommendedTool || undefined,
        }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.message || '등록 실패');

      // 폼 리셋
      setNewVariant('');
      setNewNameKr('');
      setNewNameEn('');
      setNewTags('');
      setNewNotes('');
      setNewRecommendedTool('');
      setNewImageBase64('');
      setNewImagePreview('');
      setNewImageFilename('');
      setShowAddForm(false);

      await load();
    } catch (err: any) {
      setCreateError(err?.message ?? '등록 실패');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string, nameKr: string) => {
    if (!confirm(`"${nameKr}" 을(를) 삭제하시겠습니까?`)) return;
    const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
    const json = await res.json();
    if (json.ok) setItems((prev) => prev.filter((p) => p._id !== id));
    else alert('삭제 실패: ' + json.message);
  };

  const toggleActive = async (id: string, current: boolean) => {
    const res = await fetch(`/api/products/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !current }),
    });
    const json = await res.json();
    if (json.ok) {
      setItems((prev) =>
        prev.map((p) => (p._id === id ? { ...p, active: !current } : p)),
      );
    }
  };

  return (
    <AppShell>
      <div style={S.page}>
        <header style={S.hd}>
          <div>
            <h1 style={S.h1}>📦 제품 사진 라이브러리</h1>
            <p style={S.sub}>
              등록된 제품: <strong>{items.length}</strong>개 — 프롬프트 빌더에서
              선택하면 자동으로 이미지 URL이 프롬프트에 포함됩니다.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowAddForm(!showAddForm)}
            style={S.btnPrimary}
          >
            {showAddForm ? '✕ 취소' : '+ 새 제품 추가'}
          </button>
        </header>

        {/* 신규 등록 폼 */}
        {showAddForm && (
          <section style={S.addForm}>
            <h2 style={S.addTitle}>새 제품 등록</h2>

            <div style={S.formGrid}>
              <div style={S.formCol}>
                <label style={S.label}>카테고리 *</label>
                <select
                  value={newCategory}
                  onChange={(e) =>
                    setNewCategory(e.target.value as any)
                  }
                  style={S.input}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.emoji} {c.label}
                    </option>
                  ))}
                </select>

                <label style={S.label}>한글 제품명 *</label>
                <input
                  type="text"
                  value={newNameKr}
                  onChange={(e) => setNewNameKr(e.target.value)}
                  placeholder="예: Mate 베어 핑크"
                  style={S.input}
                />

                <label style={S.label}>영문 제품명 * (AI 프롬프트용)</label>
                <input
                  type="text"
                  value={newNameEn}
                  onChange={(e) => setNewNameEn(e.target.value)}
                  placeholder="예: Mate Bear Pink"
                  style={S.input}
                />

                <label style={S.label}>세부 형태 (선택)</label>
                <input
                  type="text"
                  value={newVariant}
                  onChange={(e) => setNewVariant(e.target.value)}
                  placeholder="예: animal, roll, single 등"
                  style={S.input}
                />

                <label style={S.label}>태그 (쉼표 구분)</label>
                <input
                  type="text"
                  value={newTags}
                  onChange={(e) => setNewTags(e.target.value)}
                  placeholder="핑크, 대형, 베스트셀러"
                  style={S.input}
                />

                <label style={S.label}>시각적 메모 (선택)</label>
                <textarea
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="둥근 곰돌이 형태, 핑크색, 작은 귀, 스마일 페이스"
                  rows={2}
                  style={S.textarea}
                />

                <label style={S.label}>추천 AI 도구 (선택)</label>
                <select
                  value={newRecommendedTool}
                  onChange={(e) => setNewRecommendedTool(e.target.value)}
                  style={S.input}
                >
                  <option value="">자동 (지정 없음)</option>
                  <option value="chatgpt">🤖 ChatGPT (DALL-E)</option>
                  <option value="midjourney">🎨 Midjourney</option>
                  <option value="gemini">✨ Gemini</option>
                  <option value="fal">🌊 fal.ai (Flux)</option>
                  <option value="nanobanana">🍌 NanoBanana</option>
                </select>
              </div>

              <div style={S.formCol}>
                <label style={S.label}>제품 이미지 *</label>
                <div style={S.imgPickBox}>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFile}
                    id="prod-img-upload"
                    style={{ display: 'none' }}
                  />
                  {newImagePreview ? (
                    <>
                      <img
                        src={newImagePreview}
                        alt="미리보기"
                        style={S.imgPreview}
                      />
                      <label
                        htmlFor="prod-img-upload"
                        style={S.imgChangeBtn}
                      >
                        🔄 다른 이미지 선택
                      </label>
                    </>
                  ) : (
                    <label
                      htmlFor="prod-img-upload"
                      style={S.imgPickEmpty}
                    >
                      <span style={{ fontSize: 36 }}>📎</span>
                      <span>이미지 선택</span>
                      <span style={S.imgPickHint}>JPG/PNG/WEBP — FTP 자동 업로드</span>
                    </label>
                  )}
                </div>

                <button
                  type="button"
                  onClick={submitCreate}
                  disabled={creating}
                  style={{
                    ...S.submitBtn,
                    ...(creating ? S.submitBtnDisabled : {}),
                  }}
                >
                  {creating ? '등록 중...' : '✅ 라이브러리에 등록'}
                </button>

                {createError && (
                  <div style={S.errBox}>❌ {createError}</div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* 카테고리 필터 */}
        <div style={S.filters}>
          <button
            type="button"
            onClick={() => setFilterCategory('')}
            style={{
              ...S.filterBtn,
              ...(!filterCategory ? S.filterBtnActive : {}),
            }}
          >
            전체
          </button>
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setFilterCategory(c.id)}
              style={{
                ...S.filterBtn,
                ...(filterCategory === c.id ? S.filterBtnActive : {}),
              }}
            >
              {c.emoji} {c.label}
            </button>
          ))}
        </div>

        {/* 그리드 */}
        {loading ? (
          <div style={S.empty}>불러오는 중…</div>
        ) : items.length === 0 ? (
          <div style={S.empty}>
            <p>아직 등록된 제품이 없습니다.</p>
            <button
              type="button"
              onClick={() => setShowAddForm(true)}
              style={S.btnPrimary}
            >
              + 첫 제품 등록하기
            </button>
          </div>
        ) : (
          <div style={S.grid}>
            {items.map((p) => {
              const cat = CATEGORIES.find((c) => c.id === p.category);
              return (
                <article
                  key={p._id}
                  style={{
                    ...S.card,
                    ...(p.active ? {} : S.cardInactive),
                  }}
                >
                  <div
                    style={{
                      ...S.cardImg,
                      backgroundImage: `url(${p.thumbnailUrl ?? p.productImageUrl})`,
                    }}
                  />
                  <div style={S.cardBody}>
                    <div style={S.cardHead}>
                      <span style={S.cardCategory}>
                        {cat?.emoji} {cat?.label}
                      </span>
                      {p.recommendedTool && (
                        <span style={S.recBadge}>
                          → {p.recommendedTool}
                        </span>
                      )}
                    </div>
                    <h3 style={S.cardName}>{p.nameKr}</h3>
                    <div style={S.cardNameEn}>{p.nameEn}</div>

                    {p.tags?.length > 0 && (
                      <div style={S.tagRow}>
                        {p.tags.slice(0, 4).map((t) => (
                          <span key={t} style={S.tag}>
                            {t}
                          </span>
                        ))}
                      </div>
                    )}

                    <div style={S.cardActions}>
                      <button
                        type="button"
                        onClick={() => toggleActive(p._id, p.active)}
                        style={{
                          ...S.actionBtn,
                          ...(p.active ? S.actionBtnOn : S.actionBtnOff),
                        }}
                      >
                        {p.active ? '✓ 활성' : '⊘ 비활성'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(p._id, p.nameKr)}
                        style={S.actionBtnDanger}
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}

// ─────────────────────────────────────────────────────────────
const S: Record<string, CSSProperties> = {
  page: {
    padding: '24px 24px 80px',
    maxWidth: 1280,
    margin: '0 auto',
    fontFamily: 'Pretendard, -apple-system, sans-serif',
    color: '#111827',
  },
  hd: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    flexWrap: 'wrap',
    gap: 12,
  },
  h1: { margin: '0 0 6px', fontSize: 24, fontWeight: 800 },
  sub: { margin: 0, color: '#6b7280', fontSize: 13 },
  btnPrimary: {
    padding: '10px 20px',
    background: '#7c3aed',
    color: 'white',
    border: 'none',
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },

  // 등록 폼
  addForm: {
    padding: 24,
    border: '1px solid #e9d5ff',
    background: '#faf5ff',
    borderRadius: 12,
    marginBottom: 24,
  },
  addTitle: { margin: '0 0 16px', fontSize: 16, fontWeight: 700, color: '#6b21a8' },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 24,
  },
  formCol: {
    display: 'flex',
    flexDirection: 'column',
  },
  label: {
    display: 'block',
    fontSize: 12,
    fontWeight: 600,
    color: '#374151',
    marginBottom: 4,
    marginTop: 8,
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
  textarea: {
    width: '100%',
    padding: '8px 10px',
    border: '1px solid #d1d5db',
    borderRadius: 6,
    fontSize: 13,
    fontFamily: 'inherit',
    background: '#fff',
    boxSizing: 'border-box',
    resize: 'vertical',
  },
  imgPickBox: {
    background: '#fff',
    border: '2px dashed #d1d5db',
    borderRadius: 8,
    overflow: 'hidden',
    minHeight: 200,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  imgPreview: {
    width: '100%',
    maxHeight: 240,
    objectFit: 'contain',
    display: 'block',
  },
  imgChangeBtn: {
    display: 'block',
    width: '100%',
    padding: '8px',
    background: '#f3f4f6',
    color: '#374151',
    fontSize: 12,
    fontWeight: 600,
    textAlign: 'center',
    cursor: 'pointer',
    borderTop: '1px solid #e5e7eb',
  },
  imgPickEmpty: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 6,
    padding: 32,
    cursor: 'pointer',
    color: '#374151',
    fontSize: 13,
    fontWeight: 600,
  },
  imgPickHint: {
    fontSize: 11,
    color: '#9ca3af',
    fontWeight: 400,
  },
  submitBtn: {
    width: '100%',
    padding: '12px',
    background: '#7c3aed',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
    marginTop: 4,
  },
  submitBtnDisabled: { opacity: 0.6, cursor: 'wait' },
  errBox: {
    marginTop: 8,
    padding: '8px 10px',
    background: '#fef2f2',
    color: '#dc2626',
    border: '1px solid #fecaca',
    borderRadius: 6,
    fontSize: 12,
  },

  // 필터
  filters: {
    display: 'flex',
    gap: 6,
    marginBottom: 20,
    padding: 8,
    background: '#f9fafb',
    borderRadius: 10,
  },
  filterBtn: {
    padding: '7px 14px',
    background: 'transparent',
    border: 'none',
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 600,
    color: '#6b7280',
    cursor: 'pointer',
  },
  filterBtnActive: {
    background: '#fff',
    color: '#111827',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
  },

  // 그리드
  empty: {
    padding: 60,
    textAlign: 'center',
    background: '#f9fafb',
    border: '2px dashed #e5e7eb',
    borderRadius: 12,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
    gap: 16,
  },
  card: {
    border: '1px solid #e5e7eb',
    borderRadius: 10,
    overflow: 'hidden',
    background: '#fff',
    transition: 'all 0.15s',
  },
  cardInactive: { opacity: 0.5 },
  cardImg: {
    width: '100%',
    height: 180,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundColor: '#f3f4f6',
  },
  cardBody: { padding: 12 },
  cardHead: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  cardCategory: {
    fontSize: 11,
    color: '#6b7280',
    fontWeight: 600,
  },
  recBadge: {
    fontSize: 10,
    color: '#6b21a8',
    background: '#f3e8ff',
    padding: '2px 6px',
    borderRadius: 8,
    fontWeight: 600,
  },
  cardName: {
    margin: '0 0 2px',
    fontSize: 14,
    fontWeight: 700,
  },
  cardNameEn: {
    fontSize: 11,
    color: '#9ca3af',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  tagRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 8,
  },
  tag: {
    padding: '2px 7px',
    background: '#f3f4f6',
    color: '#374151',
    borderRadius: 8,
    fontSize: 10,
  },
  cardActions: {
    display: 'flex',
    gap: 4,
  },
  actionBtn: {
    flex: 1,
    padding: '5px',
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: '#d1d5db',
    borderRadius: 5,
    fontSize: 11,
    fontWeight: 600,
    cursor: 'pointer',
    background: '#fff',
  },
  actionBtnOn: { borderColor: '#bbf7d0', color: '#15803d' },
  actionBtnOff: { borderColor: '#fde68a', color: '#b45309' },
  actionBtnDanger: {
    padding: '5px 10px',
    border: '1px solid #fecaca',
    color: '#dc2626',
    background: '#fff',
    borderRadius: 5,
    fontSize: 11,
    fontWeight: 600,
    cursor: 'pointer',
  },
};

'use client';
/**
 * /references — 등록된 레퍼런스 갤러리
 *
 * 외부 이미지 레퍼런스(ReferenceImage) 목록 + 검색/필터 + 단건 삭제.
 * 빌더 작업물(EventPage isReference) 은 별도 화면.
 */
import { useEffect, useState, CSSProperties } from 'react';
import Link from 'next/link';
import TopNav from '@/components/TopNav';

interface ReferenceItem {
  _id: string;
  title: string;
  imageUrl: string;
  source: string;
  tags: string[];
  note: string;
  extractedTokens?: {
    colors: { primary: string; secondary: string; accent: string; background: string };
    layout: string;
    tone: string[];
    rationale: string;
  };
  createdAt: string;
}

export default function ReferencesPage() {
  const [items, setItems] = useState<ReferenceItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filterTag, setFilterTag] = useState('');
  const [filterSource, setFilterSource] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterTag) params.set('tag', filterTag);
      if (filterSource) params.set('source', filterSource);
      params.set('limit', '60');

      const res = await fetch(`/api/references?${params.toString()}`);
      const json = await res.json();
      if (json.ok) {
        setItems(json.items);
        setTotal(json.total);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterTag, filterSource]);

  const handleDelete = async (id: string) => {
    if (!confirm('이 레퍼런스를 삭제하시겠습니까?')) return;
    const res = await fetch(`/api/references/${id}`, { method: 'DELETE' });
    const json = await res.json();
    if (json.ok) {
      setItems((prev) => prev.filter((x) => x._id !== id));
      setTotal((t) => t - 1);
    } else {
      alert('삭제 실패: ' + json.message);
    }
  };

  const allTags = Array.from(
    new Set(items.flatMap((i) => i.tags ?? [])),
  ).sort();

  return (
    <>
      <TopNav active="references" />
      <div style={S.page}>
      <header style={S.hd}>
        <div>
          <h1 style={S.h1}>📚 레퍼런스 라이브러리</h1>
          <p style={S.sub}>등록된 레퍼런스: <strong>{total}</strong>개</p>
        </div>
        <Link href="/references/import" style={S.btnPrimary}>
          + 일괄 등록
        </Link>
      </header>

      <div style={S.filters}>
        <select
          value={filterSource}
          onChange={(e) => setFilterSource(e.target.value)}
          style={S.select}
        >
          <option value="">모든 출처</option>
          <option value="designer">디자이너</option>
          <option value="external">외부</option>
          <option value="competitor">타사</option>
          <option value="archive">아카이브</option>
          <option value="other">기타</option>
        </select>

        <select
          value={filterTag}
          onChange={(e) => setFilterTag(e.target.value)}
          style={S.select}
        >
          <option value="">모든 태그</option>
          {allTags.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>

        {(filterTag || filterSource) && (
          <button
            type="button"
            onClick={() => {
              setFilterTag('');
              setFilterSource('');
            }}
            style={S.btnClear}
          >
            필터 초기화
          </button>
        )}
      </div>

      {loading ? (
        <div style={S.empty}>불러오는 중…</div>
      ) : items.length === 0 ? (
        <div style={S.empty}>
          <p style={{ margin: '0 0 16px', color: '#6b7280' }}>
            등록된 레퍼런스가 없습니다.
          </p>
          <Link href="/references/import" style={S.btnPrimary}>
            지금 일괄 등록하기 →
          </Link>
        </div>
      ) : (
        <div style={S.grid}>
          {items.map((item) => (
            <article key={item._id} style={S.card}>
              <div
                style={{
                  ...S.cardImg,
                  backgroundImage: `url(${item.imageUrl})`,
                }}
                title={item.title}
              />
              <div style={S.cardBody}>
                <h3 style={S.cardTitle}>{item.title}</h3>
                <div style={S.cardMeta}>
                  <span style={S.srcBadge}>{item.source}</span>
                  {item.tags?.slice(0, 3).map((t) => (
                    <span key={t} style={S.tag}>{t}</span>
                  ))}
                </div>

                {item.extractedTokens?.colors && (
                  <div style={S.palette} title={item.extractedTokens.rationale}>
                    {Object.values(item.extractedTokens.colors).map((c, i) => (
                      <span
                        key={i}
                        style={{ ...S.swatch, background: c }}
                        title={String(c)}
                      />
                    ))}
                  </div>
                )}

                {item.extractedTokens?.tone && (
                  <div style={S.tone}>
                    {item.extractedTokens.tone.slice(0, 3).join(' · ')}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => handleDelete(item._id)}
                  style={S.btnDel}
                >
                  삭제
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
const S: Record<string, CSSProperties> = {
  page: {
    padding: '24px 24px 48px',
    maxWidth: 1280,
    margin: '0 auto',
    fontFamily: 'Pretendard, -apple-system, sans-serif',
  },
  hd: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  h1: { margin: '0 0 4px', fontSize: 24, fontWeight: 800 },
  sub: { margin: 0, color: '#6b7280', fontSize: 13 },
  btnPrimary: {
    padding: '10px 20px',
    background: '#7c3aed',
    color: 'white',
    borderRadius: 6,
    fontSize: 13,
    fontWeight: 700,
    textDecoration: 'none',
    display: 'inline-block',
  },
  filters: {
    display: 'flex',
    gap: 8,
    marginBottom: 20,
    padding: 12,
    background: '#f9fafb',
    borderRadius: 8,
  },
  select: {
    padding: '8px 12px',
    border: '1px solid #d1d5db',
    borderRadius: 6,
    fontSize: 13,
    background: 'white',
    cursor: 'pointer',
  },
  btnClear: {
    padding: '8px 14px',
    background: '#fff',
    border: '1px solid #d1d5db',
    borderRadius: 6,
    fontSize: 12,
    cursor: 'pointer',
    color: '#6b7280',
  },
  empty: {
    padding: 60,
    textAlign: 'center',
    background: '#f9fafb',
    border: '2px dashed #e5e7eb',
    borderRadius: 12,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
    gap: 16,
  },
  card: {
    border: '1px solid #e5e7eb',
    borderRadius: 8,
    overflow: 'hidden',
    background: '#fff',
    transition: 'all 0.15s',
  },
  cardImg: {
    width: '100%',
    height: 160,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundColor: '#f3f4f6',
  },
  cardBody: { padding: 12 },
  cardTitle: {
    margin: '0 0 8px',
    fontSize: 13,
    fontWeight: 700,
    color: '#1f2937',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  cardMeta: {
    display: 'flex',
    gap: 4,
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  srcBadge: {
    padding: '2px 8px',
    background: '#ede9fe',
    color: '#6b21a8',
    borderRadius: 10,
    fontSize: 10,
    fontWeight: 600,
  },
  tag: {
    padding: '2px 8px',
    background: '#f3f4f6',
    color: '#374151',
    borderRadius: 10,
    fontSize: 10,
  },
  palette: { display: 'flex', gap: 3, marginBottom: 6 },
  swatch: {
    width: 18,
    height: 18,
    borderRadius: 3,
    border: '1px solid rgba(0, 0, 0, 0.06)',
  },
  tone: {
    fontSize: 11,
    color: '#6b7280',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  btnDel: {
    width: '100%',
    padding: 6,
    background: '#fff',
    border: '1px solid #fecaca',
    color: '#dc2626',
    borderRadius: 4,
    fontSize: 11,
    cursor: 'pointer',
  },
};

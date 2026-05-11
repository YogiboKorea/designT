'use client';

import { CSSProperties, useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/AppShell';
import PromptBuilderModal from '@/components/PromptBuilderModal';

/**
 * 페이지 개발 — 템플릿 게시판
 * ─────────────────────────────────────────────────────────────────
 * /builder 에서 저장한 페이지(eventType='page') 들을 카드 그리드로 보여줌.
 *   - 클릭 → /builder?id=... (편집)
 *   - "+ 새 페이지" → /builder (신규)
 *   - 카드 액션: 편집 / 복제 / 삭제 / 이벤트에 사용
 *
 * 우측 사이드: 프롬프트 빠른 생성 (기존 섹션별 가이드 기능 유지)
 * ─────────────────────────────────────────────────────────────────
 */

interface PageTemplate {
  _id: string;
  title?: string;
  imageUrl?: string;
  eventType?: string;
  sections?: unknown[];
  createdAt?: string;
  updatedAt?: string;
}

interface PageSection {
  id: string;
  emoji: string;
  type: string;
  description: string;
  aspectRatio: string;
}

const QUICK_SECTIONS: PageSection[] = [
  { id: 'hero',      emoji: '🎯', type: '히어로',        description: '메인 비주얼',            aspectRatio: '800x907' },
  { id: 'feature',   emoji: '⭐', type: '특징 소개',     description: '제품 특징 카드',          aspectRatio: '800x-' },
  { id: 'gallery',   emoji: '🖼️', type: '제품 갤러리',   description: '제품 사진 그리드',        aspectRatio: '800x-' },
  { id: 'lifestyle', emoji: '🛋️', type: '라이프스타일',  description: '실사용 모델/씬',          aspectRatio: '800x-' },
  { id: 'cta',       emoji: '🛒', type: 'CTA',           description: '구매 유도 버튼 영역',     aspectRatio: '800x-' },
];

export default function PageBuilderPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<PageTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<PageSection | null>(null);
  const [query, setQuery] = useState('');

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/events');
      const json = await res.json();
      if (!json.success) throw new Error(json.message || 'fetch failed');
      // eventType==='page' 만 (페이지 개발 산출물) 표시
      const list = (json.data || []).filter((ev: PageTemplate) => ev.eventType === 'page');
      list.sort((a: PageTemplate, b: PageTemplate) => {
        const ta = new Date(a.updatedAt || a.createdAt || 0).getTime();
        const tb = new Date(b.updatedAt || b.createdAt || 0).getTime();
        return tb - ta;
      });
      setTemplates(list);
    } catch (err) {
      console.error('[페이지 개발 목록 로드 실패]', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  const handleDelete = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    try {
      const res = await fetch(`/api/events/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || 'delete failed');
      fetchTemplates();
    } catch (err) {
      console.error(err);
      alert('삭제에 실패했습니다.');
    }
  };

  const handleDuplicate = async (tpl: PageTemplate) => {
    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `${tpl.title || '제목없음'} (복제)`,
          sections: tpl.sections || [],
          imageUrl: tpl.imageUrl,
          eventType: 'page',
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || 'duplicate failed');
      fetchTemplates();
    } catch (err) {
      console.error(err);
      alert('복제에 실패했습니다.');
    }
  };

  const handleUseInEvent = (tpl: PageTemplate) => {
    // 2단계 라이브러리 연결 자리 — 지금은 이벤트 신규 작성으로 이동하면서 prefill 메시지만 노출.
    if (!tpl.imageUrl) {
      alert('이 페이지에 저장된 이미지가 없어 이벤트로 가져올 수 없습니다.');
      return;
    }
    alert('이벤트 페이지로 이동합니다. (라이브러리 직접 연결은 2단계 작업 예정)');
    router.push(`/events/create?prefillImage=${encodeURIComponent(tpl.imageUrl)}`);
  };

  const filtered = templates.filter((t) =>
    (t.title || '').toLowerCase().includes(query.toLowerCase())
  );

  return (
    <AppShell>
      <div style={S.container}>
        <header style={S.header}>
          <div style={S.crumb}>
            <Link href="/" style={S.crumbLink}>홈</Link>
            <span style={S.crumbSep}>/</span>
            <span style={S.crumbActive}>페이지 개발</span>
          </div>
          <div style={S.titleRow}>
            <div>
              <h1 style={S.title}>📐 페이지 개발</h1>
              <p style={S.subtitle}>긴 세로 상세 페이지 템플릿을 만들고, 저장된 작업물을 이벤트 페이지에 재사용합니다.</p>
            </div>
            <Link href="/builder" style={S.newBtn}>
              <span style={{ fontSize: 16, marginRight: 6 }}>＋</span> 새 페이지
            </Link>
          </div>
        </header>

        <section style={S.section}>
          <div style={S.sectionHead}>
            <h2 style={S.h2}>📋 저장된 페이지 ({templates.length})</h2>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="제목 검색…"
              style={S.search}
            />
          </div>

          {loading ? (
            <div style={S.empty}>불러오는 중…</div>
          ) : filtered.length === 0 ? (
            <div style={S.empty}>
              {query ? '검색 결과가 없습니다.' : '아직 저장된 페이지가 없습니다. 우상단 "+ 새 페이지" 로 시작하세요.'}
            </div>
          ) : (
            <div style={S.grid}>
              {filtered.map((tpl) => (
                <div key={tpl._id} style={S.card}>
                  <Link href={`/builder?id=${tpl._id}`} style={S.cardImageWrap}>
                    {tpl.imageUrl ? (
                      <img src={tpl.imageUrl} alt={tpl.title || ''} style={S.cardImage} />
                    ) : (
                      <div style={S.cardImagePh}>📄</div>
                    )}
                  </Link>
                  <div style={S.cardBody}>
                    <Link href={`/builder?id=${tpl._id}`} style={S.cardTitle}>
                      {tpl.title || '제목 없음'}
                    </Link>
                    <div style={S.cardMeta}>
                      {tpl.updatedAt
                        ? new Date(tpl.updatedAt).toLocaleDateString('ko-KR')
                        : (tpl.createdAt ? new Date(tpl.createdAt).toLocaleDateString('ko-KR') : '')}
                      {' · '}
                      섹션 {Array.isArray(tpl.sections) ? tpl.sections.length : 0}개
                    </div>
                    <div style={S.cardActions}>
                      <button type="button" onClick={() => router.push(`/builder?id=${tpl._id}`)} style={S.actionBtn}>편집</button>
                      <button type="button" onClick={() => handleDuplicate(tpl)} style={S.actionBtn}>복제</button>
                      <button type="button" onClick={() => handleUseInEvent(tpl)} style={S.actionBtnAccent}>이벤트로</button>
                      <button type="button" onClick={() => handleDelete(tpl._id)} style={S.actionBtnDanger}>삭제</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section style={S.quickSection}>
          <h2 style={S.h2}>🎨 빠른 프롬프트 — 섹션별 이미지 생성 가이드</h2>
          <p style={S.sectionDesc}>각 섹션 사이즈에 맞는 디자인 프롬프트를 만들 수 있습니다.</p>
          <div style={S.quickGrid}>
            {QUICK_SECTIONS.map((sec) => (
              <button
                key={sec.id}
                type="button"
                onClick={() => setActiveSection(sec)}
                style={S.quickCard}
              >
                <div style={S.quickEmoji}>{sec.emoji}</div>
                <div style={S.quickType}>{sec.type}</div>
                <div style={S.quickDesc}>{sec.description}</div>
              </button>
            ))}
          </div>
        </section>

        <PromptBuilderModal
          open={activeSection !== null}
          onClose={() => setActiveSection(null)}
          aspectRatio={activeSection?.aspectRatio}
        />
      </div>
    </AppShell>
  );
}

const S: Record<string, CSSProperties> = {
  container: { maxWidth: 1200, margin: '0 auto', padding: '28px 28px' },
  header: { marginBottom: 24 },
  crumb: { fontSize: 12, color: '#94a3b8', marginBottom: 8, display: 'flex', gap: 6, alignItems: 'center' },
  crumbLink: { color: '#64748b', textDecoration: 'none' },
  crumbSep: { color: '#cbd5e1' },
  crumbActive: { color: '#0f172a', fontWeight: 600 },
  titleRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' },
  title: { fontSize: 22, fontWeight: 800, margin: 0, color: '#0f172a' },
  subtitle: { fontSize: 13, color: '#64748b', marginTop: 6, lineHeight: 1.6 },
  newBtn: {
    display: 'inline-flex', alignItems: 'center',
    padding: '10px 18px', background: '#0f172a', color: '#fff',
    borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: 'none',
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
  },

  section: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 20, marginBottom: 16 },
  sectionHead: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, gap: 12, flexWrap: 'wrap' },
  h2: { fontSize: 15, fontWeight: 700, margin: 0, color: '#0f172a' },
  search: {
    padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 8,
    fontSize: 13, width: 220, outline: 'none',
  },

  empty: {
    padding: '60px 20px', textAlign: 'center',
    color: '#94a3b8', fontSize: 13,
    background: '#f8fafc', borderRadius: 8, border: '1px dashed #e2e8f0',
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
    transition: 'box-shadow 0.15s, transform 0.15s',
    display: 'flex',
    flexDirection: 'column',
  },
  cardImageWrap: {
    display: 'block',
    aspectRatio: '1 / 1.1',
    background: '#f1f5f9',
    overflow: 'hidden',
    textDecoration: 'none',
  },
  cardImage: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
  cardImagePh: {
    width: '100%', height: '100%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 48, color: '#cbd5e1',
  },

  cardBody: { padding: 12, display: 'flex', flexDirection: 'column', gap: 6, flex: 1 },
  cardTitle: {
    fontSize: 13, fontWeight: 700, color: '#0f172a',
    textDecoration: 'none', lineHeight: 1.3,
    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
    overflow: 'hidden', textOverflow: 'ellipsis',
  } as CSSProperties,
  cardMeta: { fontSize: 11, color: '#94a3b8' },
  cardActions: { display: 'flex', gap: 4, marginTop: 'auto', paddingTop: 6, flexWrap: 'wrap' },
  actionBtn: {
    padding: '4px 8px', fontSize: 11, fontWeight: 500,
    border: '1px solid #e2e8f0', borderRadius: 4, background: '#fff',
    color: '#475569', cursor: 'pointer',
  },
  actionBtnAccent: {
    padding: '4px 8px', fontSize: 11, fontWeight: 600,
    border: '1px solid #fe6326', borderRadius: 4, background: '#fff',
    color: '#fe6326', cursor: 'pointer',
  },
  actionBtnDanger: {
    padding: '4px 8px', fontSize: 11, fontWeight: 500,
    border: '1px solid #fecaca', borderRadius: 4, background: '#fff',
    color: '#ef4444', cursor: 'pointer',
  },

  quickSection: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 20 },
  sectionDesc: { fontSize: 12, color: '#64748b', lineHeight: 1.6, margin: '6px 0 16px' },
  quickGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
    gap: 10,
  },
  quickCard: {
    padding: '14px 12px',
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'all 0.15s',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  quickEmoji: { fontSize: 22 },
  quickType: { fontSize: 13, fontWeight: 700, color: '#0f172a' },
  quickDesc: { fontSize: 11, color: '#64748b', lineHeight: 1.4 },
};

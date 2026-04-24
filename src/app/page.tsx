'use client';
import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

interface EventPageFile {
  _id: string;
  title: string;
  imageUrl?: string;
  eventType?: 'event' | 'banner';
  createdAt: string;
  updatedAt: string;
}

type Tab = 'event' | 'banner';

// ============================================================================
// 요기보 템플릿 빌더 - 대시보드형 홈
// ============================================================================

export default function Home() {
  const [events, setEvents] = useState<EventPageFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<Tab>('event');
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState<string>('');

  useEffect(() => {
    async function fetchEvents() {
      try {
        const res = await fetch('/api/events');
        const data = await res.json();
        if (data.success) {
          setEvents(data.data);
        } else {
          setError(data.message || '이벤트를 불러오지 못했습니다.');
        }
      } catch {
        setError('서버에 연결할 수 없습니다. MONGODB_URI 설정을 확인하세요.');
      } finally {
        setIsLoading(false);
      }
    }
    fetchEvents();
  }, []);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    e.preventDefault();
    if (!window.confirm('정말 이 항목을 삭제하시겠습니까?')) return;
    try {
      const res = await fetch(`/api/events/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success || data.message === 'Event not found') {
        setEvents(events.filter((ev) => ev._id !== id));
        showToast('삭제되었습니다');
      } else {
        alert(data.message || '삭제 실패');
      }
    } catch {
      alert('서버 오류로 삭제에 실패했습니다.');
    }
  };

  const copyUrl = async (e: React.MouseEvent, url: string) => {
    e.stopPropagation();
    e.preventDefault();
    try {
      await navigator.clipboard.writeText(url);
      showToast('URL이 복사되었습니다');
    } catch {
      alert(url);
    }
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2200);
  };

  const stats = useMemo(() => {
    const total = events.length;
    const eventCount = events.filter((e) => (e.eventType || 'event') === 'event').length;
    const bannerCount = events.filter((e) => e.eventType === 'banner').length;
    const recent = events.filter((e) => {
      const d = new Date(e.createdAt).getTime();
      return Date.now() - d < 7 * 24 * 60 * 60 * 1000;
    }).length;
    return { total, eventCount, bannerCount, recent };
  }, [events]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return events
      .filter((ev) => (ev.eventType || 'event') === tab)
      .filter((ev) => (q ? ev.title.toLowerCase().includes(q) : true));
  }, [events, tab, search]);

  return (
    <div style={{ minHeight: '100vh', background: '#f7f7f5', fontFamily: 'var(--font-sans)' }}>
      {/* ============================ Header ============================ */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 30,
          background: 'rgba(255,255,255,0.85)',
          backdropFilter: 'saturate(180%) blur(12px)',
          WebkitBackdropFilter: 'saturate(180%) blur(12px)',
          borderBottom: '1px solid #ececea',
        }}
      >
        <div
          style={{
            maxWidth: '1200px',
            margin: '0 auto',
            padding: '14px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #111827 0%, #374151 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontWeight: 700,
                fontSize: '14px',
                letterSpacing: '-0.5px',
              }}
            >
              Y
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827', letterSpacing: '-0.2px' }}>
                Yogibo Template Studio
              </div>
              <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '1px' }}>
                이벤트 페이지 & 배너 빌더
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <Link href="/builder" style={linkReset}>
              <button style={btnPrimary}>
                <span style={{ fontSize: '14px' }}>＋</span>
                이벤트 페이지
              </button>
            </Link>
            <Link href="/main-visual" style={linkReset}>
              <button style={btnSecondary}>
                <span style={{ fontSize: '14px' }}>＋</span>
                자사몰 비주얼
              </button>
            </Link>
          </div>
        </div>
      </header>

      {/* ============================ Hero / Summary ============================ */}
      <section style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 24px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: '28px',
                fontWeight: 700,
                letterSpacing: '-0.6px',
                color: '#0f172a',
              }}
            >
              대시보드
            </h1>
            <p style={{ margin: '6px 0 0 0', fontSize: '14px', color: '#6b7280' }}>
              저장된 템플릿과 배너를 관리하고, 새 템플릿을 만들어보세요.
            </p>
          </div>
          <div style={{ fontSize: '12px', color: '#9ca3af' }}>
            {new Date().toLocaleString('ko-KR', { dateStyle: 'long', timeStyle: 'short' })}
          </div>
        </div>

        {/* Metric cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '12px',
            marginBottom: '28px',
          }}
        >
          <MetricCard label="전체 항목" value={stats.total} accent="#111827" />
          <MetricCard label="이벤트 페이지" value={stats.eventCount} accent="#2563eb" />
          <MetricCard label="자사몰 비주얼" value={stats.bannerCount} accent="#7c3aed" />
          <MetricCard label="최근 7일" value={stats.recent} accent="#059669" />
        </div>

        {/* Quick actions */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '12px',
            marginBottom: '28px',
          }}
        >
          <QuickAction
            href="/builder"
            title="이벤트 페이지 만들기"
            description="메인 비주얼·쿠폰·상품 섹션을 조합해 상세페이지 제작"
            icon="📄"
            color="#2563eb"
            bg="#eff6ff"
          />
          <QuickAction
            href="/main-visual"
            title="자사몰 비주얼 제작기"
            description="웹 1920×680 / 모바일 800×907 배너를 원본 해상도로"
            icon="🎨"
            color="#7c3aed"
            bg="#f5f3ff"
          />
        </div>
      </section>

      {/* ============================ Library ============================ */}
      <section style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px 64px' }}>
        <div
          style={{
            background: '#fff',
            border: '1px solid #ececea',
            borderRadius: '16px',
            overflow: 'hidden',
          }}
        >
          {/* Tabs + search */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 20px',
              borderBottom: '1px solid #f3f4f6',
              gap: '12px',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', gap: '4px', background: '#f3f4f6', padding: '4px', borderRadius: '10px' }}>
              <button
                onClick={() => setTab('event')}
                style={segmentBtn(tab === 'event')}
              >
                이벤트 페이지 · {stats.eventCount}
              </button>
              <button
                onClick={() => setTab('banner')}
                style={segmentBtn(tab === 'banner')}
              >
                자사몰 비주얼 · {stats.bannerCount}
              </button>
            </div>

            <div style={{ position: 'relative', minWidth: '200px', flex: '0 1 300px' }}>
              <input
                type="text"
                placeholder="제목으로 검색..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px 8px 34px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '13px',
                  outline: 'none',
                  background: '#fafaf9',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.background = '#fff';
                  e.currentTarget.style.borderColor = '#111827';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.background = '#fafaf9';
                  e.currentTarget.style.borderColor = '#e5e7eb';
                }}
              />
              <span
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#9ca3af',
                  fontSize: '14px',
                  pointerEvents: 'none',
                }}
              >
                ⌕
              </span>
            </div>
          </div>

          {/* Content */}
          <div style={{ padding: '20px' }}>
            {isLoading ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '14px' }}>
                {[0, 1, 2, 3].map((i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            ) : error ? (
              <EmptyState
                icon="⚠"
                title="데이터를 불러올 수 없습니다"
                description={error}
                hint=".env.local 파일의 MONGODB_URI 설정을 확인하세요."
              />
            ) : filtered.length === 0 ? (
              <EmptyState
                icon={tab === 'event' ? '📄' : '🎨'}
                title={
                  search
                    ? '검색 결과가 없습니다'
                    : tab === 'event'
                    ? '저장된 이벤트 페이지가 없습니다'
                    : '저장된 자사몰 비주얼이 없습니다'
                }
                description={
                  search
                    ? '다른 키워드로 검색해보세요.'
                    : '상단의 + 버튼을 눌러 첫 템플릿을 만들어보세요.'
                }
              />
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                  gap: '14px',
                }}
              >
                {filtered.map((ev) => (
                  <Card
                    key={ev._id}
                    ev={ev}
                    tab={tab}
                    onDelete={handleDelete}
                    onCopyUrl={copyUrl}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Toast */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            bottom: '32px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#111827',
            color: '#fff',
            padding: '10px 18px',
            borderRadius: '999px',
            fontSize: '13px',
            fontWeight: 500,
            boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
            zIndex: 100,
            animation: 'toastSlide 0.2s ease-out',
          }}
        >
          {toast}
        </div>
      )}

      <style>{`
        @keyframes toastSlide {
          from { opacity: 0; transform: translate(-50%, 8px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
        @keyframes skeleton {
          0% { background-position: -200px 0; }
          100% { background-position: calc(200px + 100%) 0; }
        }
      `}</style>
    </div>
  );
}

// ============================================================================
// 서브 컴포넌트들
// ============================================================================

function MetricCard({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #ececea',
        borderRadius: '14px',
        padding: '16px 18px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: 500 }}>{label}</span>
        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: accent }} />
      </div>
      <span style={{ fontSize: '26px', fontWeight: 700, color: '#0f172a', letterSpacing: '-0.6px', lineHeight: 1 }}>
        {value}
      </span>
    </div>
  );
}

function QuickAction({
  href,
  title,
  description,
  icon,
  color,
  bg,
}: {
  href: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  bg: string;
}) {
  return (
    <Link href={href} style={linkReset}>
      <div
        style={{
          background: '#fff',
          border: '1px solid #ececea',
          borderRadius: '14px',
          padding: '18px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          cursor: 'pointer',
          transition: 'all 0.15s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = color;
          e.currentTarget.style.boxShadow = `0 8px 20px rgba(0,0,0,0.04)`;
          e.currentTarget.style.transform = 'translateY(-1px)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = '#ececea';
          e.currentTarget.style.boxShadow = 'none';
          e.currentTarget.style.transform = 'translateY(0)';
        }}
      >
        <div
          style={{
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            background: bg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '22px',
            flexShrink: 0,
          }}
        >
          {icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a', marginBottom: '2px' }}>
            {title}
          </div>
          <div style={{ fontSize: '12px', color: '#6b7280', lineHeight: 1.5 }}>{description}</div>
        </div>
        <div style={{ color: color, fontSize: '18px', fontWeight: 300 }}>→</div>
      </div>
    </Link>
  );
}

function Card({
  ev,
  tab,
  onDelete,
  onCopyUrl,
}: {
  ev: EventPageFile;
  tab: Tab;
  onDelete: (e: React.MouseEvent, id: string) => void;
  onCopyUrl: (e: React.MouseEvent, url: string) => void;
}) {
  const editHref = tab === 'event' ? `/builder?id=${ev._id}` : `/main-visual?id=${ev._id}`;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        background: '#fff',
        border: '1px solid #ececea',
        borderRadius: '14px',
        overflow: 'hidden',
        transition: 'all 0.15s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = '#d1d5db';
        e.currentTarget.style.boxShadow = '0 10px 24px rgba(0,0,0,0.06)';
        e.currentTarget.style.transform = 'translateY(-1px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = '#ececea';
        e.currentTarget.style.boxShadow = 'none';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      {/* thumbnail */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: tab === 'event' ? '4 / 5' : '16 / 9',
          background: '#f3f4f6',
          overflow: 'hidden',
        }}
      >
        {ev.imageUrl ? (
          <img
            src={ev.imageUrl}
            alt={ev.title}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#9ca3af',
              fontSize: '12px',
            }}
          >
            이미지 없음
          </div>
        )}

        {/* badge */}
        <span
          style={{
            position: 'absolute',
            top: '10px',
            left: '10px',
            padding: '4px 10px',
            borderRadius: '999px',
            fontSize: '11px',
            fontWeight: 600,
            color: tab === 'event' ? '#1e40af' : '#6d28d9',
            background: tab === 'event' ? 'rgba(239,246,255,0.95)' : 'rgba(245,243,255,0.95)',
            backdropFilter: 'blur(8px)',
          }}
        >
          {tab === 'event' ? '이벤트 페이지' : '자사몰 비주얼'}
        </span>
      </div>

      {/* meta */}
      <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <h3
          style={{
            margin: 0,
            fontSize: '14px',
            fontWeight: 600,
            color: '#0f172a',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
          title={ev.title}
        >
          {ev.title}
        </h3>
        <p style={{ margin: 0, fontSize: '11px', color: '#9ca3af' }}>
          {new Date(ev.createdAt).toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          })}
        </p>
      </div>

      {/* actions */}
      <div
        style={{
          padding: '10px 14px 12px',
          display: 'flex',
          gap: '6px',
          borderTop: '1px solid #f3f4f6',
        }}
      >
        <Link href={editHref} style={{ ...linkReset, flex: 1 }}>
          <button style={btnCardPrimary}>수정</button>
        </Link>
        {ev.imageUrl ? (
          <button
            style={{ ...btnCardPrimary, flex: 1 }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              window.open(ev.imageUrl, '_blank');
            }}
            title="이미지 크게 보기"
          >
            확인
          </button>
        ) : (
          <button style={{ ...btnCardPrimary, flex: 1, opacity: 0.5 }} disabled>
            확인 불가
          </button>
        )}
        {ev.imageUrl && (
          <button
            style={btnCardIcon}
            onClick={(e) => onCopyUrl(e, ev.imageUrl!)}
            title="이미지 URL 복사"
          >
            🔗
          </button>
        )}
        <button
          style={{ ...btnCardIcon, color: '#ef4444', borderColor: '#fecaca' }}
          onClick={(e) => onDelete(e, ev._id)}
          title="삭제"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

function SkeletonCard() {
  const shimmer: React.CSSProperties = {
    background: 'linear-gradient(90deg, #f3f4f6 0px, #e5e7eb 40px, #f3f4f6 80px)',
    backgroundSize: '200px 100%',
    animation: 'skeleton 1.4s linear infinite',
  };
  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #ececea',
        borderRadius: '14px',
        overflow: 'hidden',
      }}
    >
      <div style={{ ...shimmer, width: '100%', aspectRatio: '4/5' }} />
      <div style={{ padding: '12px 14px' }}>
        <div style={{ ...shimmer, height: '14px', width: '70%', borderRadius: '4px', marginBottom: '6px' }} />
        <div style={{ ...shimmer, height: '11px', width: '40%', borderRadius: '4px' }} />
      </div>
    </div>
  );
}

function EmptyState({
  icon,
  title,
  description,
  hint,
}: {
  icon: string;
  title: string;
  description: string;
  hint?: string;
}) {
  return (
    <div
      style={{
        padding: '48px 24px',
        textAlign: 'center',
        color: '#6b7280',
      }}
    >
      <div style={{ fontSize: '40px', marginBottom: '12px' }}>{icon}</div>
      <div style={{ fontSize: '15px', fontWeight: 600, color: '#0f172a', marginBottom: '6px' }}>
        {title}
      </div>
      <div style={{ fontSize: '13px', color: '#6b7280' }}>{description}</div>
      {hint && <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '6px' }}>{hint}</div>}
    </div>
  );
}

// ============================================================================
// 공통 스타일
// ============================================================================
const linkReset: React.CSSProperties = { textDecoration: 'none' };

const btnPrimary: React.CSSProperties = {
  padding: '8px 14px',
  fontSize: '13px',
  fontWeight: 600,
  background: '#111827',
  color: '#fff',
  border: 'none',
  borderRadius: '10px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
};

const btnSecondary: React.CSSProperties = {
  padding: '8px 14px',
  fontSize: '13px',
  fontWeight: 600,
  background: '#fff',
  color: '#111827',
  border: '1px solid #e5e7eb',
  borderRadius: '10px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
};

const segmentBtn = (active: boolean): React.CSSProperties => ({
  padding: '7px 14px',
  fontSize: '13px',
  fontWeight: 600,
  background: active ? '#fff' : 'transparent',
  color: active ? '#111827' : '#6b7280',
  border: 'none',
  borderRadius: '8px',
  cursor: 'pointer',
  boxShadow: active ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
  transition: 'all 0.15s',
});

const btnCardPrimary: React.CSSProperties = {
  padding: '7px 10px',
  fontSize: '12px',
  fontWeight: 600,
  background: '#f3f4f6',
  color: '#111827',
  border: 'none',
  borderRadius: '8px',
  cursor: 'pointer',
  width: '100%',
};

const btnCardIcon: React.CSSProperties = {
  padding: '7px 10px',
  fontSize: '12px',
  background: '#fff',
  color: '#111827',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  cursor: 'pointer',
  minWidth: '36px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

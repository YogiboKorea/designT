'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/AppShell';
import Link from 'next/link';

interface SavedBanner {
  _id: string;
  title: string;
  imageUrl?: string;
  sections?: Array<{ type: string; web?: { imageUrl?: string }; mobile?: { imageUrl?: string } }>;
  createdAt: string;
  updatedAt: string;
  eventType?: string;
}

export default function Cafe24BannerPage() {
  const router = useRouter();
  const [banners, setBanners] = useState<SavedBanner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/events')
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          // 자사몰 배너만 필터 (스마트스토어 등 다른 플랫폼은 제외)
          const cafeBanners = (d.data as SavedBanner[]).filter((item) => {
            if (item.eventType === 'smart-store-banner') return false;
            if (item.eventType === 'banner') return true;
            if (!item.eventType && item.sections?.some((s) => s.type === 'mainVisualPair')) return true;
            return false;
          });
          setBanners(cafeBanners);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('이 배너를 삭제하시겠습니까?')) return;
    try {
      const res = await fetch(`/api/events/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        setBanners((prev) => prev.filter((b) => b._id !== id));
      } else {
        alert('삭제 실패: ' + (json.message || ''));
      }
    } catch (e) {
      alert('삭제 중 오류가 발생했습니다.');
    }
  };

  return (
    <AppShell>
      <div style={{ padding: '32px', maxWidth: '1400px', margin: '0 auto' }}>
        {/* 헤더 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <div style={{
                width: '40px', height: '40px', borderRadius: '10px',
                background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '20px',
              }}>🏠</div>
              <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 800, color: '#0f172a' }}>
                자사몰 배너
              </h1>
              <span style={{
                padding: '3px 10px', fontSize: '12px', fontWeight: 600,
                background: '#eff6ff', color: '#2563eb', borderRadius: '99px',
              }}>Cafe24</span>
            </div>
            <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>
              웹(1920×680)과 모바일(800×907) 배너를 한 쌍으로 제작하고 관리합니다.
            </p>
          </div>
          <button
            onClick={() => router.push('/main-visual')}
            style={{
              padding: '12px 24px', fontSize: '15px', fontWeight: 700,
              background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
              color: '#fff', border: 'none', borderRadius: '10px',
              cursor: 'pointer', boxShadow: '0 4px 12px rgba(37,99,235,0.3)',
              display: 'flex', alignItems: 'center', gap: '8px',
            }}
          >
            ✨ 새 배너 제작
          </button>
        </div>

        {/* 갤러리 */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '80px', color: '#9ca3af', fontSize: '16px' }}>
            불러오는 중...
          </div>
        ) : banners.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '80px 40px',
            background: '#f8fafc', borderRadius: '16px',
            border: '2px dashed #e2e8f0',
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🖼️</div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: '#374151', marginBottom: '8px' }}>
              아직 제작한 배너가 없습니다
            </div>
            <div style={{ fontSize: '14px', color: '#9ca3af', marginBottom: '24px' }}>
              오른쪽 위의 "새 배너 제작" 버튼으로 시작해보세요.
            </div>
            <button
              onClick={() => router.push('/main-visual')}
              style={{
                padding: '10px 24px', fontSize: '14px', fontWeight: 600,
                background: '#2563eb', color: '#fff', border: 'none',
                borderRadius: '8px', cursor: 'pointer',
              }}
            >
              첫 번째 배너 만들기 →
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' }}>
            {banners.map((banner) => {
              const webSection = banner.sections?.find((s) => s.type === 'mainVisualPair');
              const thumbUrl = webSection?.web?.imageUrl || banner.imageUrl || '';
              const updatedAt = new Date(banner.updatedAt || banner.createdAt).toLocaleDateString('ko-KR', {
                year: 'numeric', month: 'short', day: 'numeric',
              });

              return (
                <div
                  key={banner._id}
                  style={{
                    background: '#fff', borderRadius: '12px',
                    border: '1px solid #e5e7eb', overflow: 'hidden',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                    transition: 'box-shadow 0.2s, transform 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.10)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  {/* 썸네일 */}
                  <div style={{
                    width: '100%', aspectRatio: '2.8/1',
                    background: '#f1f5f9', overflow: 'hidden',
                    position: 'relative',
                  }}>
                    {thumbUrl ? (
                      <img
                        src={thumbUrl}
                        alt={banner.title}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <div style={{
                        width: '100%', height: '100%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '32px', color: '#cbd5e1',
                      }}>🖼️</div>
                    )}
                  </div>

                  {/* 정보 */}
                  <div style={{ padding: '14px 16px' }}>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: '#111827', marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {banner.title}
                    </div>
                    <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '12px' }}>
                      {updatedAt} 수정
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => router.push(`/main-visual?id=${banner._id}`)}
                        style={{
                          flex: 1, padding: '8px', fontSize: '13px', fontWeight: 600,
                          background: '#eff6ff', color: '#2563eb',
                          border: '1px solid #bfdbfe', borderRadius: '8px', cursor: 'pointer',
                        }}
                      >
                        ✎ 편집
                      </button>
                      <button
                        onClick={() => handleDelete(banner._id)}
                        style={{
                          padding: '8px 12px', fontSize: '13px', fontWeight: 600,
                          background: '#fff', color: '#ef4444',
                          border: '1px solid #fecaca', borderRadius: '8px', cursor: 'pointer',
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}

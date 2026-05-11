'use client';
import React, { useEffect, useState, useCallback } from 'react';
import { proxyImageUrl } from '@/lib/proxy-image-url';

const API_HOST = 'https://port-0-ychat-lzgmwhc4d9883c97.sel4.cloudtype.app';
const MALL_ID = 'yogibo';
const PAGE_SIZE = 10;
const SEARCH_CHUNK = 100;

interface Cafe24Product {
  product_no: number | string;
  product_name: string;
  list_image?: string;
  detail_image?: string;
  small_image?: string;
  tiny_image?: string;
  additional_image?: unknown;
  price?: string | number;
  [key: string]: unknown;
}

interface ImageOption {
  url: string;
  label: string;
}

interface Cafe24ThumbnailPickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (imageUrl: string, product: Cafe24Product) => void;
}

// 상품 상세 객체에서 사용 가능한 모든 이미지 URL 추출.
// cafe24 API 는 list_image, detail_image, small_image 외 additional_image 에
// 다양한 형태(문자열 / 문자열 배열 / 객체 배열 — { big, medium, small, additional_image, ... }) 로
// 추가 이미지를 담아 모두 대응해야 함.
function extractImages(product: Cafe24Product): ImageOption[] {
  const out: ImageOption[] = [];
  const seen = new Set<string>();
  const push = (url: string | undefined | null, label: string) => {
    if (!url || typeof url !== 'string') return;
    const trimmed = url.trim();
    if (!trimmed || trimmed === 'null' || trimmed === 'undefined') return;
    if (seen.has(trimmed)) return;
    seen.add(trimmed);
    out.push({ url: trimmed, label });
  };
  // 메인 이미지들 (우선순위: 큰 사이즈부터)
  push(product.detail_image, '상세 이미지');
  push(product.list_image, '리스트 이미지');
  push(product.small_image, '작은 이미지');

  // additional_image — 다양한 형태 처리
  const tryEntry = (entry: unknown, idx: number) => {
    if (typeof entry === 'string') {
      push(entry, `추가 이미지 ${idx + 1}`);
      return;
    }
    if (entry && typeof entry === 'object') {
      const e = entry as Record<string, unknown>;
      // 우선순위: big > medium > additional_image > image > url > small
      const candidates = ['big', 'medium', 'additional_image', 'image', 'url', 'src', 'small'];
      for (const k of candidates) {
        const v = e[k];
        if (typeof v === 'string' && v.trim()) {
          push(v, `추가 이미지 ${idx + 1}`);
          return;
        }
      }
    }
  };

  const add = product.additional_image;
  if (Array.isArray(add)) {
    add.forEach(tryEntry);
  } else if (typeof add === 'string') {
    push(add, '추가 이미지');
  } else if (add && typeof add === 'object') {
    tryEntry(add, 0);
  }

  return out;
}

export default function Cafe24ThumbnailPicker({ open, onClose, onSelect }: Cafe24ThumbnailPickerProps) {
  // 리스트 뷰 상태
  const [products, setProducts] = useState<Cafe24Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [searchText, setSearchText] = useState('');

  // 상세 뷰 상태
  const [selected, setSelected] = useState<Cafe24Product | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailImages, setDetailImages] = useState<ImageOption[]>([]);

  const fetchInitial = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_HOST}/api/${MALL_ID}/products?offset=0&limit=${PAGE_SIZE}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setProducts(data.products || []);
    } catch (err) {
      console.error('[Cafe24ThumbnailPicker] 상품 로드 실패', err);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSearch = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const all: Cafe24Product[] = [];
      let offset = 0;
      const HARD_CAP = 1000;
      while (offset < HARD_CAP) {
        const res = await fetch(`${API_HOST}/api/${MALL_ID}/products?offset=${offset}&limit=${SEARCH_CHUNK}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const chunk: Cafe24Product[] = data.products || [];
        all.push(...chunk);
        if (chunk.length < SEARCH_CHUNK) break;
        offset += SEARCH_CHUNK;
      }
      const ql = q.toLowerCase();
      const filtered = all.filter((p) => p.product_name?.toLowerCase().includes(ql));
      setProducts(filtered);
    } catch (err) {
      console.error('[Cafe24ThumbnailPicker] 검색 실패', err);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // 모달 열릴 때 초기화
  useEffect(() => {
    if (!open) return;
    setSearchInput('');
    setSearchText('');
    setSelected(null);
    setDetailImages([]);
    fetchInitial();
  }, [open, fetchInitial]);

  // ESC 처리
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selected) setSelected(null);
        else onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose, selected]);

  if (!open) return null;

  const onSearch = () => {
    const q = searchInput.trim();
    setSearchText(q);
    if (q) fetchSearch(q);
    else fetchInitial();
  };

  const openDetail = async (product: Cafe24Product) => {
    setSelected(product);
    setDetailLoading(true);
    // 우선 리스트에서 받은 정보로 사용 가능한 이미지 표시 (즉시성)
    const initial = extractImages(product);
    setDetailImages(initial);
    try {
      // ① 상세 API — embed=additional_image 로 추가 이미지 포함 요청
      //    cafe24 OpenAPI 는 기본 응답에 additional_image 를 안 보내므로 명시적 요청 필요.
      const detailRes = await fetch(
        `${API_HOST}/api/${MALL_ID}/products/${product.product_no}?embed=additional_image`
      );
      let detailProduct: Cafe24Product = product;
      if (detailRes.ok) {
        const data = await detailRes.json();
        detailProduct = ((data as { product?: Cafe24Product }).product || data) as Cafe24Product;
        console.debug('[Cafe24ThumbnailPicker] 상세 응답:', detailProduct);
      }
      let merged = extractImages({ ...product, ...detailProduct });

      // ② additional_image 가 비어있거나 적으면 전용 엔드포인트로 다시 시도
      const adds = detailProduct.additional_image;
      const hasAdds = Array.isArray(adds) && adds.length > 0;
      if (!hasAdds) {
        try {
          const addRes = await fetch(
            `${API_HOST}/api/${MALL_ID}/products/${product.product_no}/additionalimages`
          );
          if (addRes.ok) {
            const addData = await addRes.json();
            console.debug('[Cafe24ThumbnailPicker] additionalimages 응답:', addData);
            // 응답 형태가 server 마다 다를 수 있어 여러 키 검사
            const list = (addData.additionalimages
              || addData.additional_images
              || addData.images
              || addData) as unknown;
            if (Array.isArray(list)) {
              const fromAdds = extractImages({ ...detailProduct, additional_image: list });
              const seen = new Set(merged.map((m) => m.url));
              fromAdds.forEach((m) => { if (!seen.has(m.url)) { merged.push(m); seen.add(m.url); } });
            }
          }
        } catch (err) {
          console.warn('[Cafe24ThumbnailPicker] additionalimages 엔드포인트 실패', err);
        }
      }

      setDetailImages(merged);
    } catch (err) {
      console.warn('[Cafe24ThumbnailPicker] 상세 이미지 조회 실패 — 리스트 이미지만 표시', err);
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(15, 23, 42, 0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 760,
          maxHeight: '85vh',
          background: '#ffffff',
          borderRadius: 12,
          boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* 헤더 */}
        <div style={{ padding: '18px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {selected && (
              <button
                type="button"
                onClick={() => setSelected(null)}
                style={{ padding: '4px 10px', fontSize: 12, border: '1px solid #d1d5db', background: '#fff', borderRadius: 6, cursor: 'pointer', color: '#374151' }}
              >
                ← 목록
              </button>
            )}
            <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
              {selected ? selected.product_name : '🛒 cafe24 썸네일 가져오기'}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            style={{ padding: '6px 12px', fontSize: 13, border: '1px solid #d1d5db', background: '#fff', borderRadius: 6, cursor: 'pointer', color: '#374151' }}
          >
            닫기 (ESC)
          </button>
        </div>

        {/* ───── 리스트 뷰 ───── */}
        {!selected && (
          <>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: 8 }}>
              <input
                type="text"
                value={searchInput}
                placeholder="상품명 검색 (예: 맥스, 럭스)"
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    // 외부 form 의 implicit submit 으로 모달이 닫히는 문제 방지.
                    e.preventDefault();
                    e.stopPropagation();
                    onSearch();
                  }
                }}
                style={{ flex: 1, padding: '8px 12px', fontSize: 13, border: '1px solid #d1d5db', borderRadius: 6, outline: 'none' }}
              />
              <button
                type="button"
                onClick={onSearch}
                disabled={loading}
                style={{ padding: '8px 16px', fontSize: 13, fontWeight: 600, background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1 }}
              >
                검색
              </button>
              {searchText && (
                <button
                  type="button"
                  onClick={() => { setSearchInput(''); setSearchText(''); fetchInitial(); }}
                  style={{ padding: '8px 12px', fontSize: 13, color: '#ef4444', border: '1px solid #fecaca', background: '#fff', borderRadius: 6, cursor: 'pointer' }}
                >
                  초기화
                </button>
              )}
            </div>

            <div style={{ flex: 1, overflowY: 'auto', background: '#fff' }}>
              {loading ? (
                <div style={{ textAlign: 'center', color: '#9ca3af', padding: '60px 0', fontSize: 14 }}>
                  불러오는 중…
                </div>
              ) : products.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#9ca3af', padding: '60px 0', fontSize: 14 }}>
                  {searchText ? `"${searchText}" 검색 결과 없음` : '상품이 없습니다.'}
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                      <th style={{ width: 90, padding: '10px 12px', textAlign: 'left', color: '#6b7280', fontWeight: 600 }}>썸네일</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left', color: '#6b7280', fontWeight: 600 }}>상품명</th>
                      <th style={{ width: 110, padding: '10px 12px', textAlign: 'right', color: '#6b7280', fontWeight: 600 }}>가격</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((p) => {
                      const thumb = p.list_image || p.detail_image || p.small_image || '';
                      return (
                        <tr
                          key={p.product_no}
                          onClick={() => openDetail(p)}
                          style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer', transition: 'background 0.15s' }}
                          onMouseOver={(e) => e.currentTarget.style.background = '#f8fafc'}
                          onMouseOut={(e) => e.currentTarget.style.background = '#fff'}
                        >
                          <td style={{ padding: '10px 12px' }}>
                            <div style={{ width: 64, height: 64, borderRadius: 6, background: '#f3f4f6', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              {thumb ? (
                                <img src={proxyImageUrl(thumb)} alt={p.product_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              ) : (
                                <span style={{ color: '#cbd5e1', fontSize: 20 }}>🖼️</span>
                              )}
                            </div>
                          </td>
                          <td style={{ padding: '10px 12px', color: '#111827', fontWeight: 500 }}>
                            {p.product_name}
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'right', color: '#374151' }}>
                            {p.price !== undefined ? `${Number(p.price).toLocaleString()}원` : '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            <div style={{ padding: '10px 20px', borderTop: '1px solid #e5e7eb', fontSize: 12, color: '#6b7280', display: 'flex', justifyContent: 'space-between' }}>
              <span>{searchText ? `검색 결과 ${products.length}개` : `최근 등록 상품 ${products.length}개`}</span>
              <span>💡 더 많은 상품은 검색으로 찾아주세요</span>
            </div>
          </>
        )}

        {/* ───── 상세 뷰 ───── */}
        {selected && (
          <div style={{ flex: 1, overflowY: 'auto', padding: 16, background: '#f9fafb' }}>
            {detailLoading && (
              <div style={{ marginBottom: 12, fontSize: 12, color: '#6b7280' }}>
                추가 이미지 불러오는 중…
              </div>
            )}
            {detailImages.length === 0 && !detailLoading ? (
              <div style={{ textAlign: 'center', color: '#9ca3af', padding: '40px 0', fontSize: 14 }}>
                사용 가능한 이미지가 없습니다.
              </div>
            ) : (
              <>
                <p style={{ margin: '0 0 12px', fontSize: 12, color: '#6b7280' }}>
                  사용할 이미지를 클릭하세요 — 총 <b>{detailImages.length}</b>장
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                  {detailImages.map((img, idx) => (
                    <button
                      key={`${img.url}-${idx}`}
                      type="button"
                      onClick={() => onSelect(img.url, selected)}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 6,
                        padding: 8,
                        background: '#fff',
                        border: '1px solid #e5e7eb',
                        borderRadius: 8,
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.15s',
                      }}
                      onMouseOver={(e) => { e.currentTarget.style.borderColor = '#2563eb'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(37,99,235,0.15)'; }}
                      onMouseOut={(e) => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.boxShadow = 'none'; }}
                    >
                      <div style={{ aspectRatio: '1/1', background: '#f3f4f6', borderRadius: 4, overflow: 'hidden' }}>
                        <img
                          src={proxyImageUrl(img.url)}
                          alt={img.label}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      </div>
                      <div style={{ fontSize: 11, color: '#6b7280', textAlign: 'center' }}>
                        {img.label}
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

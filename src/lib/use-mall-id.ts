'use client';
import { useEffect, useState } from 'react';
import { DEFAULT_MALL_ID } from './cafe24-api';

// reference 프로젝트의 useMallId 동등물.
// URL 의 ?mall_id 또는 ?state, 그리고 localStorage 의 mallId 를 fallback 으로 사용.
// SSR 안전을 위해 useEffect 내에서만 window/localStorage 에 접근.
export function useMallId(): string {
  const [mallId, setMallId] = useState<string>(DEFAULT_MALL_ID);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get('mall_id') || params.get('state');
    const fromStorage = localStorage.getItem('mallId');
    const resolved = fromUrl || fromStorage || DEFAULT_MALL_ID;
    if (fromUrl) localStorage.setItem('mallId', fromUrl);
    setMallId(resolved);
  }, []);

  return mallId;
}

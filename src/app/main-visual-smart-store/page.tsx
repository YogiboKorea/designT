'use client';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import Link from 'next/link';
import MainVisualCanvas from '../../components/MainVisualCanvas';
import PreviewModal from '../../components/PreviewModal';
import AppShell from '@/components/AppShell';
import { TextItem } from '../builder/types';
import {
  MAIN_VISUAL_SIZES,
  MainVisualCanvas as MainVisualCanvasType,
  MainVisualDevice,
  MainVisualState,
  ImageTransform,
  createDefaultText,
  createEmptyMainVisualState,
  gradientStopsToCss,
  hexToRgba,
} from './types';

// ============================================================================
// 스마트스토어 비주얼 제작기 (웹 1920x860 / 모바일 750x1350)
// 이미지 처리 방식: cover — 업로드 이미지는 캔버스를 꽉 채우며 비율에 맞춰 자동 크롭.
// 그라데이션 배경: 이미지가 없을 때 linear-gradient 로 배경을 깔 수 있음.
// ============================================================================

const CAPTURE_IDS: Record<MainVisualDevice, string> = {
  web: 'main-visual-capture-web',
  mobile: 'main-visual-capture-mobile',
};

// MAIN_VISUAL_SIZES 는 ?size= URL 파라미터 처리에서 mutation 되므로,
// SPA 네비게이션 사이에서도 스마트스토어 기본 사이즈를 안전하게 복구하기 위해
// 모듈 최초 로드 시점의 값을 별도로 보존한다.
const ORIGINAL_WEB_SIZE = { ...MAIN_VISUAL_SIZES.web };
const ORIGINAL_MOBILE_SIZE = { ...MAIN_VISUAL_SIZES.mobile };

export default function MainVisualBuilderPage() {
  const [title, setTitle] = useState('');
  const [device, setDevice] = useState<MainVisualDevice>('web');
  const [isSingleMode, setIsSingleMode] = useState(false);

  // ─────────────────────────────────────────────────────────────────────────
  // Undo/Redo 히스토리 엔벨롭
  //  - past   : 이전 스냅샷 스택
  //  - present: 현재 상태 (state/setState 인터페이스로 노출)
  //  - future : redo 스택 (Ctrl+Shift+Z 또는 Ctrl+Y)
  //
  // 드래그처럼 짧은 간격 내 연속 변경은 "한 묶음"으로 보고 스냅샷을 생략(coalesce).
  // COALESCE_MS = 300ms. 마지막 변경으로부터 300ms 후 다음 변경이 오면 그때 새 스냅샷.
  // ─────────────────────────────────────────────────────────────────────────
  interface HistoryEnvelope {
    past: MainVisualState[];
    present: MainVisualState;
    future: MainVisualState[];
  }
  const MAX_HISTORY = 100;
  const COALESCE_MS = 300;

  const [hist, setHist] = useState<HistoryEnvelope>(() => ({
    past: [],
    present: createEmptyMainVisualState(),
    future: [],
  }));
  const lastSnapshotRef = useRef<number>(0);

  const state = hist.present;

  // setState 인터페이스 유지 (하위 코드 호환). functional/직접 값 둘 다 지원.
  const setState: React.Dispatch<React.SetStateAction<MainVisualState>> = (value) => {
    setHist((h) => {
      const next =
        typeof value === 'function'
          ? (value as (p: MainVisualState) => MainVisualState)(h.present)
          : value;
      const now = Date.now();
      const shouldSnapshot = now - lastSnapshotRef.current > COALESCE_MS;
      lastSnapshotRef.current = now;
      return {
        past: shouldSnapshot
          ? [...h.past, h.present].slice(-MAX_HISTORY)
          : h.past,
        present: next,
        future: [], // 새 편집이 오면 redo 스택은 버림
      };
    });
  };

  const canUndo = hist.past.length > 0;
  const canRedo = hist.future.length > 0;

  const undo = useCallback(() => {
    setHist((h) => {
      if (h.past.length === 0) return h;
      const prev = h.past[h.past.length - 1];
      return {
        past: h.past.slice(0, -1),
        present: prev,
        future: [h.present, ...h.future].slice(0, MAX_HISTORY),
      };
    });
    // undo 직후 바로 이어지는 편집은 반드시 새 스냅샷으로
    lastSnapshotRef.current = 0;
  }, []);

  const redo = useCallback(() => {
    setHist((h) => {
      if (h.future.length === 0) return h;
      const nxt = h.future[0];
      return {
        past: [...h.past, h.present].slice(-MAX_HISTORY),
        present: nxt,
        future: h.future.slice(1),
      };
    });
    lastSnapshotRef.current = 0;
  }, []);

  // Ctrl+Z / ⌘+Z    → undo
  // Ctrl+Shift+Z / ⌘+Shift+Z / Ctrl+Y → redo
  // input·textarea 안에서는 브라우저 기본 동작(텍스트 undo) 존중
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (t.tagName === 'INPUT' ||
          t.tagName === 'TEXTAREA' ||
          (t as any).isContentEditable)
      ) {
        return;
      }
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;
      const key = e.key.toLowerCase();
      if (key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((key === 'z' && e.shiftKey) || key === 'y') {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo]);

  const [activeTextId, setActiveTextId] = useState<string | null>(null);
  const [eventId, setEventId] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  const applySnsPreset = (type: 'A' | 'B' | 'C' | 'D' | 'E', isInit = false) => {
    setState((prev) => {
      const current = prev.web;
      const t = Date.now().toString();
      let nextWeb = { ...current };

      const bottomY = MAIN_VISUAL_SIZES.web.height - 120;

      if (type === 'A') {
        nextWeb = {
          ...nextWeb,
          useGradient: true,
          showLogo: true,
          logoColor: 'white',
          gradient: {
            angle: 180,
            stops: [
              { color: '#000000', opacity: 0.5, offset: 0 },
              { color: '#000000', opacity: 0, offset: 50 },
            ]
          },
          texts: [
            {
              id: t + 'snsA1',
              text: '요기보 빈백 가정의 달 특가',
              position: { x: 90, y: 190 },
              style: { color: '#FFFFFF', fontSize: 52, fontWeight: 600, textAlign: 'center', lineHeight: 1.2, letterSpacing: -1, fontFamily: "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, sans-serif", textShadow: '0 2px 10px rgba(0,0,0,0.3)', width: 900 },
            },
            {
              id: t + 'snsA2',
              text: 'UP TO 25%',
              position: { x: 90, y: 260 },
              style: { color: '#3DE2FF', fontSize: 160, fontWeight: 800, textAlign: 'center', lineHeight: 1.1, letterSpacing: -2, fontFamily: "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, sans-serif", textShadow: '0 4px 15px rgba(0,0,0,0.3)', width: 900 },
            }
          ]
        };
      } else if (type === 'B') {
        nextWeb = {
          ...nextWeb,
          useGradient: true,
          showLogo: true,
          logoColor: 'color',
          gradient: {
            angle: 0,
            stops: [
              { color: '#FFFFFF', opacity: 0.8, offset: 0 },
              { color: '#FFFFFF', opacity: 0, offset: 40 },
            ]
          },
          texts: [
            {
              id: t + 'snsB1',
              text: 'UP TO\n25%',
              position: { x: 740, y: 80 },
              style: { color: '#FFFFFF', backgroundColor: '#FF5555', fontSize: 36, subFontSize: 72, fontWeight: 800, textAlign: 'center', lineHeight: 1.1, letterSpacing: 0, fontFamily: "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, sans-serif", isBadge: true, badgeShape: 'starburst', width: 220 },
            },
            {
              id: t + 'snsB2',
              text: '요기보 빈백 소파',
              position: { x: 70, y: MAIN_VISUAL_SIZES.web.height - 360 },
              style: { color: '#222222', fontSize: 68, fontWeight: 700, textAlign: 'left', lineHeight: 1.2, letterSpacing: -1, fontFamily: "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, sans-serif" },
            },
            {
              id: t + 'snsB3',
              text: ' 가정의달 역대급 할인 중 ',
              position: { x: 70, y: MAIN_VISUAL_SIZES.web.height - 265 },
              style: { color: '#FFFFFF', backgroundColor: '#A01515', fontSize: 62, fontWeight: 800, textAlign: 'left', lineHeight: 1.2, letterSpacing: -1, fontFamily: "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, sans-serif" },
            }
          ]
        };
      } else if (type === 'C') {
        nextWeb = {
          ...nextWeb,
          useGradient: false,
          showLogo: true,
          logoColor: 'white',
          texts: [
            {
              id: t + 'snsC1',
              text: '좁은 방은 넓게, 거실은 아늑하게!',
              position: { x: 80, y: 80 },
              style: { color: '#666666', fontSize: 36, fontWeight: 600, textAlign: 'left', lineHeight: 1.2, letterSpacing: -1, fontFamily: "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, sans-serif" },
            },
            {
              id: t + 'snsC2',
              text: '요기보 빈백 소파',
              position: { x: 80, y: 150 },
              style: { color: '#111111', fontSize: 85, fontWeight: 800, textAlign: 'left', lineHeight: 1.2, letterSpacing: -2, fontFamily: "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, sans-serif" },
            },
            {
              id: t + 'snsC3',
              text: ' 가정의 달 최대 25% 할인 ',
              position: { x: 70, y: 250 },
              style: { color: '#111111', backgroundColor: '#FFD6E0', fontSize: 85, fontWeight: 800, textAlign: 'left', lineHeight: 1.2, letterSpacing: -2, fontFamily: "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, sans-serif" },
            },
            {
              id: t + 'snsC4',
              text: '요기보 빈백 25% 특가로 구매하기 →',
              position: { x: 0, y: bottomY },
              style: { color: '#FFFFFF', backgroundColor: '#333333', fontSize: 40, fontWeight: 600, textAlign: 'center', lineHeight: 120, letterSpacing: -1, fontFamily: "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, sans-serif", width: 1080 },
            }
          ]
        };
      } else if (type === 'D') {
        nextWeb = {
          ...nextWeb,
          useGradient: false,
          showLogo: true,
          logoColor: 'color',
          texts: [
            {
              id: t + 'snsD1',
              text: '어린이날 선물 고민 중이라면?',
              position: { x: 0, y: 140 },
              style: { color: '#444444', fontSize: 40, fontWeight: 600, textAlign: 'center', lineHeight: 1.2, letterSpacing: -1, fontFamily: "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, sans-serif", width: 1080 },
            },
            {
              id: t + 'snsD2',
              text: '털 빠짐 없이 안전한',
              position: { x: 0, y: 210 },
              style: { color: '#111111', fontSize: 90, fontWeight: 900, textAlign: 'center', lineHeight: 1.2, letterSpacing: -2, fontFamily: "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, sans-serif", width: 1080 },
            },
            {
              id: t + 'snsD3',
              text: '요기보 애착 인형',
              position: { x: 0, y: 320 },
              style: { color: '#22C55E', fontSize: 90, fontWeight: 900, textAlign: 'center', lineHeight: 1.2, letterSpacing: -2, fontFamily: "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, sans-serif", width: 1080 },
            },
            {
              id: t + 'snsD4',
              text: '요기보 애착 인형 10% 특가로 구매하기 →',
              position: { x: 0, y: bottomY },
              style: { color: '#FFFFFF', backgroundColor: '#1E293B', fontSize: 40, fontWeight: 600, textAlign: 'center', lineHeight: 120, letterSpacing: -1, fontFamily: "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, sans-serif", width: 1080 },
            }
          ]
        };
      } else if (type === 'E') {
        nextWeb = {
          ...nextWeb,
          useGradient: false,
          showLogo: true,
          logoColor: 'white',
          texts: [
            {
              id: t + 'snsE1',
              text: '어린이날·어버이날 선물 고민 끝!',
              position: { x: 0, y: 100 },
              style: { color: '#444444', fontSize: 40, fontWeight: 600, textAlign: 'center', lineHeight: 1.2, letterSpacing: -1, fontFamily: "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, sans-serif", width: 1080 },
            },
            {
              id: t + 'snsE2',
              text: '요기보 빈백 소파',
              position: { x: 0, y: 170 },
              style: { color: '#111111', fontSize: 90, fontWeight: 900, textAlign: 'center', lineHeight: 1.2, letterSpacing: -2, fontFamily: "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, sans-serif", width: 1080 },
            },
            {
              id: t + 'snsE3',
              text: ' 최대 25% 할인 중! ',
              position: { x: 160, y: 280 },
              style: { color: '#FFFFFF', backgroundColor: '#EF4444', fontSize: 85, fontWeight: 900, textAlign: 'center', lineHeight: 1.2, letterSpacing: -2, fontFamily: "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, sans-serif" },
            },
            {
              id: t + 'snsE4',
              text: '요기보 빈백 25% 특가로 구매하기 →',
              position: { x: 0, y: bottomY },
              style: { color: '#FFFFFF', backgroundColor: '#333333', fontSize: 40, fontWeight: 600, textAlign: 'center', lineHeight: 120, letterSpacing: -1, fontFamily: "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, sans-serif", width: 1080 },
            }
          ]
        };
      }

      return {
        ...prev,
        web: nextWeb
      };
    });
    if (!isInit) {
      // 강제 스냅샷
      lastSnapshotRef.current = 0;
    }
  };

  const applyWebPreset = (type: 'Default' | 'A' | 'B' | 'C' | 'D' | 'E', isInit = false) => {
    // A타입, E타입 선택 시 원본 이미지의 누끼(배경 제거)를 자동으로 진행
    if ((type === 'A' || type === 'E') && state.web.bgImage && !isInit) {
      const sourceUrl = state.web.bgImageOriginal || state.web.bgImage;
      (async () => {
        try {
          setAiStatus('배경 자동 제거 중…');
          const removedUrl = await runBackgroundRemoval(sourceUrl);
          updateCurrent({ bgImage: removedUrl, bgImageOriginal: sourceUrl });
          setAiStatus('');
        } catch (err) {
          console.error('자동 배경 제거 실패:', err);
          setAiStatus('');
        }
      })();
    }

    setState((prev) => {
      const current = prev.web;
      const t = Date.now().toString();
      let nextWeb = { ...current };



      if (type === 'Default') {
        nextWeb = {
          ...nextWeb,
          bgColor: '#ffffff',
          bgGraphicType: null,
          imageMode: 'free',
          useGradient: true,
          showLogo: false,
          logoColor: 'color',
          gradient: {
            angle: 90,
            stops: [
              { color: '#F2E2CB', opacity: 1, offset: 0 },
              { color: '#F2E2CB', opacity: 0, offset: 50 },
            ]
          },
          texts: [
            { id: t + 'w1', text: '글로벌 NO.1 베스트 셀러', position: { x: 388, y: 260 }, style: { color: '#252525', fontSize: 45, fontWeight: 700, textAlign: 'left', lineHeight: 1, letterSpacing: -0.9, fontFamily: "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, sans-serif" } },
            { id: t + 'w2', text: 'YOGIBO MAX', position: { x: 388, y: 329 }, style: { color: '#FFFFFF', fontSize: 90, fontWeight: 800, textAlign: 'left', lineHeight: 1, letterSpacing: -1.8, fontFamily: "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, sans-serif", textShadow: '0 2px 10px #BCB29B' } },
            { id: t + 'w3', text: '5초에 1개씩 판매되는 빈백 소파', position: { x: 388, y: 443 }, style: { color: '#252525', fontSize: 28, fontWeight: 400, textAlign: 'left', lineHeight: 40, letterSpacing: -0.84, fontFamily: "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, sans-serif" } },
            { id: t + 'w4', text: '요기보 맥스 →', position: { x: 388, y: 524 }, style: { color: '#FFFFFF', backgroundColor: '#45B3C2', fontSize: 28, fontWeight: 600, textAlign: 'center', lineHeight: 1, letterSpacing: -0.56, isPill: true, fontFamily: "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, sans-serif" } }
          ]
        };
      } else if (type === 'A') {
        nextWeb = {
          ...nextWeb,
          bgColor: '#0C2053',
          bgGraphicType: 'A',
          imageMode: 'free',
          useGradient: false,
          showLogo: false,
          texts: [
            { id: t + 'webA1', text: 'LUNAR NEW YEAR,', position: { x: 388, y: 310 }, style: { color: '#FFFFFF', fontSize: 63, fontWeight: 300, textAlign: 'left', lineHeight: 1.1, letterSpacing: 0, fontFamily: "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, sans-serif" } },
            { id: t + 'webA2', text: 'RELAXING HOME', position: { x: 388, y: 390 }, style: { color: '#FFFFFF', fontSize: 63, fontWeight: 800, textAlign: 'left', lineHeight: 1.1, letterSpacing: 0, fontFamily: "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, sans-serif" } },
            { id: t + 'webA3', text: '2025.01.17(금) ~ 02.02(일)', position: { x: 388, y: 510 }, style: { color: '#FFFFFF', fontSize: 30, fontWeight: 400, textAlign: 'left', lineHeight: 1.1, letterSpacing: 0, fontFamily: "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, sans-serif" } }
          ]
        };
      } else if (type === 'B') {
        nextWeb = {
          ...nextWeb,
          bgColor: '#F4E8DB',
          bgGraphicType: 'B',
          imageMode: 'cover',
          useGradient: true,
          gradient: {
            angle: 90,
            stops: [
              { color: '#F4E8DB', opacity: 1, offset: 35 },
              { color: '#F4E8DB', opacity: 0, offset: 60 },
            ]
          },
          showLogo: false,
          texts: [
            { id: t + 'webB1', text: '4/11(금) ~ 4/20(일)', position: { x: 388, y: 190 }, style: { color: '#FFFFFF', fontSize: 26, fontWeight: 500, textAlign: 'left', lineHeight: 1.1, letterSpacing: 0, fontFamily: "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, sans-serif" } },
            { id: t + 'webB2', text: 'UP TO 15% OFF', position: { x: 388, y: 240 }, style: { color: '#FFFFFF', fontSize: 44, fontWeight: 800, textAlign: 'left', lineHeight: 1.1, letterSpacing: 0, fontFamily: "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, sans-serif" } },
            { id: t + 'webB3', text: 'SPRING', position: { x: 388, y: 316 }, style: { color: '#FFFFFF', fontSize: 120, fontWeight: 900, textAlign: 'left', lineHeight: 0.9, letterSpacing: -2, fontFamily: "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, sans-serif", textShadow: '0 2px 10px rgba(0,0,0,0.1)' } },
            { id: t + 'webB4', text: '& PASTEL', position: { x: 388, y: 443 }, style: { color: '#FFFFFF', fontSize: 120, fontWeight: 900, textAlign: 'left', lineHeight: 0.9, letterSpacing: -2, fontFamily: "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, sans-serif", textShadow: '0 2px 10px rgba(0,0,0,0.1)' } },
            { id: t + 'webB5', text: '프로모션 바로가기 →', position: { x: 388, y: 620 }, style: { color: '#A08F81', backgroundColor: '#FFFFFF', fontSize: 22, fontWeight: 700, textAlign: 'center', lineHeight: 66, width: 260, isPill: true, fontFamily: "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, sans-serif" } }
          ]
        };
      } else if (type === 'C') {
        nextWeb = {
          ...nextWeb,
          bgColor: '#F4F1ED',
          bgGraphicType: 'C',
          imageMode: 'free',
          useGradient: false,
          showLogo: false,
          texts: [
            { id: t + 'webC1', text: 'yogibo × oggi otto', position: { x: 388, y: 350 }, style: { color: '#333333', fontSize: 63, fontWeight: 900, textAlign: 'left', lineHeight: 1.1, letterSpacing: 0, fontFamily: "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, sans-serif" } },
            { id: t + 'webC2', text: 'VIEW MORE >', position: { x: 388, y: 480 }, style: { color: '#FFFFFF', backgroundColor: '#83655E', fontSize: 22, fontWeight: 600, textAlign: 'center', lineHeight: 60, width: 240, isPill: true, fontFamily: "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, sans-serif" } }
          ]
        };
      } else if (type === 'D') {
        nextWeb = {
          ...nextWeb,
          bgColor: '#A6CFD8',
          bgGraphicType: 'D',
          imageMode: 'cover',
          useGradient: false,
          showLogo: false,
          texts: [
            { id: t + 'webD1', text: 'Yogibo Max', position: { x: 388, y: 322 }, style: { color: '#FFFFFF', fontSize: 115, fontWeight: 600, textAlign: 'left', lineHeight: 1.1, letterSpacing: -2, fontFamily: "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, sans-serif" } },
            { id: t + 'webD2', text: '가장 편안한 빈백 소파.', position: { x: 388, y: 475 }, style: { color: '#FFFFFF', fontSize: 40, fontWeight: 500, textAlign: 'left', lineHeight: 1.1, letterSpacing: 0, fontFamily: "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, sans-serif" } },
            { id: t + 'webD3', text: '자세히 보기 >', position: { x: 388, y: 600 }, style: { color: '#FFFFFF', backgroundColor: '#62B5CC', fontSize: 24, fontWeight: 600, textAlign: 'center', lineHeight: 70, width: 260, isPill: true, fontFamily: "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, sans-serif" } }
          ]
        };
      } else if (type === 'E') {
        nextWeb = {
          ...nextWeb,
          bgColor: '#0070B8',
          bgGraphicType: 'E',
          imageMode: 'free',
          useGradient: false,
          showLogo: false,
          texts: [
            { id: t + 'webE1', text: 'Sling GO', position: { x: 388, y: 190 }, style: { color: '#FFFFFF', fontSize: 138, fontWeight: 900, textAlign: 'left', lineHeight: 1.1, letterSpacing: -2, textShadow: '0 4px 10px rgba(0,0,0,0.2)', fontFamily: "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, sans-serif" } },
            { id: t + 'webE2', text: 'Re:Cover', position: { x: 388, y: 380 }, style: { color: '#E4B869', fontSize: 76, fontWeight: 900, textAlign: 'left', lineHeight: 1.1, letterSpacing: 0, fontFamily: "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, sans-serif", textShadow: '0 2px 10px rgba(0,0,0,0.2)' } },
            { id: t + 'webE3', text: '가방과 스카프의\n2WAY 활용', position: { x: 388, y: 520 }, style: { color: '#FFFFFF', fontSize: 30, fontWeight: 400, textAlign: 'center', lineHeight: 1.3, letterSpacing: 0, fontFamily: "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, sans-serif", textShadow: '0 2px 5px rgba(0,0,0,0.3)' } },
            { id: t + 'webE4', text: '자세히 보기 >', position: { x: 388, y: 696 }, style: { color: '#FFFFFF', backgroundColor: 'rgba(98, 181, 204, 0.7)', fontSize: 22, fontWeight: 600, textAlign: 'center', lineHeight: 60, width: 240, isPill: true, fontFamily: "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, sans-serif" } }
          ]
        };
      }

      return {
        ...prev,
        web: nextWeb
      };
    });
    if (!isInit) {
      lastSnapshotRef.current = 0;
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // 모바일 레이아웃 프리셋 — 750×1350 세로 캔버스 (스마트스토어)
  //   웹과 동일한 Default/A~E 6종. X 좌표는 모바일 기본(135) 기준,
  //   width:480 + textAlign:'center' 로 캔버스 가로 중앙 정렬 박스 패턴.
  // ──────────────────────────────────────────────────────────────────────────
  const applyMobilePreset = (type: 'Default' | 'A' | 'B' | 'C' | 'D' | 'E', isInit = false) => {
    const PF = "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, sans-serif";

    if ((type === 'A' || type === 'E') && state.mobile.bgImage && !isInit) {
      const sourceUrl = state.mobile.bgImageOriginal || state.mobile.bgImage;
      (async () => {
        try {
          setAiStatus('배경 자동 제거 중…');
          const removedUrl = await runBackgroundRemoval(sourceUrl);
          setState((prev) => ({
            ...prev,
            mobile: { ...prev.mobile, bgImage: removedUrl, bgImageOriginal: sourceUrl },
          }));
          setAiStatus('');
        } catch (err) {
          console.error('자동 배경 제거 실패:', err);
          setAiStatus('');
        }
      })();
    }

    setState((prev) => {
      const current = prev.mobile;
      const t = Date.now().toString();
      let nextMobile = { ...current };

      if (type === 'Default') {
        nextMobile = {
          ...nextMobile,
          bgColor: '#ffffff',
          bgGraphicType: null,
          imageMode: 'free',
          useGradient: true,
          showLogo: false,
          gradient: {
            angle: 180,
            stops: [
              { color: '#F2E2CB', opacity: 1, offset: 0 },
              { color: '#F2E2CB', opacity: 0, offset: 50 },
            ],
          },
          texts: [
            { id: t + 'mDef1', text: '글로벌 NO.1 베스트 셀러', position: { x: 135, y: 160 }, style: { color: '#252525', fontSize: 38, fontWeight: 700, textAlign: 'center', lineHeight: 1, letterSpacing: -0.76, fontFamily: PF, width: 480 } },
            { id: t + 'mDef2', text: 'YOGIBO MAX', position: { x: 135, y: 222 }, style: { color: '#FFFFFF', fontSize: 76, fontWeight: 800, textAlign: 'center', lineHeight: 1, letterSpacing: -1.52, fontFamily: PF, textShadow: '0 2px 10px #BCB29B', width: 480 } },
            { id: t + 'mDef3', text: '5초에 1개씩 판매되는 빈백 소파', position: { x: 135, y: 322 }, style: { color: '#252525', fontSize: 26, fontWeight: 400, textAlign: 'center', lineHeight: 40, letterSpacing: -0.78, fontFamily: PF, width: 480 } },
            { id: t + 'mDef4', text: '요기보 맥스 →', position: { x: 265, y: 1207 }, style: { color: '#FFFFFF', backgroundColor: '#45B3C2', fontSize: 26, fontWeight: 600, textAlign: 'center', lineHeight: 1, letterSpacing: -0.52, fontFamily: PF, isPill: true } },
          ],
        };
      } else if (type === 'A') {
        nextMobile = {
          ...nextMobile,
          bgColor: '#0C2053',
          bgGraphicType: 'A',
          imageMode: 'free',
          useGradient: false,
          showLogo: false,
          texts: [
            { id: t + 'mA1', text: 'LUNAR NEW YEAR,', position: { x: 60, y: 180 }, style: { color: '#FFFFFF', fontSize: 46, fontWeight: 300, textAlign: 'left', lineHeight: 1.1, letterSpacing: 0, fontFamily: PF } },
            { id: t + 'mA2', text: 'RELAXING HOME', position: { x: 60, y: 260 }, style: { color: '#FFFFFF', fontSize: 46, fontWeight: 800, textAlign: 'left', lineHeight: 1.1, letterSpacing: 0, fontFamily: PF } },
            { id: t + 'mA3', text: '2025.01.17(금) ~ 02.02(일)', position: { x: 60, y: 380 }, style: { color: '#FFFFFF', fontSize: 22, fontWeight: 400, textAlign: 'left', lineHeight: 1.1, letterSpacing: 0, fontFamily: PF } },
          ],
        };
      } else if (type === 'B') {
        nextMobile = {
          ...nextMobile,
          bgColor: '#F4E8DB',
          bgGraphicType: 'B',
          imageMode: 'cover',
          useGradient: true,
          gradient: {
            angle: 180,
            stops: [
              { color: '#F4E8DB', opacity: 0, offset: 35 },
              { color: '#F4E8DB', opacity: 1, offset: 60 },
            ],
          },
          showLogo: false,
          texts: [
            { id: t + 'mB1', text: '4/11(금) ~ 4/20(일)', position: { x: 135, y: 700 }, style: { color: '#FFFFFF', fontSize: 22, fontWeight: 500, textAlign: 'center', lineHeight: 1.1, letterSpacing: 0, fontFamily: PF, width: 480 } },
            { id: t + 'mB2', text: 'SPRING', position: { x: 135, y: 760 }, style: { color: '#FFFFFF', fontSize: 120, fontWeight: 900, textAlign: 'center', lineHeight: 0.9, letterSpacing: -2, fontFamily: PF, textShadow: '0 2px 10px rgba(0,0,0,0.1)', width: 480 } },
            { id: t + 'mB3', text: '& PASTEL', position: { x: 135, y: 900 }, style: { color: '#FFFFFF', fontSize: 120, fontWeight: 900, textAlign: 'center', lineHeight: 0.9, letterSpacing: -2, fontFamily: PF, textShadow: '0 2px 10px rgba(0,0,0,0.1)', width: 480 } },
            { id: t + 'mB4', text: 'UP TO 15% OFF', position: { x: 135, y: 1080 }, style: { color: '#FFFFFF', fontSize: 36, fontWeight: 800, textAlign: 'center', lineHeight: 1.1, letterSpacing: 0, fontFamily: PF, width: 480 } },
            { id: t + 'mB5', text: '프로모션 바로가기 →', position: { x: 245, y: 1170 }, style: { color: '#A08F81', backgroundColor: '#FFFFFF', fontSize: 22, fontWeight: 700, textAlign: 'center', lineHeight: 60, width: 260, isPill: true, fontFamily: PF } },
          ],
        };
      } else if (type === 'C') {
        nextMobile = {
          ...nextMobile,
          bgColor: '#F4F1ED',
          bgGraphicType: 'C',
          imageMode: 'free',
          useGradient: false,
          showLogo: false,
          texts: [
            { id: t + 'mC1', text: 'yogibo × oggi otto', position: { x: 135, y: 600 }, style: { color: '#333333', fontSize: 44, fontWeight: 900, textAlign: 'center', lineHeight: 1.1, letterSpacing: 0, fontFamily: PF, width: 480 } },
            { id: t + 'mC2', text: 'VIEW MORE >', position: { x: 270, y: 750 }, style: { color: '#FFFFFF', backgroundColor: '#83655E', fontSize: 18, fontWeight: 600, textAlign: 'center', lineHeight: 50, width: 210, isPill: true, fontFamily: PF } },
          ],
        };
      } else if (type === 'D') {
        nextMobile = {
          ...nextMobile,
          bgColor: '#A6CFD8',
          bgGraphicType: 'D',
          imageMode: 'cover',
          useGradient: false,
          showLogo: false,
          texts: [
            { id: t + 'mD1', text: 'Yogibo Max', position: { x: 135, y: 200 }, style: { color: '#3F4D52', fontSize: 80, fontWeight: 600, textAlign: 'center', lineHeight: 1.1, letterSpacing: -1, fontFamily: PF, width: 480 } },
            { id: t + 'mD2', text: 'これまでで最も自由な家具。', position: { x: 135, y: 320 }, style: { color: '#3F4D52', fontSize: 24, fontWeight: 500, textAlign: 'center', lineHeight: 1.2, letterSpacing: 0, fontFamily: PF, width: 480 } },
            { id: t + 'mD3', text: 'さらに詳しく >', position: { x: 250, y: 410 }, style: { color: '#FFFFFF', backgroundColor: '#62B5CC', fontSize: 20, fontWeight: 600, textAlign: 'center', lineHeight: 56, width: 250, isPill: true, fontFamily: PF } },
          ],
        };
      } else if (type === 'E') {
        nextMobile = {
          ...nextMobile,
          bgColor: '#0070B8',
          bgGraphicType: 'E',
          imageMode: 'free',
          useGradient: false,
          showLogo: false,
          texts: [
            { id: t + 'mE1', text: 'Sling GO', position: { x: 135, y: 100 }, style: { color: '#FFFFFF', fontSize: 130, fontWeight: 900, textAlign: 'center', lineHeight: 1.1, letterSpacing: -2, textShadow: '0 4px 10px rgba(0,0,0,0.2)', fontFamily: PF, width: 480 } },
            { id: t + 'mE2', text: 'Re:Cover', position: { x: 135, y: 260 }, style: { color: '#E4B869', fontSize: 58, fontWeight: 900, textAlign: 'center', lineHeight: 1.1, letterSpacing: 0, textShadow: '0 2px 10px rgba(0,0,0,0.2)', fontFamily: PF, width: 480 } },
            { id: t + 'mE3', text: 'バッグとスカーフの\n2WAY', position: { x: 135, y: 800 }, style: { color: '#FFFFFF', fontSize: 24, fontWeight: 400, textAlign: 'center', lineHeight: 1.4, letterSpacing: 0, textShadow: '0 2px 5px rgba(0,0,0,0.3)', fontFamily: PF, width: 480 } },
            { id: t + 'mE4', text: 'さらに詳しく >', position: { x: 250, y: 1240 }, style: { color: '#FFFFFF', backgroundColor: 'rgba(98, 181, 204, 0.7)', fontSize: 18, fontWeight: 600, textAlign: 'center', lineHeight: 50, width: 250, isPill: true, fontFamily: PF } },
          ],
        };
      }

      return {
        ...prev,
        mobile: nextMobile,
      };
    });
    if (!isInit) {
      lastSnapshotRef.current = 0;
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);

    // Custom size override for SmartStore / SNS
    const sizeParam = params.get('size');
    if (sizeParam) {
      const parts = sizeParam.split('x');
      const w = parseInt(parts[0], 10);
      const h = parseInt(parts[1] || '0', 10) || 800;
      if (w > 0) {
        MAIN_VISUAL_SIZES.web.width = w;
        MAIN_VISUAL_SIZES.web.height = h;
        MAIN_VISUAL_SIZES.web.label = `맞춤형 (${sizeParam})`;
        setIsSingleMode(true);

        if (sizeParam === '1080x1080' || sizeParam === '1080x1350') {
          // 초기 진입 시 타입 A 적용
          applySnsPreset('A', true);
        } else if (sizeParam === '1920x860') {
          applyWebPreset('Default', true);
        }
      }
    } else {
      // ?size 파라미터가 없으면 스마트스토어 기본 사이즈로 복구
      // (이전 SNS/맞춤 모드 방문에서 mutation 된 상태가 남아있을 수 있음)
      Object.assign(MAIN_VISUAL_SIZES.web, ORIGINAL_WEB_SIZE);
      Object.assign(MAIN_VISUAL_SIZES.mobile, ORIGINAL_MOBILE_SIZE);
      setIsSingleMode(false);
    }

    const id = params.get('id');
    if (id) {
      setEventId(id);
      fetch(`/api/events/${id}`)
        .then((r) => r.json())
        .then((d) => {
          if (d.success && d.data) {
            setTitle(d.data.title || '');
            const sections = d.data.sections;
            if (sections && sections.length > 0 && sections[0].type === 'mainVisualPair') {
              const { web, mobile } = sections[0];
              setState((prev) => ({
                web: web ? { ...prev.web, ...web } : prev.web,
                mobile: mobile ? { ...prev.mobile, ...mobile } : prev.mobile,
              }));
              lastSnapshotRef.current = Date.now();
            }
          }
        })
        .finally(() => setIsInitializing(false));
    } else {
      setIsInitializing(false);
    }
  }, []);

  const [isSaving, setIsSaving] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [previewWebUrl, setPreviewWebUrl] = useState('');
  const [previewMobileUrl, setPreviewMobileUrl] = useState('');
  const [previewDisplayDevice, setPreviewDisplayDevice] = useState<MainVisualDevice>('web');
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);

  const current = state[device];
  const activeText = current.texts.find((t) => t.id === activeTextId) || null;
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 탭 전환 시 선택 초기화
  useEffect(() => {
    setActiveTextId(null);
  }, [device]);

  // --------------------------------------------------------------------------
  // 상태 업데이트 헬퍼
  // --------------------------------------------------------------------------
  const updateCurrent = (patch: Partial<MainVisualState[MainVisualDevice]>) => {
    setState((prev) => ({ ...prev, [device]: { ...prev[device], ...patch } }));
  };

  const updateTexts = (texts: TextItem[]) => updateCurrent({ texts });

  // 이미지 선택(리사이즈 핸들 표시) 상태 — 탭 전환 시 자동 해제는 activeTextId 와 동일
  const [imageActive, setImageActive] = useState(false);
  useEffect(() => {
    setImageActive(false);
  }, [device]);

  // 블러 브러시 컨트롤
  const [brushMode, setBrushMode] = useState(false);
  const [brushSize, setBrushSize] = useState(40);
  const [brushErase, setBrushErase] = useState(false);
  // 탭 전환 시 브러시 모드 종료
  useEffect(() => {
    setBrushMode(false);
    setBrushErase(false);
  }, [device]);

  /** 브러시 모드 켤 때 blur 강도가 0 이면 효과가 안 보이므로 자동 보정(기본 8px). */
  const enableBrushMode = () => {
    if (!current.bgImage) {
      alert('먼저 이미지를 업로드해주세요.');
      return;
    }
    const tf = current.imageTransform;
    if (tf && (tf.blur ?? 0) === 0) {
      updateCurrent({ imageTransform: { ...tf, blur: 8 } });
    }
    setImageActive(true);
    setActiveTextId(null);
    setBrushMode(true);
  };

  /** 페인팅된 마스크 초기화 */
  const clearBlurMask = () => {
    const tf = current.imageTransform;
    if (!tf) return;
    updateCurrent({
      imageTransform: { ...tf, blurMask: undefined },
    });
  };

  // ─────────────────────────────────────────────────────────────────
  //  ✨ AI 자동 처리
  //     · removeBackground : @imgly/background-removal (WASM, 로컬 실행)
  //     · matchColor       : 이미지 왼쪽 15% 픽셀 평균 색을 그라데이션에 반영
  //   체크된 옵션만 업로드/재적용 시 동작.
  // ─────────────────────────────────────────────────────────────────
  const [aiSettings, setAiSettings] = useState({
    removeBackground: false,
    matchColor: true, // 기본 ON — 효과 좋고 부작용 적음
  });
  const [aiStatus, setAiStatus] = useState<string>('');

  /** 이미지 왼쪽 15% 영역의 평균 색을 hex 로 반환. */
  const sampleLeftEdgeColor = (img: HTMLImageElement): string | null => {
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    if (!w || !h) return null;
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d');
    if (!ctx) return null;
    try {
      ctx.drawImage(img, 0, 0);
      // 샘플 영역 확대 — 왼쪽 20% 까지 평균 내서 단일 픽셀 편향 제거
      const sampleW = Math.max(1, Math.floor(w * 0.2));
      const data = ctx.getImageData(0, 0, sampleW, h).data;
      let r = 0, g = 0, b = 0, n = 0;
      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] < 128) continue; // 약간 투명한 픽셀은 스킵
        r += data[i];
        g += data[i + 1];
        b += data[i + 2];
        n++;
      }
      if (n === 0) return null;
      r = r / n;
      g = g / n;
      b = b / n;

      // 흰색 30% 블렌딩 → 원색보다 은은한 톤 (너무 진해지는 것 방지)
      const mix = 0.3;
      r = r * (1 - mix) + 255 * mix;
      g = g * (1 - mix) + 255 * mix;
      b = b * (1 - mix) + 255 * mix;

      const toHex = (v: number) => Math.round(v).toString(16).padStart(2, '0');
      return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    } catch (err) {
      console.warn('색상 샘플링 실패', err);
      return null;
    }
  };

  /** AI 배경 제거 — @imgly/background-removal 의 dynamic import.
   *
   *  publicPath 를 지정하지 않으면 imgly 가 자신의 버전에 맞는 공식 CDN
   *  (staticimgly.com) 에서 WASM·ONNX·resources.json 을 자동 로드한다.
   *  최초 1회만 다운로드(~30MB), 이후 브라우저 캐시 사용.
   */
  const runBackgroundRemoval = async (url: string): Promise<string> => {
    // @ts-ignore — 로컬 환경과 Vercel 환경의 타입 인식 차이로 인한 빌드 에러 방지
    const mod = await import('@imgly/background-removal');
    const removeBackground = mod.removeBackground as (
      input: string | Blob,
      config?: Record<string, unknown>,
    ) => Promise<Blob>;

    const blob = await removeBackground(url, {
      // publicPath 생략 → imgly 공식 CDN 자동 사용
      model: 'isnet_fp16', // fp16 양자화 (속도 ↑, 용량 ↓)
      // Turbopack 환경에서 Worker mode 는 불안정 → 메인 스레드에서 실행
      proxyToWorker: false,
      progress: (key: string, current: number, total: number) => {
        const pct = total > 0 ? Math.round((current / total) * 100) : 0;
        const label = key.includes('fetch')
          ? '모델 다운로드'
          : key.includes('compute')
            ? '추론 중'
            : '처리 중';
        setAiStatus(`🤖 AI 배경 제거 · ${label} ${pct}%`);
      },
    });
    return URL.createObjectURL(blob);
  };

  /** 이미지 URL 에 체크된 AI 옵션들을 순서대로 적용.
   *   색상 매칭은 동기 / 배경 제거는 비동기 (진행 상황 표시). */
  const applyAIPipeline = async (
    sourceUrl: string,
    probe: HTMLImageElement,
  ): Promise<{ displayUrl: string; gradientColor: string | null }> => {
    let displayUrl = sourceUrl;
    let gradientColor: string | null = null;

    if (aiSettings.matchColor) {
      gradientColor = sampleLeftEdgeColor(probe);
    }
    if (aiSettings.removeBackground) {
      setAiStatus('🤖 AI 배경 제거 중… (최초 실행 시 모델 다운로드로 수십 초 걸릴 수 있어요)');
      try {
        displayUrl = await runBackgroundRemoval(sourceUrl);
      } catch (err) {
        console.error('배경 제거 실패', err);
        setAiStatus('❌ AI 배경 제거 실패: ' + ((err as Error)?.message ?? '알 수 없는 오류'));
        setTimeout(() => setAiStatus(''), 4000);
        // 실패 시에도 원본으로 계속 진행
        return { displayUrl: sourceUrl, gradientColor };
      }
      setAiStatus('✅ 배경 제거 완료');
      setTimeout(() => setAiStatus(''), 2000);
    }

    return { displayUrl, gradientColor };
  };

  /**
   * 이미지 업로드 → AI 설정(색상 매칭/배경 제거) 체크된 옵션 적용 후 free 모드로 세팅.
   *  · 원본 가로가 캔버스 80%를 넘으면 80%에 맞춰 축소 (비율 유지)
   *  · 세로도 80%를 넘으면 추가 축소
   *  · 최종 위치는 캔버스 중앙
   *  · 배경 제거 원본은 bgImageOriginal 에 보관 (되돌리기용)
   */
  const handleBgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('이미지 파일만 업로드 가능합니다.');
      return;
    }
    const url = URL.createObjectURL(file);
    const canvas = MAIN_VISUAL_SIZES[device];

    // 1) 원본 크기 읽기
    const probe = new Image();
    await new Promise<void>((resolve) => {
      probe.onload = () => resolve();
      probe.onerror = () => resolve(); // 실패해도 fallback 으로 진행
      probe.src = url;
    });

    const natW = probe.naturalWidth || canvas.width;
    const natH = probe.naturalHeight || canvas.height;
    const aspect = natW / Math.max(natH, 1);

    const maxW = canvas.width * 0.8;
    const maxH = canvas.height * 0.8;
    let w = natW;
    let h = natH;
    if (w > maxW) { h = h * (maxW / w); w = maxW; }
    if (h > maxH) { w = w * (maxH / h); h = maxH; }
    const x = Math.round((canvas.width - w) / 2);
    const y = Math.round((canvas.height - h) / 2);

    // 2) 색상 매칭은 원본에서 먼저 뽑아두고,
    //    배경 제거 실행 전 화면에는 원본을 먼저 반영 (사용자 대기감 낮춤)
    updateCurrent({
      bgImage: url,
      bgImageOriginal: url,
      imageMode: 'free',
      imageTransform: { x, y, width: Math.round(w), aspect, blur: 0 },
    });
    setImageActive(true);
    e.target.value = '';

    // 3) AI 파이프라인 실행 (체크된 옵션만)
    if (aiSettings.matchColor || aiSettings.removeBackground) {
      const { displayUrl, gradientColor } = await applyAIPipeline(url, probe);
      const g = current.gradient;
      const patch: Partial<MainVisualCanvasType> = {};
      if (displayUrl !== url) patch.bgImage = displayUrl;
      if (gradientColor && g) {
        if (current.bgGraphicType !== 'A' && current.bgGraphicType !== 'E') {
          patch.useGradient = true;
          patch.gradient = {
            ...g,
            stops: g.stops.map((s) => ({ ...s, color: gradientColor })),
          };
          // 이미지 뒤에 깔릴 배경색도 샘플링한 색으로 통일 (흰색 대신)
          patch.bgColor = gradientColor;
        }
      }
      if (Object.keys(patch).length > 0) {
        updateCurrent(patch);
      }
    }
  };

  /** 현재 bgImageOriginal 에 AI 파이프라인을 다시 적용. */
  const handleReApplyAI = async () => {
    const source = current.bgImageOriginal || current.bgImage;
    if (!source) {
      alert('먼저 이미지를 업로드해주세요.');
      return;
    }
    const probe = new Image();
    await new Promise<void>((resolve) => {
      probe.onload = () => resolve();
      probe.onerror = () => resolve();
      probe.src = source;
    });
    const { displayUrl, gradientColor } = await applyAIPipeline(source, probe);
    const g = current.gradient;
    const patch: Partial<MainVisualCanvasType> = { bgImage: displayUrl };
    if (gradientColor && g) {
      if (current.bgGraphicType !== 'A' && current.bgGraphicType !== 'E') {
        patch.useGradient = true;
        patch.gradient = {
          ...g,
          stops: g.stops.map((s) => ({ ...s, color: gradientColor })),
        };
        patch.bgColor = gradientColor;
      }
    }
    updateCurrent(patch);
  };

  /** 배경 제거를 되돌리고 원본 이미지로 복구. */
  const handleRestoreOriginal = () => {
    if (!current.bgImageOriginal) return;
    updateCurrent({ bgImage: current.bgImageOriginal });
  };

  // ─────────────────────────────────────────────────────────────────
  //  🎨 와이드 배너 레이아웃 자동 변환 (AI 배경 제거 미사용)
  //     yogibo 참고 이미지처럼 "이미지를 우측 배치 + 왼쪽 영역은 이미지의
  //     왼쪽 가장자리 색으로 자연스럽게 확장" 하는 레이아웃.
  //
  //   기법 — "Edge Stretch + Feather"
  //     1) 합성 canvas 생성 (최종 캔버스 크기 그대로)
  //     2) 이미지 왼쪽 8% 영역의 평균 색 추출 → 배경 전체 채움
  //     3) 이미지를 우측 정렬로 그림 (높이 100% or 가로 80% 제한)
  //     4) 이미지 왼쪽 edge 의 1px 세로 스트립을 왼쪽 영역 전체에 stretch
  //        → 벽/배경색이 왼쪽으로 "계속 이어지는" 착시
  //     5) 이미지 왼쪽 경계에 feather 그라디언트 오버레이 → 경계 숨김
  //
  //   장점: AI / 외부 API 없음, 즉시 실행, 비용 0
  //   한계: 이미지 왼쪽 가장자리가 단조로운 배경(벽 등)이어야 자연스러움.
  //         진짜 벽 확장 효과는 AI 아웃페인팅(Stable Diffusion 등)이 필요.
  // ─────────────────────────────────────────────────────────────────
  const loadImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });

  /**
   * 이미지 가장자리 영역의 평균 색을 살짝 밝게 블렌딩해 hex 로 반환.
   *  · side='left'  : 왼쪽 20% 영역 (웹 배너용)
   *  · side='top'   : 상단 20% 영역 (모바일 배너용)
   * 원색을 그대로 쓰면 너무 진하고 단조로워서 배경과의 대비가 세짐 →
   * 흰색(#ffffff) 과 70:30 으로 블렌딩해 은은한 톤으로 완화.
   */
  /** #RRGGBB hex 문자열을 {r,g,b} 로 파싱. 실패 시 베이지 기본값. */
  const parseHex = (hex: string): { r: number; g: number; b: number } => {
    const m = hex.match(/^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
    if (!m) return { r: 242, g: 226, b: 203 };
    return {
      r: parseInt(m[1], 16),
      g: parseInt(m[2], 16),
      b: parseInt(m[3], 16),
    };
  };

  const sampleEdgeColor = (
    img: HTMLImageElement,
    side: 'left' | 'top',
  ): string | null => {
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    if (!w || !h) return null;
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d');
    if (!ctx) return null;
    try {
      ctx.drawImage(img, 0, 0);
      // 샘플 영역 확대 — 8% → 20% 로 넓게 평균 내서 단색 느낌 완화
      const sx = 0;
      const sy = 0;
      const sw = side === 'left' ? Math.max(1, Math.floor(w * 0.2)) : w;
      const sh = side === 'top'  ? Math.max(1, Math.floor(h * 0.2)) : h;

      const data = ctx.getImageData(sx, sy, sw, sh).data;
      let r = 0, g = 0, b = 0, n = 0;
      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] < 128) continue;
        r += data[i];
        g += data[i + 1];
        b += data[i + 2];
        n++;
      }
      if (n === 0) return null;
      r = r / n;
      g = g / n;
      b = b / n;

      // 흰색 30% 블렌딩 → 살짝 연한 톤으로
      const mix = 0.3;
      r = r * (1 - mix) + 255 * mix;
      g = g * (1 - mix) + 255 * mix;
      b = b * (1 - mix) + 255 * mix;

      const toHex = (v: number) => Math.round(v).toString(16).padStart(2, '0');
      return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    } catch {
      return null;
    }
  };

  /** 상단 edge 색 (모바일 배너용) */
  const sampleTopEdgeColor = (img: HTMLImageElement): string | null =>
    sampleEdgeColor(img, 'top');

  const handleConvertToBannerStyle = async () => {
    let source = current.bgImage;
    if (!source) {
      alert('먼저 이미지를 업로드해주세요.');
      return;
    }

    // A타입 또는 E타입인 경우, "✨ 배너 스타일로 AI 자동 배치" 클릭 시 자동으로 누끼(배경 제거) 진행
    const forceRemoveBg = (current.bgGraphicType === 'A' || current.bgGraphicType === 'E');

    if (forceRemoveBg) {
      try {
        setAiStatus('배경 자동 제거 중…');
        const removedUrl = await runBackgroundRemoval(current.bgImageOriginal || current.bgImage!);
        source = removedUrl;
      } catch (err) {
        console.error('배경 제거 실패:', err);
      }
    }

    setAiStatus('📐 배너 레이아웃 생성 중…');
    try {
      const img = await loadImage(source);
      const canvas = MAIN_VISUAL_SIZES[device];
      const imgAspect = img.naturalWidth / Math.max(img.naturalHeight, 1);

      // device 별로 배치 전략이 다름 —
      //   · 웹   : 세로 캔버스가 가로로 긴 구조 → 이미지 우측 정렬 (세로 100%)
      //   · 모바일: 세로로 긴 구조 → 이미지 하단 정렬 (가로 100%)
      let drawW: number, drawH: number, drawX: number, drawY: number;
      let edgeColor: string;
      let angle: number;
      let fadeStartPct: number, fadeEndPct: number;

      if (isSingleMode && canvas.width === 1080 && canvas.height === 1080) {
        // ── SNS (1080x1080): 원본 이미지 살리면서 추천 뱃지 색상 적용 ──
        const bgSample = sampleTopEdgeColor(img) || '#F2E2CB';
        
        // 밝기 계산해서 대비되는 포인트 컬러 추천
        const r = parseInt(bgSample.slice(1,3), 16) || 255;
        const g = parseInt(bgSample.slice(3,5), 16) || 255;
        const b = parseInt(bgSample.slice(5,7), 16) || 255;
        const luma = 0.299 * r + 0.587 * g + 0.114 * b;
        const recommendedBadgeColor = luma > 160 ? '#FF5555' : '#FFC000';

        const t = Date.now().toString();
        
        // 기존에 있는 텍스트 중 뱃지가 있으면 해당 색상만 추천 색상으로 변경
        let newTexts = current.texts.map(text => {
          if (text.style.isBadge) {
            return { ...text, style: { ...text.style, backgroundColor: recommendedBadgeColor } };
          }
          return text;
        });

        // 텍스트가 하나도 없으면 기본 옵션 B(뱃지 있는 형태)를 추천 색상으로 채워서 생성
        if (newTexts.length === 0) {
          newTexts = [
            {
              id: t + 'snsB1',
              text: 'UP TO\n25%',
              position: { x: 740, y: 80 },
              style: { color: luma > 160 ? '#FFFFFF' : '#222222', backgroundColor: recommendedBadgeColor, fontSize: 36, fontWeight: 800, textAlign: 'center', lineHeight: 1.1, letterSpacing: 0, fontFamily: "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, sans-serif", isBadge: true, width: 220 },
            },
            {
              id: t + 'snsB2',
              text: '요기보 빈백 소파',
              position: { x: 70, y: 720 },
              style: { color: luma > 160 ? '#222222' : '#FFFFFF', fontSize: 68, fontWeight: 700, textAlign: 'left', lineHeight: 1.2, letterSpacing: -1, fontFamily: "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, sans-serif" },
            },
            {
              id: t + 'snsB3',
              text: ' 가정의달 역대급 할인 중 ',
              position: { x: 70, y: 815 },
              style: { color: '#FFFFFF', backgroundColor: '#A01515', fontSize: 62, fontWeight: 800, textAlign: 'left', lineHeight: 1.2, letterSpacing: -1, fontFamily: "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, sans-serif" },
            }
          ];
        }

        updateCurrent({
          bgImage: source, // 원본 그대로 유지 (cover 모드)
          bgImageOriginal: source,
          bgColor: '#ffffff',
          imageMode: 'cover',
          imageTransform: undefined,
          showLogo: true,
          logoColor: luma > 160 ? 'color' : 'white', // 배경이 밝으면 컬러 로고, 어두우면 흰색 로고
          useGradient: true,
          gradient: {
            angle: 0,
            stops: [
              { color: luma > 160 ? '#FFFFFF' : '#000000', opacity: 0.8, offset: 0 },
              { color: luma > 160 ? '#FFFFFF' : '#000000', opacity: 0, offset: 40 },
            ]
          },
          texts: newTexts

        });
        setImageActive(false);
        setAiStatus('✅ SNS 배너 레이아웃 생성 완료!');
        setTimeout(() => setAiStatus(''), 2500);
        return;
      } else if (device === 'web') {
        // ── 웹: 세로 100% + 오른쪽 정렬, 왼쪽 → 오른쪽 페이드 ──
        drawW = canvas.height * imgAspect;
        drawH = canvas.height;
        const maxW = canvas.width * 0.8;
        if (drawW > maxW) { drawW = maxW; drawH = drawW / imgAspect; }
        drawX = Math.round(canvas.width - drawW);
        drawY = Math.round((canvas.height - drawH) / 2);

        edgeColor = sampleLeftEdgeColor(img) || '#F2E2CB';
        angle = 90;

        const imageStartPct = (drawX / canvas.width) * 100;
        const imageWidthPct = (drawW / canvas.width) * 100;
        fadeStartPct = Math.max(0, imageStartPct - imageWidthPct * 0.1);
        fadeEndPct   = Math.min(100, imageStartPct + imageWidthPct * 0.35);

        // 이미지의 왼쪽 경계를 Canvas 통째로 투명도 페이드(Feather) 처리
        // CSS mask-image 는 html2canvas 에 인식이 안 되므로 원천적으로 이미지를 합성.
        const cvs = document.createElement('canvas');
        cvs.width = img.naturalWidth;
        cvs.height = img.naturalHeight;
        const cx = cvs.getContext('2d');
        let featheredSource = source;
        if (cx && !forceRemoveBg) {
          cx.drawImage(img, 0, 0);
          cx.globalCompositeOperation = 'destination-out';
          const fg = cx.createLinearGradient(0, 0, cvs.width * 0.2, 0);
          fg.addColorStop(0, 'rgba(0,0,0,1)');
          fg.addColorStop(1, 'rgba(0,0,0,0)');
          cx.fillStyle = fg;
          cx.fillRect(0, 0, cvs.width * 0.2, cvs.height);
          featheredSource = cvs.toDataURL('image/png', 0.95);
        }

        const isPresetActive = !!current.bgGraphicType;
        const finalBgColor = isPresetActive ? current.bgColor : edgeColor;
        const finalUseGradient = isPresetActive ? current.useGradient : true;
        const finalGradient = isPresetActive
          ? current.gradient
          : (current.gradient ? {
              ...current.gradient,
              angle,
              stops: [
                { color: edgeColor, opacity: 1, offset: 0           },
                { color: edgeColor, opacity: 1, offset: fadeStartPct },
                { color: edgeColor, opacity: 0, offset: fadeEndPct   },
              ],
            } : undefined);

        updateCurrent({
          bgImage: featheredSource,
          bgImageOriginal: source,
          bgColor: finalBgColor,
          imageMode: 'free',
          imageTransform: {
            x: drawX,
            y: drawY,
            width: Math.round(drawW),
            aspect: imgAspect,
            blur: 0,
          },
          useGradient: finalUseGradient,
          gradient: finalGradient,
        });
        setImageActive(false);
        setAiStatus('✅ 배너 레이아웃 생성 완료!');
        setTimeout(() => setAiStatus(''), 2500);
        return;
      } else {
        // ── 모바일: 가로 100% + 하단 정렬, 위 → 아래 페이드 ──
        //   yogibo 참고 모바일 배너 구조:
        //     상단 ~35%  : 텍스트 영역 (이미지 상단 색으로 자연스러운 연장)
        //     중간       : 부드러운 페이드
        //     하단 ~65%  : 이미지 (소파 + 인물)
        //
        //   이미지 상단을 가상으로 확장:
        //     1) 캔버스 크기의 합성 canvas 생성
        //     2) 상단 edge 색으로 fill (fallback)
        //     3) 이미지 상단 1px 스트립을 위쪽 빈 영역 전체에 세로로 stretch
        //        → "벽/배경이 위로 계속 이어지는" 착시
        //     4) 원본 이미지를 하단에 그림
        //     5) 합성 결과를 새 bgImage 로 저장 (cover 모드로 꽉 채움)
        drawW = canvas.width;
        drawH = drawW / imgAspect;
        const maxH = canvas.height * 0.7;
        if (drawH > maxH) { drawH = maxH; drawW = drawH * imgAspect; }
        drawX = Math.round((canvas.width - drawW) / 2);
        drawY = Math.round(canvas.height - drawH);

        edgeColor = sampleTopEdgeColor(img) || '#F2E2CB';
        angle = 180;

        // 합성 canvas — 배경 edge fill + 이미지 + 상단 stretch (그라데이션은 오버레이로 유지)
        const comp = document.createElement('canvas');
        comp.width = canvas.width;
        comp.height = canvas.height;
        const cctx = comp.getContext('2d');
        if (cctx) {
          cctx.fillStyle = edgeColor;
          cctx.fillRect(0, 0, canvas.width, canvas.height);
          cctx.drawImage(img, drawX, drawY, drawW, drawH);
          if (drawY > 0) {
            try {
              const stripH = Math.max(1, Math.round(drawH * 0.01));
              const stripX = Math.max(drawX, 0);
              const stripY = Math.max(drawY, 0);
              const stripW = Math.min(drawW, canvas.width);
              const strip = cctx.getImageData(stripX, stripY, stripW, stripH);
              const stripCanvas = document.createElement('canvas');
              stripCanvas.width = stripW;
              stripCanvas.height = stripH;
              const stripCtx = stripCanvas.getContext('2d');
              if (stripCtx) {
                stripCtx.putImageData(strip, 0, 0);
                cctx.drawImage(stripCanvas, 0, 0, stripW, stripH, stripX, 0, stripW, drawY);
              }
            } catch (e) {
              console.warn('edge stretch 스킵 (fallback 단색):', e);
            }
          }
        }
        const compositeUrl = comp.toDataURL('image/jpeg', 0.92);

        // 그라데이션 offset 계산 (CSS 오버레이용)
        const imageStartPct = (drawY / canvas.height) * 100;
        const imageHeightPct = (drawH / canvas.height) * 100;
        fadeStartPct = Math.max(0, imageStartPct - imageHeightPct * 0.15);
        fadeEndPct   = Math.min(100, imageStartPct + imageHeightPct * 0.25);

        const g = current.gradient;
        updateCurrent({
          bgImage: compositeUrl,
          bgImageOriginal: source,
          bgColor: edgeColor,
          imageMode: 'cover',
          imageTransform: undefined,
          useGradient: true,
          gradient: g
            ? {
                ...g,
                angle,
                stops: [
                  { color: edgeColor, opacity: 1, offset: 0           },
                  { color: edgeColor, opacity: 1, offset: fadeStartPct },
                  { color: edgeColor, opacity: 0, offset: fadeEndPct   },
                ],
              }
            : undefined,
        });
        setImageActive(false);
        setAiStatus('✅ 배너 레이아웃 생성 완료!');
        setTimeout(() => setAiStatus(''), 2500);
        return;
      }
    } catch (err) {
      console.error('배너 레이아웃 생성 실패', err);
      setAiStatus('❌ 실패: ' + ((err as Error)?.message ?? '알 수 없는 오류'));
      setTimeout(() => setAiStatus(''), 4000);
    }
  };


  const handleClearImage = () => {
    updateCurrent({
      bgImage: '',
      imageTransform: undefined,
    });
    setImageActive(false);
  };

  const handleImageTransformChange = (t: ImageTransform) => {
    updateCurrent({ imageTransform: t });
  };

  /**
   * 꽉 채우기(cover) ↔ 자유 배치(free) 토글.
   * free 로 돌아올 때 imageTransform 이 비어있으면 기본 배치를 생성.
   */
  const handleToggleImageMode = (next: 'cover' | 'free') => {
    const canvas = MAIN_VISUAL_SIZES[device];
    if (next === 'free' && !current.imageTransform && current.bgImage) {
      // 원본 비율 재측정 시도 — 이미 blob: URL 이므로 동기적 접근 불가. 우선 1:1 가정.
      updateCurrent({
        imageMode: 'free',
        imageTransform: {
          x: Math.round(canvas.width * 0.1),
          y: Math.round(canvas.height * 0.1),
          width: Math.round(canvas.width * 0.5),
          aspect: 1,
          blur: 0,
        },
      });
      return;
    }
    updateCurrent({ imageMode: next });
  };

  /** 이미지를 캔버스 중앙으로 리셋 (현재 width 유지) */
  const handleCenterImage = () => {
    if (!current.imageTransform) return;
    const canvas = MAIN_VISUAL_SIZES[device];
    const t = current.imageTransform;
    const h = t.width / Math.max(t.aspect, 0.01);
    updateCurrent({
      imageTransform: {
        ...t,
        x: Math.round((canvas.width - t.width) / 2),
        y: Math.round((canvas.height - h) / 2),
      },
    });
  };

  /** 이미지를 캔버스에 꽉 채우도록 width 조정 (free 모드에서 빠른 편의) */
  const handleFitImage = () => {
    if (!current.imageTransform) return;
    const canvas = MAIN_VISUAL_SIZES[device];
    const t = current.imageTransform;
    // 캔버스 비율 vs 이미지 비율 비교해서 둘 중 하나에 맞춰 채우기
    const canvasAspect = canvas.width / canvas.height;
    let w: number;
    let h: number;
    if (t.aspect > canvasAspect) {
      // 이미지가 더 가로로 긴 경우 → 세로 맞추고 가로가 넘침
      h = canvas.height;
      w = h * t.aspect;
    } else {
      w = canvas.width;
      h = w / t.aspect;
    }
    updateCurrent({
      imageTransform: {
        ...t,
        width: Math.round(w),
        x: Math.round((canvas.width - w) / 2),
        y: Math.round((canvas.height - h) / 2),
      },
    });
  };

  // --------------------------------------------------------------------------
  // 텍스트
  // --------------------------------------------------------------------------
  const handleAddText = () => {
    const newText = createDefaultText(device);
    updateTexts([...current.texts, newText]);
    setActiveTextId(newText.id);
  };

  const handleUpdateText = (
    id: string,
    text: string,
    position: { x: number; y: number },
    style: any,
  ) => {
    updateTexts(
      current.texts.map((t) =>
        t.id === id ? { ...t, text, position, style: { ...style } } : t,
      ),
    );
  };

  const handleDeleteText = (id: string) => {
    updateTexts(current.texts.filter((t) => t.id !== id));
    if (activeTextId === id) setActiveTextId(null);
  };

  const handleTextStyleChange = (patch: Partial<TextItem['style']>) => {
    if (!activeText) return;
    updateTexts(
      current.texts.map((t) =>
        t.id === activeText.id ? { ...t, style: { ...t.style, ...patch } } : t,
      ),
    );
  };

  const handleTextContentChange = (val: string) => {
    if (!activeText) return;
    updateTexts(
      current.texts.map((t) =>
        t.id === activeText.id ? { ...t, text: val } : t,
      ),
    );
  };

  // --------------------------------------------------------------------------
  // 키보드 단축키 — ESC/Enter (선택 해제) / Del (삭제)
  //   · ESC        : 어디서든 선택 해제 (input 안에서도 blur + 해제)
  //   · Enter      : input/textarea 에서 편집 확정 후 blur + 해제
  //                  (textarea 에서 줄바꿈이 필요하면 Shift+Enter)
  //   · Delete     : 선택된 텍스트/이미지를 제거
  //                  (input 안에서는 기본 글자 삭제 동작 존중)
  // --------------------------------------------------------------------------
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const inInput = !!(
        t &&
        (t.tagName === 'INPUT' ||
          t.tagName === 'TEXTAREA' ||
          (t as any).isContentEditable)
      );

      // ESC — 선택 해제 (input 안에서도 blur 처리)
      if (e.key === 'Escape') {
        e.preventDefault();
        if (inInput) (t as HTMLElement).blur?.();
        setActiveTextId(null);
        setImageActive(false);
        return;
      }

      // Enter (Shift 없이) — input/textarea 에서 편집 확정
      if (e.key === 'Enter' && !e.shiftKey && inInput) {
        e.preventDefault();
        (t as HTMLElement).blur?.();
        setActiveTextId(null);
        setImageActive(false);
        return;
      }

      // Delete — 선택된 텍스트 또는 이미지 제거
      if ((e.key === 'Delete' || e.key === 'Del') && !inInput) {
        if (activeTextId) {
          e.preventDefault();
          handleDeleteText(activeTextId);
          setActiveTextId(null);
          return;
        }
        if (imageActive) {
          e.preventDefault();
          handleClearImage();
          return;
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // 주의: handleDeleteText / handleClearImage 는 컴포넌트 body 정의로
    //   매 렌더마다 새 참조지만, deps 에 activeTextId / imageActive 만 넣어도
    //   재등록 시점의 최신 클로저를 캡처해서 충분히 올바르게 동작함.
  }, [activeTextId, imageActive]);

  // --------------------------------------------------------------------------
  // 캡처 — html2canvas 의 3-stop linear-gradient 버그 우회
  //   기법: 그라데이션 div 의 CSS `background: linear-gradient(...)` 을
  //         임시로 `background: url(...)` (Canvas 로 미리 구운 PNG) 로 교체.
  //         html2canvas 는 image URL 은 정확히 렌더하므로 결과 일관성 보장.
  //   이미지/텍스트/블러 등 나머지는 html2canvas 가 잘 처리하므로 그대로 둠.
  // --------------------------------------------------------------------------
  const captureDevice = async (dev: MainVisualDevice): Promise<string | null> => {
    const el = document.getElementById(CAPTURE_IDS[dev]) as HTMLElement | null;
    if (!el) return null;
    const { width, height } = MAIN_VISUAL_SIZES[dev];
    const data = state[dev];

    const prevTransform = el.style.transform;
    el.style.transform = 'none';

    // 1) 그라데이션 div 찾기 — aria-hidden + background 에 linear-gradient
    const gradEls: HTMLElement[] = [];
    for (const c of Array.from(el.children)) {
      if (
        c instanceof HTMLElement &&
        c.tagName === 'DIV' &&
        c.getAttribute('aria-hidden') === 'true' &&
        typeof c.style.background === 'string' &&
        c.style.background.includes('linear-gradient')
      ) {
        gradEls.push(c);
      }
    }

    // 2) data.gradient 를 Canvas 로 구워서 dataURL 생성
    let gradUrl: string | null = null;
    if (data.useGradient && data.gradient && gradEls.length > 0) {
      const gcanvas = document.createElement('canvas');
      gcanvas.width = width;
      gcanvas.height = height;
      const gctx = gcanvas.getContext('2d');
      if (gctx) {
        const g = data.gradient;
        // CSS linear-gradient 각도 → Canvas 좌표계 변환
        //   CSS: 0°=위→아래 / 90°=왼→오 / 180°=아래→위 / 270°=오→왼
        //   → 방향벡터 (dx, dy) = (sin, -cos)
        const rad = (g.angle * Math.PI) / 180;
        const dx = Math.sin(rad);
        const dy = -Math.cos(rad);
        const cx = width / 2;
        const cy = height / 2;
        const half =
          Math.abs(width * Math.sin(rad)) / 2 +
          Math.abs(height * Math.cos(rad)) / 2;
        const x0 = cx - dx * half, y0 = cy - dy * half;
        const x1 = cx + dx * half, y1 = cy + dy * half;

        const grad = gctx.createLinearGradient(x0, y0, x1, y1);
        for (const s of g.stops) {
          const rgb = parseHex(s.color);
          grad.addColorStop(
            Math.max(0, Math.min(1, s.offset / 100)),
            `rgba(${rgb.r},${rgb.g},${rgb.b},${s.opacity})`,
          );
        }
        gctx.fillStyle = grad;
        gctx.fillRect(0, 0, width, height);
        gradUrl = gcanvas.toDataURL('image/png');
      }
    }

    // 3) 그라데이션 div 의 background 를 url(gradUrl) 로 임시 교체
    const prevBgs: string[] = [];
    const prevBgSizes: string[] = [];
    const prevBgRepeats: string[] = [];
    if (gradUrl) {
      gradEls.forEach((d) => {
        prevBgs.push(d.style.background);
        prevBgSizes.push(d.style.backgroundSize);
        prevBgRepeats.push(d.style.backgroundRepeat);
        d.style.background = `url(${gradUrl})`;
        d.style.backgroundSize = '100% 100%';
        d.style.backgroundRepeat = 'no-repeat';
      });
    }

    // 브라우저 paint 대기
    await new Promise((r) => setTimeout(r, 100));

    try {
      const canvas = await html2canvas(el, {
        useCORS: true,
        allowTaint: true,
        backgroundColor: null,
        scale: 1,
        width,
        height,
        windowWidth: width,
        windowHeight: height,
        logging: false,
      });
      return canvas.toDataURL('image/png');
    } finally {
      // 원상 복구
      el.style.transform = prevTransform;
      gradEls.forEach((d, i) => {
        d.style.background = prevBgs[i];
        d.style.backgroundSize = prevBgSizes[i];
        d.style.backgroundRepeat = prevBgRepeats[i];
      });
    }
  };

  // --------------------------------------------------------------------------
  // 현재 탭만 빠른 다운로드
  // --------------------------------------------------------------------------
  const handleQuickDownload = async () => {
    setIsSaving(true);
    setActiveTextId(null);
    await new Promise((r) => setTimeout(r, 80));
    try {
      const dataUrl = await captureDevice(device);
      if (!dataUrl) {
        alert('캡처에 실패했습니다.');
        return;
      }
      const link = document.createElement('a');
      link.href = dataUrl;
      const baseName = title || 'main_visual';
      link.download = `${baseName}_${device}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error(e);
      alert('다운로드 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  // --------------------------------------------------------------------------
  // 미리보기 열기 — 웹/모바일 둘 다 캡처해서 모달로
  // --------------------------------------------------------------------------
  const handleOpenPreview = async () => {
    if (!title.trim()) {
      alert('제목을 먼저 입력해주세요.');
      return;
    }
    setIsGeneratingPreview(true);
    setActiveTextId(null);
    await new Promise((r) => setTimeout(r, 80));
    try {
      const [web, mobile] = await Promise.all([
        captureDevice('web'),
        isSingleMode ? Promise.resolve(null) : captureDevice('mobile'),
      ]);
      if (!web && !mobile) {
        alert('미리보기 생성에 실패했습니다.');
        return;
      }
      setPreviewWebUrl(web || '');
      setPreviewMobileUrl(mobile || '');
      setPreviewDisplayDevice(device);
      setIsPreviewing(true);
    } catch (e) {
      console.error(e);
      alert('미리보기 생성 중 오류가 발생했습니다.');
    } finally {
      setIsGeneratingPreview(false);
    }
  };

  // --------------------------------------------------------------------------
  // 확정 저장: 다운로드 + FTP + DB. 각 단계 실패를 사용자에게 알림
  // --------------------------------------------------------------------------
  const handleConfirmSaveAll = async () => {
    setIsSaving(true);

    const errors: string[] = [];
    const timestamp = Date.now();
    const baseName = (title || 'main_visual').replace(/[^\w\-가-힣]/g, '_');

    const toUpload: { key: MainVisualDevice; data: string; filename: string }[] = [];
    if (previewWebUrl) {
      toUpload.push({ key: 'web', data: previewWebUrl, filename: `${baseName}_web_${timestamp}.png` });
    }
    if (!isSingleMode && previewMobileUrl) {
      toUpload.push({ key: 'mobile', data: previewMobileUrl, filename: `${baseName}_mobile_${timestamp}.png` });
    }

    try {
      // 1) 로컬 다운로드
      for (const item of toUpload) {
        const link = document.createElement('a');
        link.href = item.data;
        link.download = item.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        await new Promise((r) => setTimeout(r, 200));
      }

      // 2) FTP 업로드
      const uploaded: Record<string, string> = {};
      for (const item of toUpload) {
        try {
          const res = await fetch('/api/ftp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageBase64: item.data, filename: item.filename }),
          });
          const json = await res.json();
          if (json.success) {
            uploaded[item.key] = json.imageUrl;
          } else {
            errors.push(`FTP (${item.key}): ${json.message || '업로드 실패'}`);
          }
        } catch (err: any) {
          errors.push(`FTP (${item.key}): ${err?.message || '네트워크 오류'}`);
        }
      }

      // FTP 전체 실패 시 모드: DB 저장 취소
      // (FTP 실패로 base64 원본 다이렉트 저장 시 Vercel의 4.5MB Request Payload 제한을 초과해 413 Error & JSON 파싱 에러 유발)
      if (toUpload.length > 0 && Object.keys(uploaded).length === 0) {
        throw new Error('FTP 서버 연동 실패로 DB 기록이 중단되었습니다. Vercel의 환경변수(FTP_USER 등) 설정을 확인하세요.');
      }

      // 3) DB 기록
      const payload = {
        title,
        eventType: 'smart-store-banner',
        sections: [
          {
            type: 'mainVisualPair',
            web: {
              ...state.web,
              bgImage: uploaded.web || state.web.bgImage,
              imageUrl: uploaded.web || '',
            },
            mobile: {
              ...state.mobile,
              bgImage: uploaded.mobile || state.mobile.bgImage,
              imageUrl: uploaded.mobile || '',
            },
          },
        ],
        imageUrl: uploaded.web || uploaded.mobile || '',
      };

      let dbSaved = false;
      try {
        const url = eventId ? `/api/events/${eventId}` : '/api/events';
        const method = eventId ? 'PUT' : 'POST';
        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (json.success) {
          dbSaved = true;
        } else {
          errors.push(`DB: ${json.message || '저장 실패'}`);
        }
      } catch (err: any) {
        errors.push(`DB: ${err?.message || '네트워크 오류'}`);
      }

      // 4) 결과 안내
      const urls = Object.entries(uploaded)
        .map(([k, v]) => `${k === 'web' ? '웹' : '모바일'}: ${v}`)
        .join('\n');

      let message = '';
      if (dbSaved && urls) {
        message = '✅ 저장 완료!\n\n';
        message += `다운로드: ${toUpload.length}개\n`;
        message += 'FTP 업로드: 완료\n';
        message += 'DB 기록: 완료\n\n';
        message += '[업로드된 URL]\n' + urls;
        try {
          await navigator.clipboard.writeText(urls);
          message += '\n\n(클립보드에 복사됨)';
        } catch { /* noop */ }
      } else {
        message = '⚠ 일부 단계가 실패했습니다.\n\n';
        if (toUpload.length) message += '다운로드: 완료\n';
        message += `FTP 업로드: ${Object.keys(uploaded).length}/${toUpload.length} 성공\n`;
        message += `DB 기록: ${dbSaved ? '성공' : '실패'}\n\n`;
        if (errors.length) {
          message += '[오류 상세]\n' + errors.join('\n');
        }
      }

      alert(message);

      if (dbSaved) {
        setIsPreviewing(false);
      }
    } catch (e: any) {
      console.error(e);
      alert('저장 중 예기치 못한 오류가 발생했습니다: ' + (e?.message || e));
    } finally {
      setIsSaving(false);
    }
  };

  const size = MAIN_VISUAL_SIZES[device];

  const displayedPreviewUrl = useMemo(
    () => (previewDisplayDevice === 'web' ? previewWebUrl : previewMobileUrl),
    [previewDisplayDevice, previewWebUrl, previewMobileUrl],
  );

  // --------------------------------------------------------------------------
  // 렌더
  // --------------------------------------------------------------------------
  if (isInitializing) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f4f5f7' }}>
        데이터를 불러오는 중입니다...
      </div>
    );
  }

  return (
    <AppShell>
    <div style={{ minHeight: '100vh', background: '#f4f5f7', fontFamily: 'var(--font-sans)' }}>
      {/* AI 진행 상황 토스트 — 하단 중앙 고정 */}
      {aiStatus && (
        <div
          style={{
            position: 'fixed',
            bottom: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#111827',
            color: '#fff',
            padding: '12px 20px',
            borderRadius: 999,
            fontSize: 13,
            fontWeight: 500,
            zIndex: 9999,
            boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
            maxWidth: '90vw',
          }}
        >
          {aiStatus}
        </div>
      )}

      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 24px',
          background: '#fff',
          borderBottom: '1px solid #e5e7eb',
          position: 'sticky',
          top: 0,
          zIndex: 20,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Link
            href="/"
            style={{
              textDecoration: 'none',
              color: '#6b7280',
              fontSize: '13px',
              padding: '6px 12px',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            ← 홈
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: '16px',
              }}
            >
              🎨
            </div>
            <h1 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>스마트스토어 배너 제작기</h1>
          </div>
          <input
            type="text"
            placeholder="배너 제목 (필수)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={{
              width: '280px',
              padding: '8px 12px',
              fontSize: '14px',
              borderRadius: '8px',
              border: '1px solid #e5e7eb',
              outline: 'none',
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {/* Undo / Redo */}
          <div
            style={{
              display: 'flex',
              gap: '2px',
              background: '#f3f4f6',
              padding: '2px',
              borderRadius: '8px',
            }}
          >
            <button
              onClick={undo}
              disabled={!canUndo || isSaving || isGeneratingPreview}
              title="실행 취소 (Ctrl+Z)"
              style={{
                padding: '6px 10px',
                fontSize: '13px',
                background: 'transparent',
                color: canUndo ? '#111827' : '#9ca3af',
                border: 'none',
                borderRadius: '6px',
                cursor: canUndo ? 'pointer' : 'not-allowed',
              }}
            >
              ↶
            </button>
            <button
              onClick={redo}
              disabled={!canRedo || isSaving || isGeneratingPreview}
              title="다시 실행 (Ctrl+Shift+Z / Ctrl+Y)"
              style={{
                padding: '6px 10px',
                fontSize: '13px',
                background: 'transparent',
                color: canRedo ? '#111827' : '#9ca3af',
                border: 'none',
                borderRadius: '6px',
                cursor: canRedo ? 'pointer' : 'not-allowed',
              }}
            >
              ↷
            </button>
          </div>

          <button
            onClick={handleQuickDownload}
            disabled={isSaving || isGeneratingPreview}
            style={{
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: 600,
              background: '#fff',
              color: '#374151',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              cursor: isSaving || isGeneratingPreview ? 'not-allowed' : 'pointer',
              opacity: isSaving || isGeneratingPreview ? 0.5 : 1,
            }}
          >
            현재 탭만 다운로드
          </button>
          <button
            onClick={handleOpenPreview}
            disabled={isSaving || isGeneratingPreview}
            style={{
              padding: '8px 20px',
              fontSize: '14px',
              fontWeight: 600,
              background: '#2563eb',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              cursor: isSaving || isGeneratingPreview ? 'not-allowed' : 'pointer',
              opacity: isSaving || isGeneratingPreview ? 0.7 : 1,
            }}
          >
            {isGeneratingPreview ? '미리보기 생성 중...' : '👁 미리보기 후 저장'}
          </button>
        </div>
      </div>

      {/* Device Tabs — 자사몰 모드(웹+모바일) */}
      {!isSingleMode && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 0,
          padding: '0 24px',
          background: '#fff',
          borderBottom: '2px solid #e5e7eb',
        }}>
          {(Object.keys(MAIN_VISUAL_SIZES) as MainVisualDevice[]).map((d) => (
            <button
              key={d}
              onClick={() => setDevice(d)}
              style={{
                padding: '12px 24px',
                fontSize: '14px',
                fontWeight: device === d ? 700 : 500,
                border: 'none',
                borderBottom: device === d ? '2px solid #2563eb' : '2px solid transparent',
                background: 'transparent',
                color: device === d ? '#2563eb' : '#6b7280',
                cursor: 'pointer',
                marginBottom: '-2px',
                transition: 'all 0.15s',
              }}
            >
              {d === 'web' ? `🖥 ${MAIN_VISUAL_SIZES.web.label}` : `📱 ${MAIN_VISUAL_SIZES.mobile.label}`}
            </button>
          ))}
          <span style={{ marginLeft: 'auto', fontSize: '12px', color: '#9ca3af', paddingRight: '8px' }}>
            현재 편집: {device === 'web' ? '웹' : '모바일'} 캔버스
          </span>
        </div>
      )}

      {/* Single Mode (SNS / 맞춤형) 헤더 */}
      {isSingleMode && (
        <div style={{ display: 'flex', alignItems: 'center', padding: '12px 24px', background: '#fff', borderBottom: '1px solid #e5e7eb' }}>
          <div style={{ fontWeight: 700, fontSize: '14px', color: '#0f172a' }}>
            🎨 {MAIN_VISUAL_SIZES.web.label} 에디터
          </div>
          <span style={{ marginLeft: 'auto', fontSize: '12px', color: '#6b7280' }}>
            캔버스 사이즈: {size.width} × {size.height} px
          </span>
        </div>
      )}

      {/* Main Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '16px', padding: '20px' }}>
        {/* Canvas */}
        <div style={{ minWidth: 0 }}>
          <MainVisualCanvas
            width={size.width}
            height={size.height}
            bgImage={current.bgImage}
            bgColor={current.bgColor}
            useGradient={current.useGradient}
            gradient={current.gradient}
            bgGraphicType={current.bgGraphicType}
            showLogo={current.showLogo}
            logoColor={current.logoColor}
            imageMode={current.imageMode || 'free'}
            imageTransform={current.imageTransform}
            onImageTransformChange={handleImageTransformChange}
            imageActive={imageActive}
            onSelectImage={(v) => {
              setImageActive(v);
              if (v) setActiveTextId(null);
            }}
            brushMode={brushMode}
            brushSize={brushSize}
            brushErase={brushErase}
            edgeFeather="none"
            texts={current.texts}
            activeTextId={activeTextId}
            onSelectText={(id) => {
              if (brushMode) return; // 브러시 중엔 텍스트 선택 차단
              setActiveTextId(id);
              if (id) setImageActive(false);
            }}
            onUpdateText={handleUpdateText}
            onDeleteText={handleDeleteText}
            captureId={CAPTURE_IDS[device]}
            isPreview={isSaving || isGeneratingPreview}
          />

          <div style={{ marginTop: '10px', fontSize: '12px', color: '#6b7280' }}>
            💡 이미지는 원본 크기로 불러옵니다. 드래그로 이동, 좌상단/우하단 핸들로 크기, 우측 패널에서 블러 브러시도 사용 가능.
          </div>

          {/* 비활성 탭 원본 사이즈 유지 (캡처 대상) */}
          <div style={{ position: 'fixed', left: -99999, top: 0, pointerEvents: 'none', opacity: 0 }} aria-hidden>
            {(Object.keys(MAIN_VISUAL_SIZES) as MainVisualDevice[])
              .filter((d) => d !== device)
              .map((d) => {
                const s = MAIN_VISUAL_SIZES[d];
                const c: MainVisualCanvasType = state[d];
                const gradCss = c.useGradient && c.gradient ? gradientStopsToCss(c.gradient) : '';
                const mode = c.imageMode || 'free';
                const tf = c.imageTransform;
                const freeImg = c.bgImage && mode === 'free' && tf;
                const coverImg = c.bgImage && mode !== 'free';
                return (
                  <div
                    key={d}
                    id={CAPTURE_IDS[d]}
                    style={{
                      width: `${s.width}px`,
                      height: `${s.height}px`,
                      position: 'relative',
                      background: c.bgColor || '#ffffff',
                      overflow: 'hidden',
                    }}
                  >
                    {/* 1) 이미지 — cover 모드 (가장 아래) */}
                    {coverImg && (
                      <img
                        src={c.bgImage}
                        alt=""
                        crossOrigin="anonymous"
                        style={{
                          position: 'absolute',
                          inset: 0,
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          objectPosition: 'center',
                          zIndex: 0,
                        }}
                      />
                    )}
                    {/* 2) 이미지 — free 모드 (원본 위치/크기)
                         · blurMask 가 있으면: 원본(선명) + 블러(마스크 적용) 이중 레이어
                         · 없으면       : blur 만 이미지 전체에 적용 (구 동작 호환)
                         편집 DOM(DraggableImage) 과 동일한 구조로 렌더해야 다운로드
                         결과가 편집 미리보기와 일치함. */}
                    {freeImg && tf && (() => {
                      const imgH = tf.width / Math.max(tf.aspect, 0.01);
                      return (
                        <div
                          style={{
                            position: 'absolute',
                            left: `${tf.x}px`,
                            top: `${tf.y}px`,
                            width: `${tf.width}px`,
                            height: `${imgH}px`,
                            zIndex: 0,
                          }}
                        >
                          <img
                            src={c.bgImage}
                            alt=""
                            crossOrigin="anonymous"
                            style={{
                              position: 'absolute',
                              inset: 0,
                              width: '100%',
                              height: '100%',
                              // blurMask 가 있으면 이 레이어는 선명, 없으면 blur 적용
                              filter: !tf.blurMask && tf.blur ? `blur(${tf.blur}px)` : undefined,
                            }}
                          />
                          {tf.blurMask && tf.blur ? (
                            <>
                              <img
                                src={c.bgImage}
                                alt=""
                                crossOrigin="anonymous"
                                style={{
                                  position: 'absolute',
                                  inset: 0,
                                  width: '100%',
                                  height: '100%',
                                  filter: `blur(${tf.blur}px)`,
                                  WebkitMaskImage: `url(${tf.blurMask})`,
                                  maskImage: `url(${tf.blurMask})`,
                                  WebkitMaskSize: '100% 100%',
                                  maskSize: '100% 100%',
                                  WebkitMaskRepeat: 'no-repeat',
                                  maskRepeat: 'no-repeat',
                                }}
                              />
                              {/* tint 오버레이 — 블러 영역을 bgColor 톤으로 물들임 */}
                              <div
                                aria-hidden
                                style={{
                                  position: 'absolute',
                                  inset: 0,
                                  background: c.bgColor || '#F2E2CB',
                                  opacity: 0.45,
                                  WebkitMaskImage: `url(${tf.blurMask})`,
                                  maskImage: `url(${tf.blurMask})`,
                                  WebkitMaskSize: '100% 100%',
                                  maskSize: '100% 100%',
                                  WebkitMaskRepeat: 'no-repeat',
                                  maskRepeat: 'no-repeat',
                                }}
                              />
                            </>
                          ) : null}
                        </div>
                      );
                    })()}
                    {/* 3) 그라데이션 오버레이 — 이미지 위에 항상 */}
                    {gradCss && (
                      <div
                        aria-hidden
                        style={{
                          position: 'absolute',
                          inset: 0,
                          background: gradCss,
                          zIndex: 1,
                        }}
                      />
                    )}
                    {/* 로고 */}
                    {c.showLogo && (
                      <img
                        src={c.logoColor === 'white' ? 'https://yogibo.kr/web/img/icon/logo3_off.png' : 'https://yogibo.kr/web/img/icon/logo3_on.png'}
                        alt="Yogibo Logo"
                        crossOrigin="anonymous"
                        style={{
                          position: 'absolute',
                          top: '60px',
                          left: '50%',
                          transform: 'translateX(-50%)',
                          width: '180px',
                          height: 'auto',
                          zIndex: 2,
                        }}
                      />
                    )}
                    {c.texts.map((t) => {
                      const lh = t.style.lineHeight;
                      const resolvedLh =
                        lh === undefined
                          ? `${t.style.fontSize * 1.2}px`
                          : lh < 4
                            ? `${t.style.fontSize * lh}px`
                            : `${lh}px`;
                      const style: React.CSSProperties = {
                        position: 'absolute',
                        left: `${t.position.x}px`,
                        top: `${t.position.y}px`,
                        fontSize: `${t.style.fontSize}px`,
                        color: t.style.color,
                        fontWeight: t.style.fontWeight as any,
                        textAlign: t.style.textAlign,
                        letterSpacing:
                          t.style.letterSpacing !== undefined
                            ? `${t.style.letterSpacing}px`
                            : undefined,
                        lineHeight: resolvedLh,
                        backgroundColor: t.style.backgroundColor || 'transparent',
                        borderRadius: t.style.isPill ? '999px' : (t.style.isBadge && t.style.badgeShape === 'circle' ? '50%' : (t.style.isBadge ? '0' : '4px')),
                        clipPath: t.style.isBadge 
                          ? (t.style.badgeShape === 'hexagon' 
                              ? 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)'
                              : (t.style.badgeShape === 'circle' ? 'circle(50% at 50% 50%)' : 'polygon(50% 0%, 61% 11%, 79% 9%, 83% 26%, 100% 34%, 93% 50%, 100% 66%, 83% 74%, 79% 91%, 61% 89%, 50% 100%, 39% 89%, 21% 91%, 17% 74%, 0% 66%, 7% 50%, 0% 34%, 17% 26%, 21% 9%, 39% 11%)'))
                          : undefined,
                        padding: t.style.isBadge ? '24px' : (t.style.isPill ? '8.5px 34.13px' : '0'),
                        fontFamily: t.style.fontFamily || "'Pretendard Variable', Pretendard, sans-serif",
                        textShadow: t.style.textShadow || undefined,
                        whiteSpace: 'pre-wrap',
                        width:
                          t.style.width === 'auto' || !t.style.width
                            ? 'auto'
                            : `${t.style.width}px`,
                        aspectRatio: t.style.isBadge && t.style.width && t.style.width !== 'auto' ? '1 / 1' : undefined,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 2,
                      };
                      return (
                        <div key={t.id} style={{ ...style, flexDirection: 'column' }}>
                          {t.text ? t.text.split('\n').map((line, i) => (
                            <div key={i} style={{ fontSize: i > 0 && t.style.subFontSize ? `${t.style.subFontSize}px` : 'inherit', width: '100%', textAlign: t.style.textAlign || 'center' }}>
                              {line}
                            </div>
                          )) : "텍스트"}
                        </div>
                      );
                    })}
                    {/* 날짜 바 */}
                    {c.showDateBar && (() => {
                      const dbTop = Math.round(s.height * 0.671);
                      const dbH   = Math.round(s.height * 0.062);
                      const dbFs  = Math.round(s.height * 0.037);
                      return (
                        <div style={{ position: 'absolute', left: 0, right: 0, top: dbTop, height: dbH, background: 'rgba(176,170,224,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
                          <span style={{ fontFamily: "'Pretendard','Apple SD Gothic Neo',sans-serif", fontSize: dbFs, fontWeight: 500, color: '#222222', whiteSpace: 'nowrap' }}>{c.eventDate}</span>
                        </div>
                      );
                    })()}
                    {/* 이벤트 바로가기 버튼 */}
                    {c.showButton && (() => {
                      const bTop  = Math.round(s.height * 0.780);
                      const bW    = Math.round(s.width  * 0.141);
                      const bH    = Math.round(s.height * 0.074);
                      const bFs   = Math.round(s.height * 0.037);
                      return (
                        <div style={{ position: 'absolute', top: bTop, left: '50%', transform: 'translateX(-50%)', width: bW, height: bH, background: '#111111', borderRadius: bH / 2, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
                          <span style={{ fontFamily: "'Pretendard','Apple SD Gothic Neo',sans-serif", fontSize: bFs, fontWeight: 500, color: '#ffffff', whiteSpace: 'nowrap' }}>{c.buttonLabel} →</span>
                        </div>
                      );
                    })()}
                  </div>
                );
              })}
          </div>
        </div>

        {/* Right Panel */}
        <aside
          style={{
            background: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
            padding: '16px',
            height: 'fit-content',
            position: 'sticky',
            top: '120px',
          }}
        >
          {activeText ? (
            /* ---- 텍스트 편집 패널 ---- */
            <>
              <button
                onClick={() => setActiveTextId(null)}
                style={{
                  width: '100%',
                  padding: '8px',
                  background: '#f3f4f6',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  marginBottom: '12px',
                }}
              >
                ← 설정 패널로
              </button>

              <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 700 }}>✏ 텍스트 편집</h3>

              <label style={fieldLabel}>텍스트</label>
              <textarea
                value={activeText.text}
                onChange={(e) => handleTextContentChange(e.target.value)}
                style={{
                  width: '100%',
                  minHeight: '60px',
                  padding: '8px',
                  fontSize: '13px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  resize: 'vertical',
                  marginBottom: '12px',
                  fontFamily: 'inherit',
                }}
              />

              <label style={fieldLabel}>글자 크기 (첫 번째 줄) ({activeText.style.fontSize}px)</label>
              <input
                type="range"
                min={12}
                max={240}
                value={activeText.style.fontSize}
                onChange={(e) => handleTextStyleChange({ fontSize: parseInt(e.target.value) })}
                style={{ width: '100%', marginBottom: '12px' }}
              />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <label style={{ ...fieldLabel, marginBottom: 0 }}>글자 크기 (두 번째 줄) ({activeText.style.subFontSize || activeText.style.fontSize}px)</label>
                <label style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={!activeText.style.subFontSize}
                    onChange={(e) => handleTextStyleChange({ subFontSize: e.target.checked ? undefined : activeText.style.fontSize })}
                  />
                  동일하게
                </label>
              </div>
              <input
                type="range"
                min={12}
                max={240}
                value={activeText.style.subFontSize || activeText.style.fontSize}
                disabled={!activeText.style.subFontSize}
                onChange={(e) => handleTextStyleChange({ subFontSize: parseInt(e.target.value) })}
                style={{ width: '100%', marginBottom: '12px', opacity: activeText.style.subFontSize ? 1 : 0.5 }}
              />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <label style={{ ...fieldLabel, marginBottom: 0 }}>너비 (Width)</label>
                <label style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={!activeText.style.width || activeText.style.width === 'auto'}
                    onChange={(e) => handleTextStyleChange({ width: e.target.checked ? 'auto' : 200 })}
                  />
                  자동 크기
                </label>
              </div>
              <input
                type="range"
                min={50}
                max={600}
                value={activeText.style.width === 'auto' || !activeText.style.width ? 200 : activeText.style.width}
                disabled={!activeText.style.width || activeText.style.width === 'auto'}
                onChange={(e) => handleTextStyleChange({ width: parseInt(e.target.value) })}
                style={{ width: '100%', marginBottom: '12px', opacity: (!activeText.style.width || activeText.style.width === 'auto') ? 0.5 : 1 }}
              />

              <label style={fieldLabel}>굵기</label>
              <select
                value={String(activeText.style.fontWeight)}
                onChange={(e) => handleTextStyleChange({ fontWeight: parseInt(e.target.value) })}
                style={{ ...numberInput, marginBottom: '12px' }}
              >
                {[300, 400, 500, 600, 700, 800, 900].map((w) => (
                  <option key={w} value={w}>{w}</option>
                ))}
              </select>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
                <div>
                  <label style={fieldLabel}>글자색</label>
                  <input
                    type="color"
                    value={activeText.style.color}
                    onChange={(e) => handleTextStyleChange({ color: e.target.value })}
                    style={{ width: '100%', height: '32px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                  />
                </div>
                <div>
                  <label style={fieldLabel}>배경색</label>
                  <input
                    type="color"
                    value={activeText.style.backgroundColor || '#ffffff'}
                    onChange={(e) => handleTextStyleChange({ backgroundColor: e.target.value })}
                    style={{ width: '100%', height: '32px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                  />
                  <button
                    onClick={() => handleTextStyleChange({ backgroundColor: 'transparent' })}
                    style={{
                      width: '100%',
                      padding: '4px',
                      fontSize: '11px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      background: '#fff',
                      cursor: 'pointer',
                      marginTop: '4px',
                    }}
                  >
                    🚫 배경 투명
                  </button>
                </div>
                <div style={{ gridColumn: '1 / -1', marginTop: '4px' }}>
                  <label style={fieldLabel}>그림자색 (Shadow)</label>
                  <div style={{ display: 'flex' }}>
                    <input
                      type="color"
                      value={activeText.style.textShadow?.match(/#[0-9a-fA-F]+/i)?.[0] || '#000000'}
                      onChange={(e) => handleTextStyleChange({ textShadow: `0 2px 10px ${e.target.value}` })}
                      style={{ width: '100%', height: '32px', border: '1px solid #d1d5db', borderRight: 'none', borderRadius: '6px 0 0 6px', padding: 0 }}
                    />
                    <button
                      onClick={() => handleTextStyleChange({ textShadow: undefined })}
                      style={{
                        padding: '0 12px',
                        fontSize: '12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '0 6px 6px 0',
                        background: '#fff',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap'
                      }}
                      title="그림자 제거"
                    >
                      🚫 제거
                    </button>
                  </div>
                </div>
              </div>

              <label style={fieldLabel}>텍스트 배경 모양</label>
              <div style={{ display: 'flex', gap: '6px', marginBottom: '6px', flexWrap: 'wrap' }}>
                <button
                  onClick={() => handleTextStyleChange({ isPill: false, isBadge: false })}
                  style={{
                    flex: '1 1 45%', padding: '6px', fontSize: '12px', borderRadius: '6px',
                    border: (!activeText.style.isPill && !activeText.style.isBadge) ? '1px solid #2563eb' : '1px solid #d1d5db',
                    background: (!activeText.style.isPill && !activeText.style.isBadge) ? '#eff6ff' : '#fff',
                    cursor: 'pointer',
                  }}
                >
                  기본 (사각)
                </button>
                <button
                  onClick={() => handleTextStyleChange({ isPill: true, isBadge: false })}
                  style={{
                    flex: '1 1 45%', padding: '6px', fontSize: '12px', borderRadius: '6px',
                    border: activeText.style.isPill ? '1px solid #2563eb' : '1px solid #d1d5db',
                    background: activeText.style.isPill ? '#eff6ff' : '#fff',
                    cursor: 'pointer',
                  }}
                >
                  둥글게 (Pill)
                </button>
                <button
                  onClick={() => handleTextStyleChange({ isPill: false, isBadge: true, badgeShape: 'starburst' })}
                  style={{
                    flex: '1 1 30%', padding: '6px', fontSize: '12px', borderRadius: '6px',
                    border: activeText.style.isBadge && (!activeText.style.badgeShape || activeText.style.badgeShape === 'starburst') ? '1px solid #2563eb' : '1px solid #d1d5db',
                    background: activeText.style.isBadge && (!activeText.style.badgeShape || activeText.style.badgeShape === 'starburst') ? '#eff6ff' : '#fff',
                    cursor: 'pointer',
                  }}
                >
                  톱니 뱃지
                </button>
                <button
                  onClick={() => handleTextStyleChange({ isPill: false, isBadge: true, badgeShape: 'circle' })}
                  style={{
                    flex: '1 1 30%', padding: '6px', fontSize: '12px', borderRadius: '6px',
                    border: activeText.style.isBadge && activeText.style.badgeShape === 'circle' ? '1px solid #2563eb' : '1px solid #d1d5db',
                    background: activeText.style.isBadge && activeText.style.badgeShape === 'circle' ? '#eff6ff' : '#fff',
                    cursor: 'pointer',
                  }}
                >
                  원형 뱃지
                </button>
                <button
                  onClick={() => handleTextStyleChange({ isPill: false, isBadge: true, badgeShape: 'hexagon' })}
                  style={{
                    flex: '1 1 30%', padding: '6px', fontSize: '12px', borderRadius: '6px',
                    border: activeText.style.isBadge && activeText.style.badgeShape === 'hexagon' ? '1px solid #2563eb' : '1px solid #d1d5db',
                    background: activeText.style.isBadge && activeText.style.badgeShape === 'hexagon' ? '#eff6ff' : '#fff',
                    cursor: 'pointer',
                  }}
                >
                  육각 뱃지
                </button>
              </div>

              <label style={fieldLabel}>정렬</label>
              <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
                {(['left', 'center', 'right'] as const).map((a) => (
                  <button
                    key={a}
                    onClick={() => handleTextStyleChange({ textAlign: a })}
                    style={{
                      flex: 1,
                      padding: '6px',
                      fontSize: '12px',
                      borderRadius: '6px',
                      border: activeText.style.textAlign === a ? '1px solid #2563eb' : '1px solid #d1d5db',
                      background: activeText.style.textAlign === a ? '#eff6ff' : '#fff',
                      cursor: 'pointer',
                    }}
                  >
                    {a === 'left' ? '좌' : a === 'center' ? '중앙' : '우'}
                  </button>
                ))}
              </div>

              <button
                onClick={() => handleDeleteText(activeText.id)}
                style={{
                  width: '100%',
                  padding: '8px',
                  background: '#fff',
                  color: '#ef4444',
                  border: '1px solid #fecaca',
                  borderRadius: '6px',
                  fontSize: '12px',
                  cursor: 'pointer',
                }}
              >
                이 텍스트 삭제
              </button>
            </>
          ) : (
            /* ---- 기본 설정 패널 ---- */
            <>
              <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 700 }}>
                {device === 'web' ? '🖥 웹' : '📱 모바일'} 캔버스 설정
              </h3>



              {/* ───── ✨ AI 자동 처리 ───── */}
              <div
                style={{
                  marginBottom: 14,
                  padding: 12,
                  background: 'linear-gradient(135deg, #eef2ff 0%, #faf5ff 100%)',
                  border: '1px solid #c7d2fe',
                  borderRadius: 8,
                }}
              >
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    marginBottom: 10,
                    color: '#4338ca',
                  }}
                >
                  ✨ AI 자동 처리
                </div>

                <label
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 8,
                    marginBottom: 8,
                    cursor: 'pointer',
                    fontSize: 12,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={aiSettings.removeBackground}
                    onChange={(e) =>
                      setAiSettings((s) => ({ ...s, removeBackground: e.target.checked }))
                    }
                    style={{ marginTop: 2, cursor: 'pointer' }}
                  />
                  <span style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, color: '#1f2937' }}>배경 자동 제거</div>
                    <div style={{ fontSize: 10, color: '#6b7280', marginTop: 2 }}>
                      피사체만 남기고 배경을 투명 처리 (~10초, 최초 1회는 모델 다운로드)
                    </div>
                  </span>
                </label>

                <label
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 8,
                    cursor: 'pointer',
                    fontSize: 12,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={aiSettings.matchColor}
                    onChange={(e) =>
                      setAiSettings((s) => ({ ...s, matchColor: e.target.checked }))
                    }
                    style={{ marginTop: 2, cursor: 'pointer' }}
                  />
                  <span style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, color: '#1f2937' }}>색상 자동 매칭</div>
                    <div style={{ fontSize: 10, color: '#6b7280', marginTop: 2 }}>
                      이미지 왼쪽 영역 색을 샘플링해 그라데이션 색상에 자동 반영
                    </div>
                  </span>
                </label>

                {/* 🎨 원터치 배너 변환 — 별도 강조 섹션 */}
                <div
                  style={{
                    marginTop: 12,
                    paddingTop: 12,
                    borderTop: '1px dashed #c7d2fe',
                  }}
                >
                  <button
                    onClick={handleConvertToBannerStyle}
                    disabled={!current.bgImage}
                    style={{
                      width: '100%',
                      padding: '10px 8px',
                      fontSize: 13,
                      fontWeight: 700,
                      borderRadius: 8,
                      border: 'none',
                      background: current.bgImage
                        ? 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)'
                        : '#e5e7eb',
                      color: current.bgImage ? '#fff' : '#9ca3af',
                      cursor: current.bgImage ? 'pointer' : 'not-allowed',
                      boxShadow: current.bgImage ? '0 4px 12px rgba(139, 92, 246, 0.3)' : 'none',
                    }}
                  >
                    🎨 배너 스타일로 변환
                  </button>
                  <p style={{ margin: '6px 0 0', fontSize: 10, color: '#6b7280', lineHeight: 1.5 }}>
                    원본 이미지를 우측에 배치 + 왼쪽은 이미지 가장자리 색의<br />
                    그라데이션으로 자연스럽게 페이드 (즉시 실행, AI 불필요)
                  </p>
                </div>

                {current.bgImageOriginal && (
                  <div
                    style={{
                      display: 'flex',
                      gap: 6,
                      marginTop: 10,
                      paddingTop: 10,
                      borderTop: '1px solid #c7d2fe',
                    }}
                  >
                    <button
                      onClick={handleReApplyAI}
                      style={{
                        flex: 1,
                        padding: '6px',
                        fontSize: 11,
                        fontWeight: 600,
                        borderRadius: 6,
                        border: '1px solid #6366f1',
                        background: '#6366f1',
                        color: '#fff',
                        cursor: 'pointer',
                      }}
                    >
                      ✨ AI 재적용
                    </button>
                    {current.bgImage !== current.bgImageOriginal && (
                      <button
                        onClick={handleRestoreOriginal}
                        style={{
                          flex: 1,
                          padding: '6px',
                          fontSize: 11,
                          fontWeight: 600,
                          borderRadius: 6,
                          border: '1px solid #d1d5db',
                          background: '#fff',
                          color: '#374151',
                          cursor: 'pointer',
                        }}
                      >
                        ↶ 원본으로
                      </button>
                    )}
                  </div>
                )}

                <p style={{ margin: '8px 0 0', fontSize: 10, color: '#9ca3af', lineHeight: 1.4 }}>
                  * 체크박스 옵션은 업로드 시 자동 적용 / &quot;배너 스타일로 변환&quot;은 수동 실행.
                </p>
              </div>

              {/* ───── Web 프리셋 설정 (1920x860) ───── */}
              {((!isSingleMode && device === 'web') || (isSingleMode && MAIN_VISUAL_SIZES.web.width === 1920 && MAIN_VISUAL_SIZES.web.height === 860)) && (
                <div style={{ marginBottom: '16px', padding: '12px', background: '#fafafa', border: '1px solid #eef0f3', borderRadius: '8px' }}>
                  <label style={{ ...fieldLabel, marginBottom: 8 }}>웹 레이아웃 프리셋</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: 12 }}>
                    <button
                      onClick={() => applyWebPreset('Default')}
                      style={{ padding: '8px', fontSize: '12px', fontWeight: 600, borderRadius: '8px', border: current.bgGraphicType === null ? '2px solid #2563eb' : '1px solid #d1d5db', background: '#fff', color: '#374151', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', transition: 'all 0.2s' }}
                      onMouseOver={(e) => e.currentTarget.style.borderColor = '#2563eb'}
                      onMouseOut={(e) => e.currentTarget.style.borderColor = current.bgGraphicType === null ? '#2563eb' : '#d1d5db'}
                    >
                      <img src="/api/proxy-image?url=https%3A%2F%2Fyogibo.openhost.cafe24.com%2Fweb%2Fimg%2Fdesign%2F84e4d6d034ebd8750008d333c92eedcf.jpg" alt="Default Type Preview" style={{ width: '100%', borderRadius: '4px', objectFit: 'cover', aspectRatio: '2.8/1', border: '1px solid #f3f4f6' }} />
                      기본타입
                    </button>
                    <button
                      onClick={() => applyWebPreset('A')}
                      style={{ padding: '8px', fontSize: '12px', fontWeight: 600, borderRadius: '8px', border: current.bgGraphicType === 'A' ? '2px solid #2563eb' : '1px solid #d1d5db', background: '#fff', color: '#374151', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', transition: 'all 0.2s' }}
                      onMouseOver={(e) => e.currentTarget.style.borderColor = '#2563eb'}
                      onMouseOut={(e) => e.currentTarget.style.borderColor = current.bgGraphicType === 'A' ? '#2563eb' : '#d1d5db'}
                    >
                      <img src="/api/proxy-image?url=https%3A%2F%2Fyogibo.openhost.cafe24.com%2Fweb%2Fimg%2Fdesign%2Fref_1778046011578_250113_%EB%A1%A4%EB%A7%81%EB%B0%B0%EB%84%88_%EC%84%A4%ED%8A%B9%EA%B0%80_pc.png" alt="A Type Preview" style={{ width: '100%', borderRadius: '4px', objectFit: 'cover', aspectRatio: '2.8/1', border: '1px solid #f3f4f6' }} />
                      타입 A
                    </button>
                    <button
                      onClick={() => applyWebPreset('B')}
                      style={{ padding: '8px', fontSize: '12px', fontWeight: 600, borderRadius: '8px', border: current.bgGraphicType === 'B' ? '2px solid #2563eb' : '1px solid #d1d5db', background: '#fff', color: '#374151', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', transition: 'all 0.2s' }}
                      onMouseOver={(e) => e.currentTarget.style.borderColor = '#2563eb'}
                      onMouseOut={(e) => e.currentTarget.style.borderColor = current.bgGraphicType === 'B' ? '#2563eb' : '#d1d5db'}
                    >
                      <img src="/api/proxy-image?url=https%3A%2F%2Fyogibo.openhost.cafe24.com%2Fweb%2Fimg%2Fdesign%2Fref_1778046276217_250331_%EC%9E%90%EC%82%AC%EB%AA%B0_%ED%94%84%EB%A1%9C%EB%AA%A8%EC%85%98_4%EC%9B%94_%EC%8A%A4%ED%94%84%EB%A7%81_%ED%8C%8C%EC%8A%A4%ED%85%94_%EB%A9%94%EC%9D%B8_.png" alt="B Type Preview" style={{ width: '100%', borderRadius: '4px', objectFit: 'cover', aspectRatio: '2.8/1', border: '1px solid #f3f4f6' }} />
                      타입 B
                    </button>
                    <button
                      onClick={() => applyWebPreset('D')}
                      style={{ padding: '8px', fontSize: '12px', fontWeight: 600, borderRadius: '8px', border: current.bgGraphicType === 'D' ? '2px solid #2563eb' : '1px solid #d1d5db', background: '#fff', color: '#374151', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', transition: 'all 0.2s' }}
                      onMouseOver={(e) => e.currentTarget.style.borderColor = '#2563eb'}
                      onMouseOut={(e) => e.currentTarget.style.borderColor = current.bgGraphicType === 'D' ? '#2563eb' : '#d1d5db'}
                    >
                      <img src="/api/proxy-image?url=https%3A%2F%2Fyogibo.openhost.cafe24.com%2Fweb%2Fimg%2Fdesign%2Fref_1778045914491_2602_Max__PC.webp" alt="D Type Preview" style={{ width: '100%', borderRadius: '4px', objectFit: 'cover', aspectRatio: '2.8/1', border: '1px solid #f3f4f6' }} />
                      타입 D
                    </button>
                    <button
                      onClick={() => applyWebPreset('E')}
                      style={{ padding: '8px', fontSize: '12px', fontWeight: 600, borderRadius: '8px', border: current.bgGraphicType === 'E' ? '2px solid #2563eb' : '1px solid #d1d5db', background: '#fff', color: '#374151', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', transition: 'all 0.2s' }}
                      onMouseOver={(e) => e.currentTarget.style.borderColor = '#2563eb'}
                      onMouseOut={(e) => e.currentTarget.style.borderColor = current.bgGraphicType === 'E' ? '#2563eb' : '#d1d5db'}
                    >
                      <img src="/api/proxy-image?url=https%3A%2F%2Fyogibo.openhost.cafe24.com%2Fweb%2Fimg%2Fdesign%2Fref_1778045924564_PC_3323c7ed-cd6e-4c29-9384-5cd.webp" alt="E Type Preview" style={{ width: '100%', borderRadius: '4px', objectFit: 'cover', aspectRatio: '2.8/1', border: '1px solid #f3f4f6' }} />
                      타입 E
                    </button>
                  </div>
                </div>
              )}

              {/* ───── Mobile 프리셋 설정 (750×1350) ───── */}
              {!isSingleMode && device === 'mobile' && (
                <div style={{ marginBottom: '16px', padding: '12px', background: '#fafafa', border: '1px solid #eef0f3', borderRadius: '8px' }}>
                  <label style={{ ...fieldLabel, marginBottom: 8 }}>모바일 레이아웃 프리셋</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: 12 }}>
                    <button
                      onClick={() => applyMobilePreset('Default')}
                      style={{ padding: '8px', fontSize: '12px', fontWeight: 600, borderRadius: '8px', border: current.bgGraphicType === null ? '2px solid #2563eb' : '1px solid #d1d5db', background: '#fff', color: '#374151', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', transition: 'all 0.2s' }}
                      onMouseOver={(e) => e.currentTarget.style.borderColor = '#2563eb'}
                      onMouseOut={(e) => e.currentTarget.style.borderColor = current.bgGraphicType === null ? '#2563eb' : '#d1d5db'}
                    >
                      <img src="/api/proxy-image?url=https%3A%2F%2Fyogibo.openhost.cafe24.com%2Fweb%2Fimg%2Fdesign%2F84e4d6d034ebd8750008d333c92eedcf.jpg" alt="Default Mobile Preview" style={{ width: '100%', borderRadius: '4px', objectFit: 'cover', aspectRatio: '0.55/1', border: '1px solid #f3f4f6' }} />
                      기본타입
                    </button>
                    <button
                      onClick={() => applyMobilePreset('A')}
                      style={{ padding: '8px', fontSize: '12px', fontWeight: 600, borderRadius: '8px', border: current.bgGraphicType === 'A' ? '2px solid #2563eb' : '1px solid #d1d5db', background: '#fff', color: '#374151', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', transition: 'all 0.2s' }}
                      onMouseOver={(e) => e.currentTarget.style.borderColor = '#2563eb'}
                      onMouseOut={(e) => e.currentTarget.style.borderColor = current.bgGraphicType === 'A' ? '#2563eb' : '#d1d5db'}
                    >
                      <img src="/api/proxy-image?url=https%3A%2F%2Fyogibo.openhost.cafe24.com%2Fweb%2Fimg%2Fdesign%2Fref_1778046070619_250113_%EB%A1%A4%EB%A7%81%EB%B0%B0%EB%84%88_%EC%84%A4%ED%8A%B9%EA%B0%80_mo.png" alt="A Mobile Preview" style={{ width: '100%', borderRadius: '4px', objectFit: 'cover', aspectRatio: '0.55/1', border: '1px solid #f3f4f6' }} />
                      타입 A
                    </button>
                    <button
                      onClick={() => applyMobilePreset('B')}
                      style={{ padding: '8px', fontSize: '12px', fontWeight: 600, borderRadius: '8px', border: current.bgGraphicType === 'B' ? '2px solid #2563eb' : '1px solid #d1d5db', background: '#fff', color: '#374151', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', transition: 'all 0.2s' }}
                      onMouseOver={(e) => e.currentTarget.style.borderColor = '#2563eb'}
                      onMouseOut={(e) => e.currentTarget.style.borderColor = current.bgGraphicType === 'B' ? '#2563eb' : '#d1d5db'}
                    >
                      <img src="/api/proxy-image?url=https%3A%2F%2Fyogibo.openhost.cafe24.com%2Fweb%2Fimg%2Fdesign%2Fref_1778046285056_250331_%EC%9E%90%EC%82%AC%EB%AA%B0_%ED%94%84%EB%A1%9C%EB%AA%A8%EC%85%98_4%EC%9B%94_%EC%8A%A4%ED%94%84%EB%A7%81_%ED%8C%8C%EC%8A%A4%ED%85%94_%EB%A9%94%EC%9D%B8_.png" alt="B Mobile Preview" style={{ width: '100%', borderRadius: '4px', objectFit: 'cover', aspectRatio: '0.55/1', border: '1px solid #f3f4f6' }} />
                      타입 B
                    </button>
                    <button
                      onClick={() => applyMobilePreset('D')}
                      style={{ padding: '8px', fontSize: '12px', fontWeight: 600, borderRadius: '8px', border: current.bgGraphicType === 'D' ? '2px solid #2563eb' : '1px solid #d1d5db', background: '#fff', color: '#374151', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', transition: 'all 0.2s' }}
                      onMouseOver={(e) => e.currentTarget.style.borderColor = '#2563eb'}
                      onMouseOut={(e) => e.currentTarget.style.borderColor = current.bgGraphicType === 'D' ? '#2563eb' : '#d1d5db'}
                    >
                      <img src="/api/proxy-image?url=https%3A%2F%2Fyogibo.openhost.cafe24.com%2Fweb%2Fimg%2Fdesign%2FD%ED%83%80%EC%9E%85%20(2).jpg" alt="D Mobile Preview" style={{ width: '100%', borderRadius: '4px', objectFit: 'cover', aspectRatio: '0.55/1', border: '1px solid #f3f4f6' }} />
                      타입 D
                    </button>
                    <button
                      onClick={() => applyMobilePreset('E')}
                      style={{ padding: '8px', fontSize: '12px', fontWeight: 600, borderRadius: '8px', border: current.bgGraphicType === 'E' ? '2px solid #2563eb' : '1px solid #d1d5db', background: '#fff', color: '#374151', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', transition: 'all 0.2s' }}
                      onMouseOver={(e) => e.currentTarget.style.borderColor = '#2563eb'}
                      onMouseOut={(e) => e.currentTarget.style.borderColor = current.bgGraphicType === 'E' ? '#2563eb' : '#d1d5db'}
                    >
                      <img src="/api/proxy-image?url=https%3A%2F%2Fyogibo.openhost.cafe24.com%2Fweb%2Fimg%2Fdesign%2Fref_1778045924564_PC_3323c7ed-cd6e-4c29-9384-5cd.webp" alt="E Mobile Preview" style={{ width: '100%', borderRadius: '4px', objectFit: 'cover', aspectRatio: '0.55/1', border: '1px solid #f3f4f6' }} />
                      타입 E
                    </button>
                  </div>
                </div>
              )}

              {/* ───── SNS 프리셋 설정 ───── */}
              {isSingleMode && MAIN_VISUAL_SIZES.web.width === 1080 && (
                <div style={{ marginBottom: '16px', padding: '12px', background: '#fafafa', border: '1px solid #eef0f3', borderRadius: '8px' }}>
                  <label style={{ ...fieldLabel, marginBottom: 8 }}>SNS 레이아웃 프리셋</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: 12 }}>
                    <button
                      onClick={() => applySnsPreset('A')}
                      style={{
                        padding: '8px',
                        fontSize: '12px',
                        fontWeight: 600,
                        borderRadius: '8px',
                        border: '1px solid #d1d5db',
                        background: '#fff',
                        color: '#374151',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '8px',
                        transition: 'all 0.2s',
                      }}
                      onMouseOver={(e) => e.currentTarget.style.borderColor = '#2563eb'}
                      onMouseOut={(e) => e.currentTarget.style.borderColor = '#d1d5db'}
                    >
                      <img 
                        src="/api/proxy-image?url=https%3A%2F%2Fyogibo.openhost.cafe24.com%2Fweb%2Fimg%2Fdesign%2Fref_1778045769217_%EA%B4%91%EA%B3%A0%EC%86%8C%EC%9E%AC_%EA%B0%80%EC%A0%95%EC%9D%98%EB%8B%AC_%ED%8A%B9%EA%B0%80.jpg" 
                        alt="A Type Preview" 
                        style={{ width: '100%', borderRadius: '4px', objectFit: 'cover', aspectRatio: '1/1', border: '1px solid #f3f4f6' }} 
                      />
                      타입 A
                    </button>
                    <button
                      onClick={() => applySnsPreset('B')}
                      style={{
                        padding: '8px',
                        fontSize: '12px',
                        fontWeight: 600,
                        borderRadius: '8px',
                        border: '1px solid #d1d5db',
                        background: '#fff',
                        color: '#374151',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '8px',
                        transition: 'all 0.2s',
                      }}
                      onMouseOver={(e) => e.currentTarget.style.borderColor = '#2563eb'}
                      onMouseOut={(e) => e.currentTarget.style.borderColor = '#d1d5db'}
                    >
                      <img 
                        src="/api/proxy-image?url=https%3A%2F%2Fyogibo.openhost.cafe24.com%2Fweb%2Fimg%2Fdesign%2Fref_1778045723245_%EA%B4%91%EA%B3%A0%EC%86%8C%EC%9E%AC__%EC%97%AD%EB%8C%80%EA%B8%89%ED%95%A0%EC%9D%B8%EC%A4%91.jpg" 
                        alt="B Type Preview" 
                        style={{ width: '100%', borderRadius: '4px', objectFit: 'cover', aspectRatio: '1/1', border: '1px solid #f3f4f6' }} 
                      />
                      타입 B
                    </button>
                    <button
                      onClick={() => applySnsPreset('C')}
                      style={{
                        padding: '8px',
                        fontSize: '12px',
                        fontWeight: 600,
                        borderRadius: '8px',
                        border: '1px solid #d1d5db',
                        background: '#fff',
                        color: '#374151',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '8px',
                        transition: 'all 0.2s',
                      }}
                      onMouseOver={(e) => e.currentTarget.style.borderColor = '#2563eb'}
                      onMouseOut={(e) => e.currentTarget.style.borderColor = '#d1d5db'}
                    >
                      <img 
                        src="/api/proxy-image?url=https%3A%2F%2Fyogibo.openhost.cafe24.com%2Fweb%2Fimg%2Fdesign%2Fsns2.jpg" 
                        alt="C Type Preview" 
                        style={{ width: '100%', borderRadius: '4px', objectFit: 'cover', aspectRatio: '1/1', border: '1px solid #f3f4f6' }} 
                      />
                      타입 C
                    </button>
                    <button
                      onClick={() => applySnsPreset('D')}
                      style={{
                        padding: '8px',
                        fontSize: '12px',
                        fontWeight: 600,
                        borderRadius: '8px',
                        border: '1px solid #d1d5db',
                        background: '#fff',
                        color: '#374151',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '8px',
                        transition: 'all 0.2s',
                      }}
                      onMouseOver={(e) => e.currentTarget.style.borderColor = '#2563eb'}
                      onMouseOut={(e) => e.currentTarget.style.borderColor = '#d1d5db'}
                    >
                      <img 
                        src="/api/proxy-image?url=https%3A%2F%2Fyogibo.openhost.cafe24.com%2Fweb%2Fimg%2Fdesign%2Fsns3.jpg" 
                        alt="D Type Preview" 
                        style={{ width: '100%', borderRadius: '4px', objectFit: 'cover', aspectRatio: '1/1', border: '1px solid #f3f4f6' }} 
                      />
                      타입 D
                    </button>
                    <button
                      onClick={() => applySnsPreset('E')}
                      style={{
                        padding: '8px',
                        fontSize: '12px',
                        fontWeight: 600,
                        borderRadius: '8px',
                        border: '1px solid #d1d5db',
                        background: '#fff',
                        color: '#374151',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '8px',
                        transition: 'all 0.2s',
                      }}
                      onMouseOver={(e) => e.currentTarget.style.borderColor = '#2563eb'}
                      onMouseOut={(e) => e.currentTarget.style.borderColor = '#d1d5db'}
                    >
                      <img 
                        src="/api/proxy-image?url=https%3A%2F%2Fyogibo.openhost.cafe24.com%2Fweb%2Fimg%2Fdesign%2Fsns2.jpg" 
                        alt="E Type Preview" 
                        style={{ width: '100%', borderRadius: '4px', objectFit: 'cover', aspectRatio: '1/1', border: '1px solid #f3f4f6' }} 
                      />
                      타입 E
                    </button>
                  </div>

                  <label style={{ ...fieldLabel, marginBottom: 8, marginTop: 12, borderTop: '1px dashed #d1d5db', paddingTop: 12 }}>로고 설정</label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, marginBottom: 10 }}>
                    <input
                      type="checkbox"
                      checked={current.showLogo || false}
                      onChange={(e) => updateCurrent({ showLogo: e.target.checked })}
                    />
                    로고 표시하기
                  </label>
                  {current.showLogo && (
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        onClick={() => updateCurrent({ logoColor: 'white' })}
                        style={{
                          flex: 1,
                          padding: '6px',
                          fontSize: '12px',
                          fontWeight: 600,
                          borderRadius: '6px',
                          border: current.logoColor === 'white' ? '1px solid #2563eb' : '1px solid #d1d5db',
                          background: current.logoColor === 'white' ? '#eff6ff' : '#fff',
                          color: current.logoColor === 'white' ? '#2563eb' : '#374151',
                          cursor: 'pointer',
                        }}
                      >
                        흰색 로고
                      </button>
                      <button
                        onClick={() => updateCurrent({ logoColor: 'color' })}
                        style={{
                          flex: 1,
                          padding: '6px',
                          fontSize: '12px',
                          fontWeight: 600,
                          borderRadius: '6px',
                          border: current.logoColor === 'color' ? '1px solid #2563eb' : '1px solid #d1d5db',
                          background: current.logoColor === 'color' ? '#eff6ff' : '#fff',
                          color: current.logoColor === 'color' ? '#2563eb' : '#374151',
                          cursor: 'pointer',
                        }}
                      >
                        컬러 로고
                      </button>
                    </div>
                  )}
                </div>
              )}

              <div style={{ marginBottom: '16px' }}>
                <label style={fieldLabel}>배경 이미지</label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    width: '100%',
                    height: '120px',
                    border: '2px dashed #d1d5db',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundImage: current.bgImage ? `url(${current.bgImage})` : 'none',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    cursor: 'pointer',
                    color: '#9ca3af',
                    fontSize: '12px',
                  }}
                >
                  {!current.bgImage && '클릭하여 이미지 업로드'}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handleBgUpload}
                />
                <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      flex: 1,
                      padding: '6px',
                      fontSize: '12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      background: '#fff',
                      cursor: 'pointer',
                    }}
                  >
                    {current.bgImage ? '변경' : '업로드'}
                  </button>
                  {current.bgImage && (
                    <button
                      onClick={handleClearImage}
                      style={{
                        flex: 1,
                        padding: '6px',
                        fontSize: '12px',
                        border: '1px solid #fecaca',
                        color: '#ef4444',
                        borderRadius: '6px',
                        background: '#fff',
                        cursor: 'pointer',
                      }}
                    >
                      삭제
                    </button>
                  )}
                </div>
                {current.bgImage && (() => {
                  const mode = current.imageMode || 'free';
                  const tf = current.imageTransform;
                  return (
                    <div
                      style={{
                        marginTop: '10px',
                        padding: '10px',
                        background: '#fafafa',
                        border: '1px solid #eef0f3',
                        borderRadius: '8px',
                      }}
                    >
                      {/* 모드 토글 */}
                      <label
                        style={{
                          display: 'block',
                          fontSize: '11px',
                          fontWeight: 700,
                          color: '#6b7280',
                          marginBottom: '6px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.4px',
                        }}
                      >
                        배치 모드
                      </label>
                      <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
                        {([
                          { v: 'free', label: '자유 배치', desc: '원본 + 드래그/리사이즈' },
                          { v: 'cover', label: '꽉 채우기', desc: '캔버스에 자동 크롭' },
                        ] as const).map((m) => (
                          <button
                            key={m.v}
                            onClick={() => handleToggleImageMode(m.v)}
                            title={m.desc}
                            style={{
                              flex: 1,
                              padding: '8px 6px',
                              fontSize: '12px',
                              fontWeight: 600,
                              borderRadius: '6px',
                              border:
                                mode === m.v ? '1px solid #2563eb' : '1px solid #d1d5db',
                              background: mode === m.v ? '#eff6ff' : '#fff',
                              color: mode === m.v ? '#2563eb' : '#374151',
                              cursor: 'pointer',
                            }}
                          >
                            {m.label}
                          </button>
                        ))}
                      </div>

                      {mode === 'free' && tf && (
                        <>
                          {/* 위치 */}
                          <label style={{ ...fieldLabel, marginTop: 4 }}>
                            위치 X / Y
                          </label>
                          <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
                            <input
                              type="number"
                              value={Math.round(tf.x)}
                              onChange={(e) =>
                                handleImageTransformChange({
                                  ...tf,
                                  x: parseInt(e.target.value) || 0,
                                })
                              }
                              style={smallInput}
                            />
                            <input
                              type="number"
                              value={Math.round(tf.y)}
                              onChange={(e) =>
                                handleImageTransformChange({
                                  ...tf,
                                  y: parseInt(e.target.value) || 0,
                                })
                              }
                              style={smallInput}
                            />
                          </div>

                          {/* 폭 슬라이더 */}
                          <label style={fieldLabel}>
                            폭 ({Math.round(tf.width)}px, 높이 {Math.round(tf.width / Math.max(tf.aspect, 0.01))}px)
                          </label>
                          <input
                            type="range"
                            min={40}
                            max={Math.max(size.width * 2, Math.round(tf.width * 2))}
                            value={Math.round(tf.width)}
                            onChange={(e) =>
                              handleImageTransformChange({
                                ...tf,
                                width: parseInt(e.target.value),
                              })
                            }
                            style={{ width: '100%', marginBottom: '10px' }}
                          />

                          {/* 블러 슬라이더 — 배경과 자연스럽게 섞기 */}
                          <label style={fieldLabel}>
                            흐림 강도 {tf.blur ?? 0}px
                          </label>
                          <input
                            type="range"
                            min={0}
                            max={20}
                            step={1}
                            value={tf.blur ?? 0}
                            onChange={(e) =>
                              handleImageTransformChange({
                                ...tf,
                                blur: parseInt(e.target.value),
                              })
                            }
                            style={{ width: '100%', marginBottom: '10px' }}
                          />

                          {/* ───── 블러 브러시 ───── */}
                          <div
                            style={{
                              marginTop: 10,
                              marginBottom: 10,
                              padding: 10,
                              border: brushMode ? '1px solid #ec4899' : '1px solid #eef0f3',
                              borderRadius: 6,
                              background: brushMode ? '#fdf2f8' : '#fff',
                            }}
                          >
                            <div
                              style={{
                                display: 'flex',
                                gap: 6,
                                alignItems: 'center',
                                marginBottom: brushMode ? 10 : 0,
                              }}
                            >
                              <button
                                onClick={() =>
                                  brushMode ? setBrushMode(false) : enableBrushMode()
                                }
                                style={{
                                  flex: 1,
                                  padding: '8px 6px',
                                  fontSize: 12,
                                  fontWeight: 600,
                                  borderRadius: 6,
                                  border: brushMode
                                    ? '1px solid #ec4899'
                                    : '1px solid #d1d5db',
                                  background: brushMode ? '#ec4899' : '#fff',
                                  color: brushMode ? '#fff' : '#374151',
                                  cursor: 'pointer',
                                }}
                              >
                                🖌️ {brushMode ? '브러시 사용 중 — 끄기' : '블러 브러시'}
                              </button>
                            </div>

                            {brushMode && (
                              <>
                                {/* 브러시 크기 */}
                                <label style={fieldLabel}>
                                  브러시 크기 {brushSize}px
                                </label>
                                <input
                                  type="range"
                                  min={10}
                                  max={200}
                                  step={2}
                                  value={brushSize}
                                  onChange={(e) => setBrushSize(parseInt(e.target.value))}
                                  style={{ width: '100%', marginBottom: 10 }}
                                />

                                {/* 지우개 / 지우기 */}
                                <div style={{ display: 'flex', gap: 6 }}>
                                  <button
                                    onClick={() => setBrushErase((v) => !v)}
                                    style={{
                                      flex: 1,
                                      padding: '6px',
                                      fontSize: 12,
                                      fontWeight: 600,
                                      borderRadius: 6,
                                      border: brushErase
                                        ? '1px solid #ec4899'
                                        : '1px solid #d1d5db',
                                      background: brushErase ? '#fce7f3' : '#fff',
                                      color: brushErase ? '#be185d' : '#374151',
                                      cursor: 'pointer',
                                    }}
                                  >
                                    {brushErase ? '✓ 지우개' : '지우개'}
                                  </button>
                                  <button
                                    onClick={clearBlurMask}
                                    style={{
                                      flex: 1,
                                      padding: '6px',
                                      fontSize: 12,
                                      fontWeight: 600,
                                      borderRadius: 6,
                                      border: '1px solid #fecaca',
                                      background: '#fff',
                                      color: '#ef4444',
                                      cursor: 'pointer',
                                    }}
                                  >
                                    🗑 전체 지우기
                                  </button>
                                </div>
                                <p
                                  style={{
                                    margin: '8px 0 0',
                                    fontSize: 11,
                                    color: '#9ca3af',
                                    lineHeight: 1.4,
                                  }}
                                >
                                  * 이미지 위에서 마우스를 드래그해 블러를 칠하세요.<br />
                                  * 칠한 영역만 흐림 강도가 적용돼요.
                                </p>
                              </>
                            )}
                          </div>

                          {/* 빠른 정렬 */}
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              onClick={handleCenterImage}
                              style={secondaryBtn}
                              disabled={brushMode}
                            >
                              ⇋ 중앙 정렬
                            </button>
                            <button
                              onClick={handleFitImage}
                              style={secondaryBtn}
                              disabled={brushMode}
                            >
                              ⤢ 꽉 채우기
                            </button>
                          </div>
                          <p
                            style={{
                              margin: '10px 0 0',
                              fontSize: '11px',
                              color: '#9ca3af',
                              lineHeight: 1.4,
                            }}
                          >
                            * 드래그로 이동 · 좌상단/우하단 핸들로 크기 조정.<br />
                            * 브러시를 켜면 이동·리사이즈 대신 페인팅으로 동작.
                          </p>
                        </>
                      )}

                      {mode === 'cover' && (
                        <p
                          style={{
                            margin: '4px 0 0',
                            fontSize: '11px',
                            color: '#9ca3af',
                            lineHeight: 1.4,
                          }}
                        >
                          * 캔버스({size.width}×{size.height})를 꽉 채우도록 비율 맞춰 크롭됩니다.
                        </p>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* ───── 기본 배경 색상 ───── */}
              <div
                style={{
                  marginBottom: '16px',
                  padding: '12px',
                  background: '#fafafa',
                  border: '1px solid #eef0f3',
                  borderRadius: '8px',
                }}
              >
                <label style={fieldLabel}>기본 배경 색상</label>
                <input
                  type="color"
                  value={current.bgColor || '#ffffff'}
                  onChange={(e) => updateCurrent({ bgColor: e.target.value })}
                  style={{ width: '100%', height: '40px', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer' }}
                />
              </div>

              {/* ───── 그라데이션 ───── */}
              <div
                style={{
                  marginBottom: '16px',
                  padding: '12px',
                  background: '#fafafa',
                  border: '1px solid #eef0f3',
                  borderRadius: '8px',
                }}
              >
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, marginBottom: 12, fontWeight: 700, color: '#374151' }}>
                  <input
                    type="checkbox"
                    checked={current.useGradient !== false}
                    onChange={(e) => updateCurrent({ useGradient: e.target.checked })}
                  />
                  그라데이션 적용
                </label>
                
                {current.useGradient !== false && (
                  <>
                    {/* 색상 */}
                    <label style={fieldLabel}>그라데이션 색상</label>
                    <input
                  type="color"
                  value={
                    (current.gradient?.stops?.[0]?.color) ||
                    current.bgColor ||
                    '#F2E2CB'
                  }
                  onChange={(e) => {
                    const c = e.target.value;
                    const g = current.gradient;
                    updateCurrent({
                      useGradient: true,
                      gradient: g
                        ? { ...g, stops: g.stops.map((s) => ({ ...s, color: c })) }
                        : undefined,
                    });
                  }}
                  style={{ width: '100%', height: '40px', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer', marginBottom: 10 }}
                />

                {/* 방향 프리셋 */}
                <label style={fieldLabel}>
                  방향 — 색이 진하게 깔릴 위치
                </label>
                <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
                  {([
                    { label: '왼쪽',   angle: 90  },
                    { label: '오른쪽', angle: 270 },
                    { label: '위',     angle: 180 },
                    { label: '아래',   angle: 0   },
                  ] as const).map((p) => {
                    const current_angle = current.gradient?.angle ?? 90;
                    const active = current_angle === p.angle;
                    return (
                      <button
                        key={p.angle}
                        onClick={() => {
                          const g = current.gradient;
                          if (!g) return;
                          updateCurrent({ useGradient: true, gradient: { ...g, angle: p.angle } });
                        }}
                        style={{
                          flex: 1,
                          padding: '6px 2px',
                          fontSize: 11,
                          fontWeight: 600,
                          borderRadius: 6,
                          border: active ? '1px solid #2563eb' : '1px solid #d1d5db',
                          background: active ? '#eff6ff' : '#fff',
                          color: active ? '#2563eb' : '#374151',
                          cursor: 'pointer',
                        }}
                      >
                        {p.label}
                      </button>
                    );
                  })}
                </div>

                {/* 각도 슬라이더 (세밀 조정) */}
                <label style={fieldLabel}>
                  각도 {current.gradient?.angle ?? 90}°
                </label>
                <input
                  type="range"
                  min={0}
                  max={359}
                  step={1}
                  value={current.gradient?.angle ?? 90}
                  onChange={(e) => {
                    const g = current.gradient;
                    if (!g) return;
                    updateCurrent({
                      useGradient: true,
                      gradient: { ...g, angle: parseInt(e.target.value) },
                    });
                  }}
                  style={{ width: '100%', marginBottom: 10 }}
                />

                {/* 페이드 범위 — 두 번째 스톱의 offset (색이 투명해지는 지점) */}
                <label style={fieldLabel}>
                  페이드 범위 {Math.round(current.gradient?.stops?.[1]?.offset ?? 50)}%
                </label>
                <input
                  type="range"
                  min={10}
                  max={100}
                  step={1}
                  value={Math.round(current.gradient?.stops?.[1]?.offset ?? 50)}
                  onChange={(e) => {
                    const g = current.gradient;
                    if (!g) return;
                    const newOffset = parseInt(e.target.value);
                    const stops = g.stops.map((s, i) =>
                      i === g.stops.length - 1 ? { ...s, offset: newOffset } : s,
                    );
                    updateCurrent({ useGradient: true, gradient: { ...g, stops } });
                  }}
                  style={{ width: '100%', marginBottom: 0 }}
                />

                <p
                  style={{
                    margin: '10px 0 0',
                    fontSize: '11px',
                    color: '#9ca3af',
                    lineHeight: 1.4,
                  }}
                >
                  * 한쪽은 선택한 색이 진하게, 반대쪽은 투명하게 페이드됩니다.<br />
                  * 페이드 범위를 줄이면 색이 빨리 사라져서 이미지가 더 많이 보여요.<br />
                  * "그라데이션 적용" 체크를 해제하면 이미지만 깔끔하게 보입니다.
                </p>
                  </>
                )}
              </div>


              <hr style={{ border: 'none', borderTop: '1px solid #e5e7eb', margin: '12px 0' }} />

              <button
                onClick={handleAddText}
                style={{
                  width: '100%',
                  padding: '10px',
                  background: '#2563eb',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  marginBottom: '12px',
                }}
              >
                + 텍스트 추가
              </button>
              


              <div>
                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '6px' }}>
                  텍스트 목록 ({current.texts.length})
                </div>
                {current.texts.length === 0 ? (
                  <div style={{ fontSize: '12px', color: '#9ca3af', padding: '8px 0' }}>
                    추가된 텍스트가 없습니다.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {current.texts.map((t) => (
                      <div
                        key={t.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '8px',
                          border: '1px solid #e5e7eb',
                          borderRadius: '6px',
                          background: '#fafafa',
                        }}
                      >
                        <span
                          style={{
                            flex: 1,
                            fontSize: '12px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {t.text || '(빈 텍스트)'}
                        </span>
                        <button
                          onClick={() => setActiveTextId(t.id)}
                          style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '13px' }}
                        >
                          ✎
                        </button>
                        <button
                          onClick={() => handleDeleteText(t.id)}
                          style={{ border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer', fontSize: '13px' }}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </aside>
      </div>

      {/* 미리보기 모달 */}
      <PreviewModal
        isOpen={isPreviewing}
        imageDataUrl={displayedPreviewUrl}
        title={
          title +
          (isSingleMode ? '' : ' · ' + (previewDisplayDevice === 'web' ? MAIN_VISUAL_SIZES.web.label : MAIN_VISUAL_SIZES.mobile.label))
        }
        onClose={() => {
          if (!isSaving) setIsPreviewing(false);
        }}
        onConfirm={handleConfirmSaveAll}
        confirmLabel={isSingleMode ? "저장하기" : "웹+모바일 둘 다 저장"}
        isProcessing={isSaving}
      />

      {isPreviewing && !isSingleMode && (
        <div
          style={{
            position: 'fixed',
            bottom: '100px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#111827',
            color: '#fff',
            padding: '6px',
            borderRadius: '999px',
            zIndex: 1100,
            display: 'flex',
            gap: '4px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
          }}
        >
          {(['web', 'mobile'] as MainVisualDevice[]).map((d) => (
            <button
              key={d}
              onClick={() => setPreviewDisplayDevice(d)}
              style={{
                padding: '6px 14px',
                fontSize: '12px',
                fontWeight: 600,
                borderRadius: '999px',
                border: 'none',
                background: previewDisplayDevice === d ? '#2563eb' : 'transparent',
                color: '#fff',
                cursor: 'pointer',
              }}
            >
              {d === 'web' ? '🖥 웹' : '📱 모바일'}
            </button>
          ))}
        </div>
      )}
    </div>
    </AppShell>
  );
}

// ============================================================================
// 공통 인라인 스타일
// ============================================================================
const fieldLabel: React.CSSProperties = {
  display: 'block',
  fontSize: '12px',
  color: '#6b7280',
  marginBottom: '4px',
};

const numberInput: React.CSSProperties = {
  width: '100%',
  padding: '6px 8px',
  border: '1px solid #d1d5db',
  borderRadius: '6px',
  marginBottom: '8px',
  fontSize: '13px',
  fontFamily: 'inherit',
};

const smallInput: React.CSSProperties = {
  flex: 1,
  width: '100%',
  padding: '6px 8px',
  border: '1px solid #d1d5db',
  borderRadius: '6px',
  fontSize: '12px',
  fontFamily: 'inherit',
  background: '#fff',
};

const secondaryBtn: React.CSSProperties = {
  flex: 1,
  padding: '7px 8px',
  fontSize: '12px',
  fontWeight: 600,
  border: '1px solid #d1d5db',
  borderRadius: '6px',
  background: '#fff',
  color: '#374151',
  cursor: 'pointer',
};

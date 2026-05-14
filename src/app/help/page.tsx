'use client';
/**
 * /help — 사용 설명서
 *
 * 4개 탭:
 *   1. GPT 프롬프트 사용방법
 *   2. 페이지 개발 안에서 페이지 이용방법
 *   3. 배너별 생성 관리방법
 *   4. 이벤트 페이지 제작 방법
 *
 * URL 해시(#prompt, #page-builder, #banner, #event)로 직접 진입 가능.
 * Sidebar 의 children 이 해시 링크로 연결.
 */
import { CSSProperties, useEffect, useState } from 'react';
import Link from 'next/link';
import AppShell from '@/components/AppShell';

type TabId = 'updates' | 'prompt' | 'page-builder' | 'banner' | 'event';

const TABS: { id: TabId; label: string; emoji: string; subtitle: string }[] = [
  { id: 'updates',      label: '최근 업데이트',           emoji: '🆕', subtitle: '2026-05-14 변경사항 한눈에 보기' },
  { id: 'prompt',       label: 'GPT 프롬프트 사용방법',   emoji: '✨', subtitle: 'ChatGPT 4o 에 그대로 붙여넣을 한글 프롬프트 만들기' },
  { id: 'page-builder', label: '페이지 개발 이용방법',     emoji: '📐', subtitle: '게시판 → 빌더에서 섹션 조립 → 저장' },
  { id: 'banner',       label: '배너 생성 관리방법',       emoji: '🖼️', subtitle: '자사몰 / 스마트스토어 / SNS 배너 만들기' },
  { id: 'event',        label: '이벤트 페이지 제작 방법', emoji: '🎉', subtitle: '이벤트 페이지 만들고 저장/불러오기' },
];

export default function HelpPage() {
  const [tab, setTab] = useState<TabId>('updates');

  // URL 해시로 초기 탭 결정 + hashchange 동기화. 해시 없으면 '최근 업데이트' 가 기본.
  useEffect(() => {
    const sync = () => {
      const h = window.location.hash.slice(1) as TabId;
      if (TABS.some((t) => t.id === h)) setTab(h);
      else setTab('updates');
    };
    sync();
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, []);

  const selectTab = (id: TabId) => {
    setTab(id);
    if (typeof window !== 'undefined') {
      history.replaceState(null, '', `#${id}`);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <AppShell>
      <div style={S.page}>
        <header style={S.hd}>
          <h1 style={S.h1}>📖 사용 설명서</h1>
          <p style={S.lead}>
            Yogibo 디자인 빌더의 핵심 기능 4가지를 단계별로 안내합니다.
            아래 탭을 클릭해 원하는 가이드를 확인하세요.
          </p>
        </header>

        <nav style={S.tabs}>
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => selectTab(t.id)}
              style={{
                ...S.tab,
                ...(tab === t.id ? S.tabActive : {}),
              }}
            >
              <span style={S.tabEmoji}>{t.emoji}</span>
              <span style={S.tabLabel}>{t.label}</span>
              <span style={S.tabSub}>{t.subtitle}</span>
            </button>
          ))}
        </nav>

        <main style={S.content}>
          {tab === 'updates'      && <UpdatesSection />}
          {tab === 'prompt'       && <PromptSection />}
          {tab === 'page-builder' && <PageBuilderSection />}
          {tab === 'banner'       && <BannerSection />}
          {tab === 'event'        && <EventSection />}
        </main>
      </div>
    </AppShell>
  );
}

// ════════════════════════════════════════════════════════════════
// 0. 최근 업데이트 (2026-05-14)
// ════════════════════════════════════════════════════════════════
function UpdatesSection() {
  return (
    <article style={S.article}>
      <SectionHead
        emoji="🆕"
        title="2026-05-14 업데이트"
        desc="자사몰/스마트스토어 배너와 이벤트 페이지에 추가된 기능 정리. 라이브 위젯(widget.js) 동작도 함께 개선됐습니다."
      />

      {/* ── 배너 ─────────────────────────────────────────────── */}
      <Step n={1} title="🖼️ 배너 — 웹↔모바일 텍스트 자동 동기화">
        <p>자사몰·스마트스토어 배너 제작기에서 <strong>웹 ↔ 모바일 텍스트 문자열을 자동 동기화</strong>합니다. 한 번만 입력하면 양쪽에 같이 들어가요.</p>
        <Bullets items={[
          '텍스트 문자열 (내용) 만 동기화 — 한쪽에서 수정해도 반대쪽 같은 index 텍스트가 따라옴',
          '폰트 크기 / 색상 / 위치는 디바이스별 독립 — 모바일은 모바일 프리셋 그대로',
          '배경 이미지·AI 결과·그래픽 옵션은 디바이스별 독립 (각각 업로드)',
          '디바이스 탭 우측 📝 토글로 동기화 ON/OFF — 기본 ON',
        ]} />
        <Tip>모바일 가서는 폰트 크기/위치를 모바일 비율(800×907 또는 750×1350)에 맞게 한 번만 조정해두면, 이후 텍스트 수정은 웹에서만 해도 자동 반영됩니다.</Tip>
      </Step>

      <Step n={2} title="🖼️ 배너 — 배경 이미지 영구 저장 (재편집 복구)">
        <p>이전에는 저장한 배너를 편집 진입하면 배경 이미지가 사라지는 버그가 있었습니다. 이번 업데이트로 <strong>원본 배경 이미지가 cafe24 FTP 에 영구 저장</strong>되어 재편집 시 그대로 복원됩니다.</p>
        <Bullets items={[
          '4MB 미만 이미지: /api/ftp 직접 업로드',
          '4MB 이상 큰 이미지: Vercel Blob 스테이징 경유 (4.5MB 페이로드 한도 우회)',
          '한글 파일명도 ASCII 로 자동 변환되어 cafe24 nginx 와 호환 (이전 403 이슈 해결)',
          '외부 이미지 CORS 자동 프록시 (/api/proxy-image) — 캔버스에서 깨지지 않음',
        ]} />
        <Callout type="warn">
          ⚠ 이전 버전에서 저장된 배너 중 일부는 배경 이미지 링크가 손실되었습니다. 편집 진입 시 상단 노란색 ⚠ 안내 배너가 뜨면, 이미지만 다시 업로드 후 저장하면 됩니다. 이후 저장본은 안전하게 보존됩니다.
        </Callout>
      </Step>

      {/* ── 이벤트 ───────────────────────────────────────────── */}
      <Step n={3} title="🎉 이벤트 — 카테고리 상품 미리보기">
        <p>이벤트 제작/편집/상세 페이지에서 <strong>카테고리 모드 상품 블록도 실제 상품으로 미리보기</strong>됩니다. 이전엔 "사이트 등록 시 확인 가능" placeholder 만 나왔어요.</p>
        <Bullets items={[
          'cafe24 카테고리에 등록된 상품 목록을 받아 그리드로 렌더',
          '상품별로 즉시할인가 / 쿠폰 할인가가 따로 표시 (라이브 위젯과 동일)',
          '동일 카테고리는 한 번만 호출 + 캐시',
        ]} />
      </Step>

      <Step n={4} title="🎉 이벤트 — 라이브 위젯 카드 디자인 매칭">
        <p>admin 미리보기 카드가 라이브 위젯(widget.js) 카드와 1:1 동일한 디자인으로 출력됩니다.</p>
        <Bullets items={[
          'Pretendard Variable 폰트 명시 적용',
          '둥근 모서리 이미지(12px) + 우상단 데코 아이콘(Premium / NEW / BEST 등)',
          '영문/요약 부제 (#ABB0BA), 한글 상품명 (#090909, 16px)',
          '시안색 % 뱃지 + 정가 취소선 + 최종가 — 라이브와 동일',
        ]} />
      </Step>

      <Step n={5} title="🎟️ 이벤트 적용 쿠폰 — admin 편집으로 즉시 라이브 반영">
        <p>이벤트 편집 페이지의 <strong>💸 이벤트 적용 쿠폰</strong> 셀렉트에 추가/삭제하면, <strong>HTML 재배포 없이 라이브 페이지에 자동 반영</strong>됩니다.</p>
        <Bullets items={[
          'widget.js 가 이벤트 데이터의 couponNos 를 읽어서 적용 — 매번 최신 상태로 동기화',
          '쿠폰을 늘리거나 줄여도 cafe24 임베드 코드 수정 불필요',
          '단, 라이브에 노출할 쿠폰은 이 목록에 반드시 등록해야 함 (cafe24 에 만들어두기만 해선 안 됨)',
        ]} />
        <Callout type="warn">
          ⚠ 쿠폰 노출 규칙: cafe24 의 적용 가능 상품 조건(<code>available_product</code>)이 일치하는 상품만 위젯에 할인 표시됩니다. 일부 상품에 안 보이면 cafe24 관리자 → 쿠폰 → 적용 조건에서 해당 상품을 추가하세요.
        </Callout>
      </Step>

      <Step n={6} title="🎉 이벤트 — 큰 이미지 업로드 안정화">
        <p>이벤트 페이지에 이미지를 업로드할 때 Vercel 4.5MB 페이로드 한도로 413 에러가 나던 문제 해결.</p>
        <Bullets items={[
          '큰 이미지는 자동으로 Vercel Blob 에 스테이징 후 cafe24 FTP 로 이동',
          '클라이언트 직접 base64 전송 경로는 더 이상 사용 안 함 (한도 회피)',
          '업로드 완료 후 Blob 은 즉시 정리되어 저장 비용 거의 없음',
        ]} />
      </Step>

      {/* ── 라이브 위젯 ───────────────────────────────────────── */}
      <Step n={7} title="📱 라이브 위젯 — 모바일 grid-3 카드 디자인">
        <p>cafe24 자사몰 페이지에 임베드된 위젯의 <strong>3-col × 모바일(≤500px)</strong> 레이아웃 미세 조정.</p>
        <Bullets items={[
          '카드 간격 24px → 10px',
          '상품명 폰트 16px → 13px',
          '할인 % 뱃지: 이미지 좌상단 모서리 붙음 + 우하단만 라운드(탭 모양)',
          '최종가: 우측 정렬, 14px',
        ]} />
      </Step>

      <Step n={8} title="🔧 백엔드 (ychat) — 쿠폰/카테고리 로직 수정">
        <Bullets items={[
          '카테고리 상품 조회 endpoint (`/categories/:no/products`) 500 에러 수정 — cafe24 admin API 의 display_group 필수 파라미터 누락 문제',
          '쿠폰 가격 계산 — 정액 쿠폰(N원 할인) 이 누락되던 비교 로직 버그 수정. 이제 최저가 기준으로 최적 쿠폰 자동 선택',
          '카테고리 상품 응답에 sale_price / benefit_price / 데코 아이콘 등 풀세트 필드 포함 (단건 상품 응답과 동일 shape)',
        ]} />
      </Step>

      <Callout>
        문의나 추가 개선 요청은 채팅으로 알려주세요. 다음 업데이트 때 같이 반영합니다.
      </Callout>
    </article>
  );
}

// ════════════════════════════════════════════════════════════════
// 1. GPT 프롬프트 사용방법
// ════════════════════════════════════════════════════════════════
function PromptSection() {
  return (
    <article style={S.article}>
      <SectionHead
        emoji="✨"
        title="GPT 프롬프트 사용방법"
        desc="ChatGPT 4o (GPT-Image-1) 는 한글 텍스트를 정확히 렌더링합니다. Claude 가 한글·영문이 혼합된 정교한 프롬프트를 만들어주면, 그대로 ChatGPT 채팅창에 붙여넣어 이미지를 생성합니다."
      />

      <Step n={1} title="📦 제품 카테고리 선택">
        <p>좌측 사이드바 → <strong>AI 이미지 생성</strong> → <strong>GPT용 프롬프트 생성</strong> 클릭.</p>
        <p>제품 카테고리를 먼저 고릅니다 (빈백 / 바디필로우 / 인형 등). 카테고리에 따라 Claude 가 시각적 묘사를 정확히 생성합니다.</p>
        <Tip>
          ⭐ <strong>라이브러리에서 정확한 제품 선택</strong> 옵션을 활용하면, 실제 Yogibo 제품 사진이 자동으로 대표 이미지로 사용됩니다.
          일반 빈백이 아닌 <em>정확한 제품 정체성</em>이 프롬프트에 반영됩니다.
        </Tip>
      </Step>

      <Step n={2} title="📋 캠페인 양식 선택">
        <p>시즌 세일 / 기념일 / 신상 / 쿠폰 / 이벤트 중 하나를 선택합니다.</p>
        <p>양식별로 필수/선택 필드가 다릅니다. <strong>한글 카피</strong>(헤드라인·서브 카피·CTA 문구)를 자유롭게 입력하세요.</p>
        <Callout>
          ✅ 한글이 그대로 결과 이미지에 렌더링됩니다. 영문으로 번역할 필요 없음.
        </Callout>
      </Step>

      <Step n={3} title="📐 출력 사이즈 결정">
        <p>몰별 권장 비율 중 선택. (예: 자사몰 1920×680, 스마트스토어 정사각, SNS 9:16)</p>
        <p>선택한 비율이 프롬프트에 그대로 포함돼 ChatGPT 에 전달됩니다.</p>
      </Step>

      <Step n={4} title="🔧 고급 옵션 (선택)">
        <p>"<strong>▶ 고급 옵션</strong>" 토글을 펼치면 추가 설정이 보입니다:</p>
        <Bullets items={[
          '🕒 이벤트 운영 정보 — 기간 / CTA 버튼 / 헤더 라벨 / 유의사항',
          '🎲 결과 다양화 — 카메라 각도 / 모델 포즈 / 인물 구성 / 조명',
          '📚 레퍼런스 이미지 — 등록된 갤러리에서 스타일 참고',
        ]} />
        <Tip>일반 시안 작업은 고급 옵션을 닫아두고 핵심 5개 필드만 채우는 게 빠릅니다.</Tip>
      </Step>

      <Step n={5} title="✨ 프롬프트 생성 클릭">
        <p>버튼을 누르면 Claude Haiku 가 약 3~5초 만에 정교한 영문 + 한글 혼합 프롬프트를 만들어줍니다.</p>
        <p>예시 출력:</p>
        <CodeBlock>{`A premium Korean ecommerce banner for Yogibo, 1920×680 landscape format.
Place a bold Korean headline "여름맞이 30% 할인 특가전" in the upper-left,
font size approximately 110px, weight 900, color #1a1a1a.
Add a black pill-shaped CTA button "지금 구매하기 →" in the lower-right,
button size around 240×56px, white text.
Use the Yogibo Max beanbag from the source image as the visual base...`}</CodeBlock>
      </Step>

      <Step n={6} title="📋 복사 → 🚀 ChatGPT 에 붙여넣기">
        <p><strong>📋 프롬프트 복사</strong> 버튼을 누르면 클립보드에 복사되고, <strong>🚀 ChatGPT 에 붙여넣기</strong> 버튼을 누르면 새 탭으로 ChatGPT 가 열립니다.</p>
        <p>대표 이미지가 있다면 <em>ChatGPT 채팅창에 먼저 첨부</em>한 뒤 프롬프트를 붙여넣으세요. GPT-Image-1 이 첨부 이미지를 기반으로 한글 카피까지 정확히 렌더링한 배너를 만들어줍니다.</p>
        <Callout type="warn">
          ⚠️ 결과가 마음에 안 들면 ChatGPT 에 "더 미니멀하게", "배경 색상을 베이지로" 같은 자연어 후속 지시를 추가로 보내면 됩니다.
        </Callout>
      </Step>

      <GoButton href="/prompt-builder" label="→ GPT 프롬프트 생성기 열기" />
    </article>
  );
}

// ════════════════════════════════════════════════════════════════
// 2. 페이지 개발 이용방법
// ════════════════════════════════════════════════════════════════
function PageBuilderSection() {
  return (
    <article style={S.article}>
      <SectionHead
        emoji="📐"
        title="페이지 개발 안에서 페이지 이용방법"
        desc="페이지 개발 메뉴는 저장된 페이지를 게시판 형태로 보여주는 보드입니다. 새 페이지를 만들거나 기존 페이지를 편집할 수 있습니다."
      />

      <Step n={1} title="📋 페이지 보드 진입">
        <p>좌측 사이드바 → <strong>페이지 개발</strong> 클릭. 저장된 페이지 카드가 격자로 보입니다.</p>
        <Bullets items={[
          '카드 클릭 → 해당 페이지 편집 (/builder?id=...)',
          '⊕ 새 페이지 → 빈 캔버스에서 시작',
          '카드의 ⋯ 메뉴 → 복제 / 삭제',
        ]} />
      </Step>

      <Step n={2} title="✏️ 빌더 진입 — 좌·우 패널 구조">
        <Bullets items={[
          '좌측 BuilderSidebar — 추가 가능한 섹션 블록 목록',
          '중앙 캔버스 — 800px 폭 기준 라이브 미리보기',
          '우측 PropertiesPanel — 선택된 섹션의 속성 편집',
        ]} />
        <Tip>섹션 블록을 클릭하면 캔버스에 추가되고, 캔버스에서 다시 클릭하면 우측 패널이 그 섹션의 편집기로 전환됩니다.</Tip>
      </Step>

      <Step n={3} title="🧩 섹션 종류">
        <Bullets items={[
          '🖼️ 메인 비주얼 — 800×600 배너 (할인율 + 기간 + CTA)',
          '🛍️ 상품 그리드 — 카페24 상품 자동 fetch 또는 수동 등록',
          '🎟️ 쿠폰 섹션 — 카페24 쿠폰 코드 자동 적용',
          '📝 텍스트 / 이미지 / 구분선 — 자유 배치',
        ]} />
      </Step>

      <Step n={4} title="🎨 이미지 영역의 cafe24 썸네일 picker">
        <p>이미지 입력 영역에 <strong>🛒 cafe24 썸네일 가져오기</strong> 버튼이 있습니다.</p>
        <p>클릭 → 카페24 등록 상품 목록에서 검색 → 썸네일 클릭 → 자동으로 영구 URL 이 입력됩니다.</p>
        <Callout>FTP 업로드 없이 카페24 CDN 의 영구 URL 을 그대로 사용 — 빠르고 깨지지 않음.</Callout>
      </Step>

      <Step n={5} title="💾 저장 → 게시판 sub-list 반영">
        <p>저장 시 페이지 이름을 입력하면, 사이드바의 <strong>페이지 개발</strong> 아래에 sub-list 항목으로 자동 등록됩니다.</p>
        <p>최신 10개가 자동 정렬되어 어디서든 빠르게 다시 진입할 수 있습니다.</p>
      </Step>

      <GoButton href="/page-builder" label="→ 페이지 개발 보드 열기" />
    </article>
  );
}

// ════════════════════════════════════════════════════════════════
// 3. 배너별 생성 관리방법
// ════════════════════════════════════════════════════════════════
function BannerSection() {
  return (
    <article style={S.article}>
      <SectionHead
        emoji="🖼️"
        title="배너별 생성 관리방법"
        desc="자사몰(1920×680) / 스마트스토어(정사각) / SNS(9:16) — 몰별 최적 비율로 메인 배너를 생성합니다."
      />

      <Step n={1} title="🏠 자사몰 배너 — 1920×680">
        <p>사이드바 → <strong>배너 생성</strong> → <strong>자사몰 배너</strong>. <code>/main-visual</code> 페이지가 열립니다.</p>
        <p>5개 웹 레이아웃 프리셋 중 선택:</p>
        <PresetGrid items={[
          { label: '기본', src: '/api/proxy-image?url=https%3A%2F%2Fyogibo.openhost.cafe24.com%2Fweb%2Fimg%2Fdesign%2F84e4d6d034ebd8750008d333c92eedcf.jpg' },
          { label: '타입 A', src: '/api/proxy-image?url=https%3A%2F%2Fyogibo.openhost.cafe24.com%2Fweb%2Fimg%2Fdesign%2Fref_1778046011578_250113_%EB%A1%A4%EB%A7%81%EB%B0%B0%EB%84%88_%EC%84%A4%ED%8A%B9%EA%B0%80_pc.png' },
          { label: '타입 B', src: '/api/proxy-image?url=https%3A%2F%2Fyogibo.openhost.cafe24.com%2Fweb%2Fimg%2Fdesign%2Fref_1778046276217_250331_%EC%9E%90%EC%82%AC%EB%AA%B0_%ED%94%84%EB%A1%9C%EB%AA%A8%EC%85%98_4%EC%9B%94_%EC%8A%A4%ED%94%84%EB%A7%81_%ED%8C%8C%EC%8A%A4%ED%85%94_%EB%A9%94%EC%9D%B8_.png' },
          { label: '타입 D', src: '/api/proxy-image?url=https%3A%2F%2Fyogibo.openhost.cafe24.com%2Fweb%2Fimg%2Fdesign%2Fref_1778045914491_2602_Max__PC.webp' },
          { label: '타입 E', src: '/api/proxy-image?url=https%3A%2F%2Fyogibo.openhost.cafe24.com%2Fweb%2Fimg%2Fdesign%2Fref_1778045924564_PC_3323c7ed-cd6e-4c29-9384-5cd.webp' },
        ]} />
      </Step>

      <Step n={2} title="🎨 배너 스타일 자동 변환">
        <p>이미지를 업로드하고 <strong>🎨 배너 스타일로 변환</strong> 버튼을 누르면, AI 가 다음을 자동 처리합니다:</p>
        <Bullets items={[
          '배경 자동 누끼 (@imgly/background-removal — 클라이언트 측 처리)',
          '대표 색상 추출 후 배경에 매칭',
          '글자 색상을 배경 명도에 맞춰 자동 조정 (WCAG 대비 계산)',
          '프리셋 텍스트(할인율 / 기간 / CTA) 자동 배치',
        ]} />
        <Tip>업로드한 이미지가 누끼 처리되기 어려운 경우(복잡한 배경), 누끼 체크박스를 끄고 색상 매칭만 적용할 수 있습니다.</Tip>
      </Step>

      <Step n={3} title="🖱️ 텍스트 / 이미지 자유 편집">
        <Bullets items={[
          '캔버스의 텍스트 클릭 → 우측에서 폰트 사이즈 / 색 / 자간 / 행간 조정',
          '이미지 드래그 → 위치 이동, 모서리 드래그 → 리사이즈',
          '스티커 라이브러리(좌측) — 데코 요소 추가',
          'free / cover 이미지 모드 — free 는 자유 위치, cover 는 캔버스 채우기',
        ]} />
      </Step>

      <Step n={4} title="📱 모바일 800×907 동시 편집">
        <p>상단 토글로 <strong>웹 / 모바일</strong> 전환. 같은 캠페인의 모바일 배너를 같은 페이지에서 만들 수 있습니다.</p>
        <p>웹·모바일이 한 쌍(<code>mainVisualPair</code>)으로 묶여 저장됩니다.</p>
      </Step>

      <Step n={5} title="💾 저장 / 📥 PNG 내보내기">
        <Bullets items={[
          '저장 → 배너 라이브러리에 등록',
          'PNG 내보내기 → html2canvas 로 정확한 픽셀(1920×680) PNG 다운로드',
          '저장된 배너는 카페24·스마트스토어에 직접 업로드 가능',
        ]} />
      </Step>

      <Step n={6} title="🛒 스마트스토어 / 📷 SNS 배너">
        <p>자사몰과 동일한 방식이지만 비율만 다릅니다. 사이드바에서 해당 메뉴 선택 → 같은 흐름으로 작업.</p>
      </Step>

      <GoButton href="/banner/cafe24" label="→ 자사몰 배너 만들기" />
    </article>
  );
}

// ════════════════════════════════════════════════════════════════
// 4. 이벤트 페이지 제작 방법
// ════════════════════════════════════════════════════════════════
function EventSection() {
  return (
    <article style={S.article}>
      <SectionHead
        emoji="🎉"
        title="이벤트 페이지 제작 방법"
        desc="단일 이벤트 페이지(시즌세일·쿠폰 행사 등)를 섹션 단위로 조립합니다. 카페24 위젯(widget.js) 으로 실제 몰에 임베드됩니다."
      />

      <Step n={1} title="📋 이벤트 목록 확인">
        <p>사이드바 → <strong>이벤트 페이지</strong> → <strong>이벤트 목록</strong>. 저장된 이벤트가 카드 그리드로 표시됩니다.</p>
        <Bullets items={[
          '카드 클릭 → 편집 화면 진입',
          '⊕ 새 이벤트 → 빈 캔버스에서 시작',
          '복제 / 삭제 / 미리보기 액션 제공',
        ]} />
      </Step>

      <Step n={2} title="✨ 새 이벤트 제작 진입">
        <p><strong>이벤트 제작</strong> 클릭 → 섹션 추가 모달이 열립니다.</p>
        <p>이벤트 페이지는 여러 섹션의 수직 연결입니다. 위에서 아래로 순서대로 보입니다.</p>
      </Step>

      <Step n={3} title="🧩 섹션 추가 — 종류별 활용">
        <Bullets items={[
          '🖼️ 메인 비주얼 — 헤더 배너 (자사몰 1920×680 권장)',
          '🛍️ 상품 그리드 — 카페24 상품 등록번호 입력 → 자동 fetch',
          '🎟️ 쿠폰 — 카페24 쿠폰 코드 입력 → 위젯에서 자동 적용 버튼',
          '📝 텍스트 / 🎨 구분선 / 🖼 이미지 — 자유 데코',
        ]} />
        <Tip>상품 그리드 섹션은 카페24 OpenAPI 와 실시간 연동 — 가격·재고가 자동 업데이트됩니다.</Tip>
      </Step>

      <Step n={4} title="🎨 메인 비주얼 통합">
        <p>이벤트 페이지 안의 메인 비주얼 섹션은 <strong>배너 생성</strong> 페이지와 같은 캔버스 엔진을 사용합니다.</p>
        <p>이미 만든 배너가 있다면 라이브러리에서 가져오거나, 이벤트 페이지 안에서 바로 그릴 수 있습니다.</p>
      </Step>

      <Step n={5} title="🔗 카페24 위젯 임베드">
        <p>저장 시 영구 URL 이 발급됩니다. 카페24 관리자 → 디자인 → 위젯 코드(widget.js) 1줄을 이벤트 페이지에 삽입하면 끝.</p>
        <CodeBlock>{`<script src="https://port-0-ychat-xxxxxxxx.cloudtype.app/widget.js"
        data-event="EVENT_ID"></script>`}</CodeBlock>
        <Callout>위젯이 자동으로 섹션·상품·쿠폰을 렌더링하고 cafe24 의 장바구니/쿠폰 API 와 연결합니다.</Callout>
      </Step>

      <Step n={6} title="👁 미리보기 / 💾 저장 / 🔄 재편집">
        <Bullets items={[
          '미리보기 — 실제 위젯과 동일한 렌더링을 새 창으로 확인',
          '저장 → 사이드바 이벤트 목록에 sub-list 로 즉시 반영',
          '재편집 — 사이드바에서 이벤트 클릭 시 같은 편집 화면으로 복귀',
        ]} />
      </Step>

      <GoButton href="/events/list" label="→ 이벤트 페이지 목록 열기" />
    </article>
  );
}

// ════════════════════════════════════════════════════════════════
// 공통 컴포넌트
// ════════════════════════════════════════════════════════════════
function SectionHead({ emoji, title, desc }: { emoji: string; title: string; desc: string }) {
  return (
    <header style={S.secHead}>
      <div style={S.secEmoji}>{emoji}</div>
      <div>
        <h2 style={S.secTitle}>{title}</h2>
        <p style={S.secDesc}>{desc}</p>
      </div>
    </header>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section style={S.step}>
      <div style={S.stepHead}>
        <span style={S.stepNum}>{n}</span>
        <h3 style={S.stepTitle}>{title}</h3>
      </div>
      <div style={S.stepBody}>{children}</div>
    </section>
  );
}

function Bullets({ items }: { items: string[] }) {
  return (
    <ul style={S.bullets}>
      {items.map((it, i) => (
        <li key={i} style={S.bullet}>
          <span style={S.bulletMarker}>•</span>
          <span>{it}</span>
        </li>
      ))}
    </ul>
  );
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div style={S.tip}>
      <span style={S.tipLabel}>💡 TIP</span>
      <span>{children}</span>
    </div>
  );
}

function Callout({ children, type = 'info' }: { children: React.ReactNode; type?: 'info' | 'warn' }) {
  return (
    <div style={{ ...S.callout, ...(type === 'warn' ? S.calloutWarn : {}) }}>
      {children}
    </div>
  );
}

function CodeBlock({ children }: { children: string }) {
  return <pre style={S.code}>{children}</pre>;
}

function GoButton({ href, label }: { href: string; label: string }) {
  return (
    <div style={S.goWrap}>
      <Link href={href} style={S.goBtn}>{label}</Link>
    </div>
  );
}

function PresetGrid({ items }: { items: { label: string; src: string }[] }) {
  return (
    <div style={S.presetGrid}>
      {items.map((p) => (
        <figure key={p.label} style={S.presetCard}>
          <img src={p.src} alt={p.label} style={S.presetImg} />
          <figcaption style={S.presetLabel}>{p.label}</figcaption>
        </figure>
      ))}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// styles
// ════════════════════════════════════════════════════════════════
const S: Record<string, CSSProperties> = {
  page: { maxWidth: 1080, margin: '0 auto', padding: '36px 28px 80px' },

  hd: { marginBottom: 28 },
  h1: { fontSize: 28, fontWeight: 800, color: '#0f172a', margin: '0 0 8px', letterSpacing: '-0.02em' },
  lead: { fontSize: 14, color: '#475569', lineHeight: 1.6, margin: 0 },

  tabs: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: 10,
    marginBottom: 32,
  },
  tab: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 4,
    padding: '14px 16px',
    background: '#fff',
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: '#e5e7eb',
    borderRadius: 12,
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'all 0.15s',
  },
  tabActive: {
    borderColor: '#fe6326',
    background: '#fff7ed',
    boxShadow: '0 1px 0 #fe6326 inset',
  },
  tabEmoji: { fontSize: 20 },
  tabLabel: { fontSize: 13, fontWeight: 700, color: '#0f172a' },
  tabSub: { fontSize: 11, color: '#64748b', lineHeight: 1.4 },

  content: { background: '#fff', borderRadius: 16, padding: 0 },
  article: { display: 'flex', flexDirection: 'column', gap: 0 },

  secHead: {
    display: 'flex',
    gap: 18,
    alignItems: 'flex-start',
    padding: '28px 32px',
    background: 'linear-gradient(180deg, #fff7ed 0%, #ffffff 100%)',
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: '#fed7aa',
    marginBottom: 24,
  },
  secEmoji: { fontSize: 36, lineHeight: 1 },
  secTitle: { fontSize: 22, fontWeight: 800, color: '#0f172a', margin: '0 0 6px', letterSpacing: '-0.015em' },
  secDesc: { fontSize: 13, color: '#475569', lineHeight: 1.6, margin: 0 },

  step: {
    background: '#fff',
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: '20px 24px',
    marginBottom: 14,
  },
  stepHead: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 },
  stepNum: {
    width: 28,
    height: 28,
    borderRadius: '50%',
    background: '#fe6326',
    color: '#fff',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 13,
    fontWeight: 800,
    flexShrink: 0,
  },
  stepTitle: { fontSize: 16, fontWeight: 700, color: '#0f172a', margin: 0 },
  stepBody: { fontSize: 13, color: '#334155', lineHeight: 1.7 },

  bullets: { margin: '8px 0 4px', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 },
  bullet: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 1.6,
    display: 'flex',
    gap: 10,
    alignItems: 'flex-start',
  },
  bulletMarker: { color: '#fe6326', fontWeight: 800, flexShrink: 0, lineHeight: 1.6 },

  tip: {
    marginTop: 12,
    padding: '10px 14px',
    background: '#fefce8',
    borderLeft: '3px solid #facc15',
    borderRadius: 6,
    fontSize: 12,
    color: '#713f12',
    display: 'flex',
    gap: 10,
    alignItems: 'flex-start',
    lineHeight: 1.6,
  },
  tipLabel: { fontWeight: 800, flexShrink: 0 },

  callout: {
    marginTop: 12,
    padding: '12px 14px',
    background: '#eff6ff',
    borderLeft: '3px solid #2563eb',
    borderRadius: 6,
    fontSize: 12.5,
    color: '#1e3a8a',
    lineHeight: 1.6,
  },
  calloutWarn: {
    background: '#fef2f2',
    borderLeft: '3px solid #ef4444',
    color: '#7f1d1d',
  },

  code: {
    margin: '10px 0 4px',
    padding: '14px 16px',
    background: '#0f172a',
    color: '#e2e8f0',
    borderRadius: 8,
    fontSize: 12,
    lineHeight: 1.7,
    fontFamily: "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace",
    overflowX: 'auto',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },

  goWrap: { marginTop: 18, display: 'flex', justifyContent: 'flex-end' },
  goBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '11px 20px',
    background: '#0f172a',
    color: '#fff',
    fontSize: 13,
    fontWeight: 700,
    borderRadius: 10,
    textDecoration: 'none',
  },

  presetGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
    gap: 10,
    margin: '12px 0 4px',
  },
  presetCard: {
    margin: 0,
    background: '#fff',
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: '#e5e7eb',
    borderRadius: 8,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  presetImg: { width: '100%', display: 'block', aspectRatio: '2.8/1', objectFit: 'cover' },
  presetLabel: {
    padding: '6px 10px',
    fontSize: 11,
    fontWeight: 700,
    color: '#475569',
    textAlign: 'center',
    background: '#f8fafc',
    borderTop: '1px solid #e5e7eb',
  },
};

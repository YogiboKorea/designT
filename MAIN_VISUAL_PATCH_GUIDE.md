# main-visual/page.tsx 수정 가이드 (v4.7)

이 가이드는 **현재 사용 중인 `src/app/main-visual/page.tsx` 파일에 직접 수정**해야 하는 부분을 안내합니다. 파일이 3,500줄이라 통째로 갈아치우면 기존 작업물이 손상되니 핵심 부분만 수정합니다.

---

## 패치 1 — useState 영역에 platform 상태 추가

### 위치
파일 상단 useState 들이 모여있는 곳 (대략 30~40번째 줄, `const [isSingleMode, setIsSingleMode] = useState(false);` 근처)

### 추가
```typescript
// platform — URL 쿼리에서 받음. 'cafe24' | 'smart-store' | 'sns'
// 저장 시 어느 갤러리에 들어갈지 결정 + 사이즈 자동 적용에 사용됨
const [platform, setPlatform] = useState<'cafe24' | 'smart-store' | 'sns'>('cafe24');
```

---

## 패치 2 — useEffect (URL 파라미터 처리) 수정

### 위치
466번째 줄 부근, `useEffect(() => { ... params.get('size'); ... }` 부분

### 변경 전 (대략 466~490줄)
```typescript
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
        applySnsPreset('A', true);
      } else if (sizeParam === '1920x680') {
        applyWebPreset('Default', true);
      }
    }
  }

  const id = params.get('id');
  // ... 이하 생략
```

### 변경 후
```typescript
useEffect(() => {
  if (typeof window === 'undefined') return;
  const params = new URLSearchParams(window.location.search);

  // 🆕 v4.7 — platform 쿼리 파라미터 처리
  const platformParam = params.get('platform') as 'cafe24' | 'smart-store' | 'sns' | null;
  if (platformParam === 'cafe24' || platformParam === 'smart-store' || platformParam === 'sns') {
    setPlatform(platformParam);

    // platform 별 사이즈 자동 설정 (size 쿼리가 없을 때)
    if (!params.get('size')) {
      if (platformParam === 'smart-store') {
        // 스마트스토어 — 웹: 1920×860 / 모바일: 750×1350
        MAIN_VISUAL_SIZES.web.width = 1920;
        MAIN_VISUAL_SIZES.web.height = 860;
        MAIN_VISUAL_SIZES.web.label = '스마트스토어 웹 (1920×860)';
        MAIN_VISUAL_SIZES.mobile.width = 750;
        MAIN_VISUAL_SIZES.mobile.height = 1350;
        MAIN_VISUAL_SIZES.mobile.label = '스마트스토어 모바일 (750×1350)';
      }
      // 자사몰(cafe24)은 default 그대로 (1920×680, 800×907)
    }
  }

  // Custom size override for SmartStore / SNS (기존 — 그대로 유지)
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
        applySnsPreset('A', true);
      } else if (sizeParam === '1920x680') {
        applyWebPreset('Default', true);
      }
    }
  }

  const id = params.get('id');
  // ... 이하 생략 (변경 없음)
```

---

## 패치 3 — 저장 payload 에 platform 포함

### 위치
1570번째 줄 부근, `const payload = { title, eventType: 'banner', sections: [...] }` 부분

### 변경 전
```typescript
const payload = {
  title,
  eventType: 'banner',
  sections: [
    // ...
  ],
  imageUrl: uploaded.web || uploaded.mobile || '',
};
```

### 변경 후
```typescript
const payload = {
  title,
  eventType: 'banner',
  platform,  // 🆕 v4.7 — 어느 갤러리에 저장될지 결정
  sections: [
    // ...
  ],
  imageUrl: uploaded.web || uploaded.mobile || '',
};
```

---

## 패치 4 — 웹 프리셋이 레퍼런스에서 자동 로드되도록

### 핵심 변경
지금까지 5개의 하드코딩된 프리셋 (Default / A / B / D / E) 을 사용 중인데, 이걸 **레퍼런스 등록한 것 중 카테고리별로 자동 표시**하도록 변경.

### Step 4.1 — 레퍼런스 데이터 로드 (useState + useEffect)

useState 영역에 추가:
```typescript
// 🆕 v4.7 — 레퍼런스에서 프리셋으로 사용할 데이터 로드
const [webReferences, setWebReferences] = useState<Array<{
  _id: string;
  title: string;
  imageUrl: string;
  category: string;
  platform?: string;
}>>([]);
const [mobileReferences, setMobileReferences] = useState<Array<{
  _id: string;
  title: string;
  imageUrl: string;
  category: string;
  platform?: string;
}>>([]);

useEffect(() => {
  // 웹 배너 카테고리 레퍼런스
  fetch('/api/references?category=web-banner&limit=50')
    .then((r) => r.json())
    .then((d) => {
      if (d.ok) setWebReferences(d.items);
    })
    .catch(() => {});

  // 모바일 카테고리 레퍼런스
  fetch('/api/references?category=mobile&limit=50')
    .then((r) => r.json())
    .then((d) => {
      if (d.ok) setMobileReferences(d.items);
    })
    .catch(() => {});
}, []);
```

### Step 4.2 — 레퍼런스 기반 프리셋 적용 함수

기존 `applyWebPreset` 함수 근처(146번째 줄, 328번째 줄 근처) 에 새 함수 추가:

```typescript
/**
 * 🆕 v4.7 — 레퍼런스를 프리셋(레이아웃 가이드)으로 적용.
 * 
 * 레퍼런스 이미지를 캔버스 배경(또는 가이드)으로 깔아서
 * 디자이너가 그 레이아웃을 따라 텍스트/버튼을 배치할 수 있도록 함.
 *
 * 인물 사진은 제외하라는 의도 — 레퍼런스 등록 시 카테고리를 'web-banner' 또는
 * 'mobile' 로 등록한 것 중 텍스트/디자인 위주의 이미지를 사용.
 */
const applyReferenceAsPreset = (
  device: 'web' | 'mobile',
  ref: { imageUrl: string; title: string },
) => {
  // 레퍼런스 이미지를 배경 가이드로 깔기 (반투명)
  setState((prev) => ({
    ...prev,
    [device]: {
      ...prev[device],
      bgImage: ref.imageUrl,
      // 가이드용으로 표시 — 디자이너가 보면서 텍스트 배치 후 직접 변경 가능
      bgGraphicType: null,  // 기존 그래픽 프리셋과 충돌 방지
    },
  }));
};
```

### Step 4.3 — UI 변경 (2596번째 줄 부근)

기존 5개의 하드코딩된 버튼 그리드를 **레퍼런스에서 동적으로 생성**:

#### 변경 전 (대략 2592~2643줄)
```tsx
{/* ───── Web 프리셋 설정 (1920x680) ───── */}
{((!isSingleMode && device === 'web') || (isSingleMode && MAIN_VISUAL_SIZES.web.width === 1920 && MAIN_VISUAL_SIZES.web.height === 680)) && (
  <div style={{ marginBottom: '16px', padding: '12px', background: '#fafafa', border: '1px solid #eef0f3', borderRadius: '8px' }}>
    <label style={{ ...fieldLabel, marginBottom: 8 }}>웹 레이아웃 프리셋</label>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: 12 }}>
      <button onClick={() => applyWebPreset('Default')} ...>
        <img src="..." />
        기본타입
      </button>
      {/* ... 4개 더 */}
    </div>
  </div>
)}
```

#### 변경 후
```tsx
{/* ───── Web 프리셋 설정 — v4.7: 레퍼런스 기반 동적 ───── */}
{((!isSingleMode && device === 'web') || (isSingleMode && MAIN_VISUAL_SIZES.web.width >= 1280)) && (
  <div style={{ marginBottom: '16px', padding: '12px', background: '#fafafa', border: '1px solid #eef0f3', borderRadius: '8px' }}>
    <label style={{ ...fieldLabel, marginBottom: 8 }}>
      웹 레이아웃 프리셋
      <span style={{ fontSize: 10, color: '#9ca3af', fontWeight: 400, marginLeft: 6 }}>
        — 등록된 레퍼런스 중 클릭하면 가이드로 표시됨
      </span>
    </label>

    {webReferences.length === 0 ? (
      <div style={{ padding: 20, fontSize: 12, color: '#9ca3af', textAlign: 'center', background: '#fff', borderRadius: 6 }}>
        등록된 웹 레퍼런스가 없습니다.{' '}
        <a href="/references" style={{ color: '#2563eb' }}>레퍼런스 등록</a>
      </div>
    ) : (
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '8px',
        marginBottom: 12,
        maxHeight: 300,
        overflowY: 'auto',
      }}>
        {/* 기본타입 — 빈 캔버스로 리셋 */}
        <button
          onClick={() => applyWebPreset('Default')}
          style={{ padding: '8px', fontSize: '12px', fontWeight: 600, borderRadius: '8px', border: state.web.bgImage === '' ? '2px solid #2563eb' : '1px solid #d1d5db', background: '#fff', color: '#374151', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}
        >
          <div style={{ width: '100%', aspectRatio: '2.8/1', background: '#f3f4f6', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
            ⬜
          </div>
          기본 (빈 캔버스)
        </button>

        {/* 등록된 레퍼런스를 프리셋으로 표시 */}
        {webReferences.map((ref) => (
          <button
            key={ref._id}
            onClick={() => applyReferenceAsPreset('web', ref)}
            style={{
              padding: '8px',
              fontSize: '11px',
              fontWeight: 600,
              borderRadius: '8px',
              border: state.web.bgImage === ref.imageUrl ? '2px solid #2563eb' : '1px solid #d1d5db',
              background: '#fff',
              color: '#374151',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s',
            }}
            onMouseOver={(e) => e.currentTarget.style.borderColor = '#2563eb'}
            onMouseOut={(e) => e.currentTarget.style.borderColor = state.web.bgImage === ref.imageUrl ? '#2563eb' : '#d1d5db'}
          >
            <img
              src={`/api/proxy-image?url=${encodeURIComponent(ref.imageUrl)}`}
              alt={ref.title}
              style={{ width: '100%', borderRadius: '4px', objectFit: 'cover', aspectRatio: '2.8/1', border: '1px solid #f3f4f6' }}
            />
            <div style={{ width: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'center' }}>
              {ref.title}
            </div>
          </button>
        ))}
      </div>
    )}
  </div>
)}

{/* ───── Mobile 프리셋 설정 — v4.7: 신규 ───── */}
{((!isSingleMode && device === 'mobile') || (isSingleMode && MAIN_VISUAL_SIZES.web.width === 750 && MAIN_VISUAL_SIZES.web.height === 1350)) && (
  <div style={{ marginBottom: '16px', padding: '12px', background: '#fafafa', border: '1px solid #eef0f3', borderRadius: '8px' }}>
    <label style={{ ...fieldLabel, marginBottom: 8 }}>
      모바일 레이아웃 프리셋
      <span style={{ fontSize: 10, color: '#9ca3af', fontWeight: 400, marginLeft: 6 }}>
        — 등록된 모바일 레퍼런스 중 클릭하면 가이드로 표시됨
      </span>
    </label>

    {mobileReferences.length === 0 ? (
      <div style={{ padding: 20, fontSize: 12, color: '#9ca3af', textAlign: 'center', background: '#fff', borderRadius: 6 }}>
        등록된 모바일 레퍼런스가 없습니다.{' '}
        <a href="/references" style={{ color: '#2563eb' }}>레퍼런스 등록</a>
      </div>
    ) : (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: 12, maxHeight: 300, overflowY: 'auto' }}>
        {/* 기본타입 */}
        <button
          onClick={() => setState((prev) => ({
            ...prev,
            mobile: { ...prev.mobile, bgImage: '' },
          }))}
          style={{ padding: '8px', fontSize: '12px', fontWeight: 600, borderRadius: '8px', border: state.mobile.bgImage === '' ? '2px solid #2563eb' : '1px solid #d1d5db', background: '#fff', color: '#374151', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}
        >
          <div style={{ width: '100%', aspectRatio: '3/4', background: '#f3f4f6', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
            ⬜
          </div>
          기본 (빈 캔버스)
        </button>

        {mobileReferences.map((ref) => (
          <button
            key={ref._id}
            onClick={() => applyReferenceAsPreset('mobile', ref)}
            style={{
              padding: '8px',
              fontSize: '11px',
              fontWeight: 600,
              borderRadius: '8px',
              border: state.mobile.bgImage === ref.imageUrl ? '2px solid #2563eb' : '1px solid #d1d5db',
              background: '#fff',
              color: '#374151',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <img
              src={`/api/proxy-image?url=${encodeURIComponent(ref.imageUrl)}`}
              alt={ref.title}
              style={{ width: '100%', borderRadius: '4px', objectFit: 'cover', aspectRatio: '3/4', border: '1px solid #f3f4f6' }}
            />
            <div style={{ width: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'center' }}>
              {ref.title}
            </div>
          </button>
        ))}
      </div>
    )}
  </div>
)}

{/* SNS 프리셋 — 기존 그대로 유지 (변경하지 않음) */}
```

---

## 패치 5 (선택) — 헤더에 platform 표시

### 위치
페이지 상단 어느 헤더 영역 (예: 1880번째 줄 부근, 타이틀 표시 부분)

### 추가 (선택사항 — 보기 좋게)
```tsx
{platform === 'smart-store' && (
  <span style={{ display: 'inline-block', padding: '3px 10px', fontSize: 12, fontWeight: 600, background: '#ecfdf5', color: '#03c75a', borderRadius: 99, marginLeft: 8 }}>
    🛒 스마트스토어
  </span>
)}
{platform === 'cafe24' && (
  <span style={{ display: 'inline-block', padding: '3px 10px', fontSize: 12, fontWeight: 600, background: '#eff6ff', color: '#2563eb', borderRadius: 99, marginLeft: 8 }}>
    🏠 자사몰
  </span>
)}
```

---

## 적용 후 검증

```
1. /banner/cafe24 → "✨ 새 배너 제작" 클릭
   ✓ /main-visual?platform=cafe24 진입
   ✓ 사이즈 1920×680 / 800×907 (기본)
   ✓ 웹 프리셋 카드: 등록된 web-banner 카테고리 레퍼런스 표시
   ✓ 모바일 프리셋 카드: 등록된 mobile 카테고리 레퍼런스 표시
   ✓ 저장 시 platform='cafe24' 로 저장 → /banner/cafe24 갤러리에 보임

2. /banner/smart-store → "✨ 새 배너 제작" 클릭
   ✓ /main-visual?platform=smart-store 진입
   ✓ 사이즈 1920×860 / 750×1350
   ✓ 같은 프리셋 시스템 (web-banner / mobile 카테고리)
   ✓ 저장 시 platform='smart-store' 로 저장 → /banner/smart-store 갤러리에 보임

3. SNS 는 건드리지 않음 (그대로 동작)
```

---

## 트러블슈팅

| 증상 | 원인 | 해결 |
|------|------|------|
| 스마트스토어 갤러리에 옛 배너도 보임 | platform 필드 없는 옛 데이터 | DB에서 `platform` 필드를 'cafe24' 로 일괄 업데이트 |
| 프리셋 카드에 아무것도 안 보임 | 해당 카테고리 레퍼런스 없음 | /references 에서 카테고리 'web-banner' 또는 'mobile' 로 등록 |
| 레퍼런스 클릭 시 이미지 안 깔림 | applyReferenceAsPreset 함수 누락 | 패치 4.2 적용 확인 |

---

## DB 마이그레이션 (선택)

기존 자사몰 배너에 platform 필드가 없을 수 있습니다.
MongoDB Compass / shell 에서 일괄 업데이트:

```javascript
db.events.updateMany(
  { platform: { $exists: false }, eventType: 'banner' },
  { $set: { platform: 'cafe24' } }
);
```

이렇게 하면 기존 배너는 모두 자사몰 갤러리에서 표시됩니다.

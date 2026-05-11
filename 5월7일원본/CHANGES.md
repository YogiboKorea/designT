# 변경 내역 (v15 - 🎨 배너 레이아웃: Edge Stretch + Feather 방식)

## 🎯 방향 전환
사용자 피드백: **"배경 제거 아니라 원본 유지 + 왼쪽 확장"** 을 원함.
→ AI 아웃페인팅(Stable Diffusion) 은 브라우저 WASM 불가능.
→ **포토샵 디자이너 고전 트릭** 으로 90% 비슷한 효과 재현.

## 🔬 기법 — "Edge Stretch + Feather"
1. 합성 canvas 생성 (캔버스 크기)
2. 이미지 왼쪽 8% 평균색 샘플링 → `edgeColor`
3. 캔버스 전체를 edgeColor 로 fill
4. 이미지를 우측 정렬로 그림 (높이 100%, 너무 wide 면 가로 80%)
5. **Edge Stretch**: 이미지 왼쪽 1px 세로 스트립을 왼쪽 전체 영역에 가로로 stretch
   → 벽/배경색이 "계속 이어지는 것처럼" 보이는 착시
6. **Feather**: 이미지 왼쪽 경계에 edgeColor→투명 그라디언트 덮어서 경계선 숨김
7. 합성 결과를 `toDataURL` 로 저장 → cover 모드로 적용

## 📊 v14 vs v15

| 항목 | v14 | v15 |
|---|---|---|
| AI 필요 | ✅ 배경 제거 | ❌ |
| 네트워크 | 필요 | 불필요 |
| 실행 속도 | ~10초 | 즉시 |
| 원본 보존 | 부분 | 전체 |
| 한계 | 풍경/추상 실패 | 왼쪽 피사체 걸리면 어색 |

## 💡 사용자 Tip
- 이미지의 왼쪽 가장자리가 **단조로운 배경(벽 등)** 이어야 가장 자연스러움
- 왼쪽에 피사체가 걸치면 → 결과 이상함, Undo 후 다른 이미지 시도
- 진짜 벽 확장 효과는 Replicate API (유료, 건당 $0.02~0.05) 필요

## 파일
- `src/app/main-visual/page.tsx` — `handleConvertToBannerStyle` 재작성
  - 배경 제거 호출 제거
  - `loadImage`, `hexToRgb`, `sampleLeftEdgeColor` 헬퍼
  - Canvas 기반 Edge Stretch + Feather 알고리즘
- 배경 제거 기능 자체는 유지 (다른 AI 옵션으로 남겨둠)

---

# 변경 내역 (v14.3 - imgly CDN 자동 사용)

## 🎯 목표
yogibo 참고 이미지처럼 **"피사체 우측 + 왼쪽 그라데이션"** 레이아웃을 버튼 하나로 자동 완성.

## 🔬 5단계 처리

### 1) 배경 제거 (AI)
`@imgly/background-removal` 로 피사체만 추출 → 투명 PNG.

### 2) 피사체 Bounding Box 계산
```ts
투명 PNG 를 canvas 에 그린 뒤 imageData 순회
  → alpha > 128 픽셀의 min/max (x, y) 추출
  → 이게 피사체의 실제 영역
```
2픽셀 스텝으로 샘플링해 성능 확보.

### 3) 원본 배경색 샘플링
원본 이미지의 **왼쪽 15% × 상단 60%** 영역 평균 RGB 계산.
대부분의 실내/스튜디오 사진은 이 영역이 깨끗한 벽/배경이라 안정적.

### 4) 피사체 배치 계산
```
목표 높이    = 캔버스 높이 × 85%
scale        = 목표 높이 / bbox.height
피사체 중심  = 캔버스의 x=70%, y=50%
이미지 좌표  = 중심위치 - 피사체 중심 × scale
```
→ 피사체가 캔버스의 오른쪽 치우친 위치에 정확히 배치.

### 5) 그라데이션 세팅
- 색상 = 샘플링한 배경색
- 방향 = 웹 90° (왼쪽), 모바일 180° (위)
- offset = [0% 불투명, 55% 투명]

모든 state 를 단일 `updateCurrent` 로 묶어 **Undo 한 단계에 원상복구** 가능.

## 🖼 UI

AI 설정 패널 내부에 강조된 **큰 보라-핑크 그라데이션 버튼** 추가:
```
🎨 배너 스타일로 변환
(피사체 추출 → 우측 배치, 배경색 샘플링 → 그라데이션 자동 설정)
```
이미지가 업로드되지 않은 상태에선 비활성.

## 📊 진행 상황 토스트
```
🎨 배너 스타일 생성 중…
🤖 피사체 추출 중…  (최초 1회는 모델 로드로 오래 걸림)
📐 피사체 위치 분석 중…
✅ 배너 스타일 생성 완료!
```

## ⚠ 주의
- 배경 제거가 선행 조건 → v13.2 이후 `public/bg-removal/` 세팅 필수
- 피사체가 명확한 사진에 잘 동작 (인물·제품·동물). 풍경/추상은 실패 가능
- 원본의 왼쪽 영역이 피사체가 아닌 배경이어야 색 샘플링 정확
- 생성 후 위치·크기·그라데이션 모두 **수동으로 재조정 가능**

## 파일
- `src/app/main-visual/page.tsx`
  - `loadImage`, `calculateSubjectBbox`, `sampleOriginalBackgroundColor` 헬퍼
  - `handleConvertToBannerStyle` 메인 함수
  - AI 설정 패널에 "🎨 배너 스타일로 변환" 대형 버튼

---

# 변경 내역 (v13.2 hotfix - imgly asset self-hosting)

## 🐞 v13.1 CDN 방식도 실패 (Turbopack 환경 특수 이슈)
```
Failed to create session: "TypeError: r._OrtGetInputOutputMetadata is not a function".
Please check if the publicPath is set correctly.
```
staticimgly.com 의 CDN URL 에 1.5.8 버전 asset 이 배포되지 않았거나 Turbopack 이 ORT 모듈을 특별히 싫어하는 것으로 추정. **자체 호스팅(self-hosting)** 방식이 가장 안정적.

## ✅ 해결 — 자체 호스팅 세팅

### 1) Next.js 설정 (`next.config.ts`)
```ts
transpilePackages: [
  '@imgly/background-removal',
  '@imgly/background-removal-data',
],
```
→ Turbopack 이 imgly 패키지를 적절히 변환하도록.

### 2) 추가 의존성 (`package.json`)
```json
"@imgly/background-removal":      "^1.5.8",
"@imgly/background-removal-data": "^1.5.8"   // 신규 — 모델 파일 보관
```

### 3) postinstall 스크립트 (`scripts/copy-bg-removal-assets.js`)
`npm install` 직후 node_modules 에서 `public/bg-removal/` 로 **WASM·ONNX·메타데이터 일괄 복사**:
```
node_modules/@imgly/background-removal/dist/      ┐
                                                  ├─→ public/bg-removal/
node_modules/@imgly/background-removal-data/dist/ ┘
```
윈도우/맥/리눅스 호환 (순수 Node.js 스크립트, 외부 툴 불필요).

### 4) 런타임 설정
```ts
removeBackground(url, {
  publicPath: '/bg-removal/',    // Next.js 가 public/ 을 정적 서빙 → 안정
  model: 'isnet_fp16',
  proxyToWorker: false,          // Worker 모드는 Turbopack 에서 불안정
  progress: (key, current, total) => { ... },
});
```

## 🚀 사용자 플로우
1. `npm install` → postinstall 로 asset 자동 복사
2. `npm run dev` 실행
3. 브라우저에서 이미지 업로드 + "배경 자동 제거" 체크 → 동작

최초 로딩만 ~3-5초 (로컬 모델 로드). 이후 이미지당 2-10초.

## 🔍 디버깅 팁
만약 여전히 실패하면 브라우저 콘솔에서 `/bg-removal/` 에 어떤 파일이 있는지 Network 탭 확인:
```
/bg-removal/isnet_fp16.onnx     → 모델 파일 (로드 되어야 함)
/bg-removal/ort-wasm-simd.wasm  → ONNX Runtime WASM
```
404 뜨는 파일이 있으면 `node scripts/copy-bg-removal-assets.js` 수동 실행.

---

# 변경 내역 (v13.1 hotfix - Next.js WASM 경로 문제 해결)

## 🐞 에러 수정
```
❌ Failed to create session: "TypeError: r._OrtGetInputOutputMetadata is not a function".
   Please check if the publicPath is set correctly.
```
Next.js 는 `node_modules` 안의 WASM 을 dev 서버에서 자동 서빙하지 않아
ONNX Runtime 이 WASM 파일을 못 찾는 문제. `publicPath` 를 공식 CDN 으로 지정해서 해결.

## ✨ 개선
**1) `publicPath` 설정**
```ts
publicPath: 'https://staticimgly.com/@imgly/background-removal-data/1.5.8/dist/'
```

**2) `model: 'isnet_fp16'` 사용**
→ fp16 양자화 모델. 다운로드 크기/속도 개선, 정확도는 기본 모델과 거의 동일.

**3) 진행률 토스트**
→ 다운로드/추론 진행률(%) 실시간 표시
```
🤖 AI 배경 제거 · 모델 다운로드 47%
```

## 📦 오프라인/커스텀 호스팅
외부 CDN 의존이 싫다면:
1. `npm i @imgly/background-removal-data`
2. `public/imgly/` 로 dist 파일 복사
3. `publicPath: '/imgly/'` 로 변경

---

# 변경 내역 (v13 - ✨ AI 자동 처리: 배경 제거 + 색상 매칭)

## 🚀 신규 기능

우측 패널 최상단에 **"✨ AI 자동 처리"** 섹션 추가. 2개 체크박스 중 원하는 옵션만 켜두면 **이미지 업로드 시 자동 적용**.

### 옵션 1: 배경 자동 제거
`@imgly/background-removal` (WASM, 로컬 실행, 무료)
- 이미지 업로드 직후 AI 가 피사체만 남기고 배경을 투명 처리
- 결과: 방 바닥·벽·창문이 사라지고 **소파 + 인물만** 베이지 공간에 배치 → 참고 yogibo 디자인 퀄리티
- **최초 1회**: 모델(~30MB) 다운로드로 수십 초 소요. 이후 브라우저 캐시 사용.
- **이후**: 이미지 1장당 2~10초

### 옵션 2: 색상 자동 매칭
`Canvas.getImageData` 로 이미지 **왼쪽 15% 영역 평균 색**을 샘플링
- 그라데이션 스톱 색상에 자동 반영
- 결과: 그라데이션과 이미지 경계선의 색 차이가 거의 사라짐 → 훨씬 자연스러운 합성
- 동기 처리, 수 ms 내 완료
- **기본 ON** — 부작용 적고 효과 좋음

### UI 구성
- 체크박스 2개 (각 옵션 on/off)
- **✨ AI 재적용** 버튼 — 기존 이미지에 현재 설정 다시 적용
- **↶ 원본으로** 버튼 — 배경 제거를 취소하고 업로드 직후 원본으로 되돌리기
- **하단 중앙 토스트**로 "🤖 AI 배경 제거 중..." / "✅ 완료" / "❌ 실패" 표시

### 타입 확장
```ts
// types.ts — MainVisualCanvas
export interface MainVisualCanvas {
  bgImage: string;
  bgImageOriginal?: string;   // 신규 — AI 처리 전 원본 URL (되돌리기용)
  ...
}
```

### 의존성
```json
// package.json
"@imgly/background-removal": "^1.5.8"
```
→ 사용자는 `npm install` 한 번 실행해주세요.

### Dynamic Import
```ts
// 페이지 초기 로드 시점엔 로드하지 않음 (~30MB WASM)
// 사용자가 "배경 제거" 옵션 켠 채로 업로드할 때만 import
const mod = await import('@imgly/background-removal');
const blob = await mod.removeBackground(url);
```

### 처리 흐름
```
이미지 업로드
   ↓
[즉시] 캔버스에 원본 표시 → 사용자 대기감 ↓
   ↓
[백그라운드] AI 파이프라인
  · matchColor  → 샘플링 → 그라데이션 색 업데이트
  · removeBackground → WASM 처리 → bgImage 교체
   ↓
토스트 "✅ 완료"
```

### 트레이드오프
- ❌ 배경 제거 실패 시 토스트에 오류 표시, bgImage 는 원본 유지
- ❌ 의존성 커짐 (node_modules +약 50MB 코드 + WASM 모델 ~30MB)
- ✅ 비용 0원 (모두 로컬 실행)
- ✅ 프라이버시 안전 (이미지가 외부로 전송되지 않음)

### 파일
- `package.json` — `@imgly/background-removal` 추가
- `src/app/main-visual/types.ts` — `bgImageOriginal` 필드
- `src/app/main-visual/page.tsx` — AI state·헬퍼·UI·토스트 일체

---

# 변경 내역 (v12 - 그라데이션 각도/페이드 범위 조절 UI 복구)

## 🎚 그라데이션 컨트롤 확장

### 문제
참고 웹 이미지는 이미지가 cover 로 전체를 덮고 그 위에 왼쪽→중앙까지만 부드럽게 페이드되는 그라데이션으로 자연스럽게 이어짐. 하지만 현재는 각도가 90°(웹)/180°(모바일) 로 고정이라 방향/세기 조정 불가 → 느낌 재현 어려움.

### 해결

**1) 방향 프리셋 버튼** — "색이 진하게 깔릴 위치" 기준으로 직관적 라벨
```
[ 왼쪽 ]  [ 오른쪽 ]  [ 위 ]  [ 아래 ]
  90°      270°       180°     0°
```
활성 시 파란색 강조.

**2) 각도 슬라이더** (0~359°) — 프리셋으로 안 잡히는 사선/대각 방향도 세밀 조정 가능.

**3) 페이드 범위 슬라이더** (10~100%) — 두 번째 스톱의 offset 을 실시간 조정.
- **값이 작을수록(30%)** — 색이 빨리 사라져서 이미지가 더 많이 보임
- **값이 클수록(80%)** — 색이 캔버스 깊숙이까지 깔려 덮는 면적이 넓음

**4) 기본 페이드 offset 조정: 62.5% → 50%** — 참고 이미지 느낌에 더 가깝게 단축.

### 참고 이미지 재현 레시피
1. 이미지 업로드 → **"꽉 채우기"** 모드 선택 (또는 자유 배치에서 ⤢ 꽉 채우기 버튼)
2. 그라데이션 색상 `#F2E2CB`, 방향 "왼쪽", 페이드 범위 50% 근처

### 파일
- `src/app/main-visual/types.ts` — 기본 페이드 offset 62.5 → 50
- `src/app/main-visual/page.tsx` — 그라데이션 UI 확장 (방향 프리셋, 각도·페이드 범위 슬라이더)

---

# 변경 내역 (v11 - 포토샵식 블러 브러시)

## 🖌️ 블러 브러시 — 원하는 영역에만 블러 칠하기

### 작동 방식
1. 사용자가 "블러 브러시" 버튼 클릭 → 브러시 모드 진입 (이미지 테두리가 분홍색으로 변경)
2. 이미지 위에서 마우스 드래그 → 내부 canvas(1024×1024, 고정)에 흰색으로 페인팅
3. 이 canvas를 dataURL(PNG)로 변환해 `transform.blurMask` 에 저장
4. 렌더 시 **이중 레이어 구조**:
   - 레이어 1 (아래): 원본 이미지 — 항상 선명
   - 레이어 2 (위) : 블러된 이미지 + CSS `mask-image: url(blurMask)` — 칠한 영역만 보임
5. 결과: 칠한 부분은 블러, 나머지는 원본

### 타입 확장
```ts
export interface ImageTransform {
  ...,
  blur?: number;       // 기존 (블러 강도)
  blurMask?: string;   // 신규 (PNG dataURL). 없으면 이미지 전체 blur.
}
```

### 기능 세부
- **브러시 크기 슬라이더** (10~200px, 화면 px 기준 — 캔버스 scale 보정해서 일관된 감각)
- **지우개 모드** 토글 (`globalCompositeOperation = 'destination-out'`)
- **전체 지우기** 버튼 (blurMask 를 undefined 로 → 마스크 제거)
- **브러시 모드 자동 blur 보정**: 브러시 켤 때 `blur=0` 이면 자동으로 8px 로 설정 (효과가 안 보이는 혼란 방지)
- **브러시 모드 중에는 드래그/리사이즈 비활성** (cursor `crosshair`, 핸들 숨김)
- **빠른 정렬 버튼(중앙 / 꽉 채우기)**도 브러시 모드 중에는 비활성화

### 성능 최적화
- 페인팅 중 `canvas.toDataURL()` 호출은 `requestAnimationFrame` 으로 throttle → 60fps 대상 페인팅에서도 부드러움
- state 업데이트는 **mouseup 시점 한 번만** `transform.blurMask` 에 기록 → Undo 스택에 stroke 단위로 쌓임 (한 번의 붓질 = 한 번의 Undo)
- 실시간 화면 프리뷰는 DraggableImage 의 로컬 state(`maskUrl`)로 처리 → 전체 트리 리렌더 없음

### 없으면 구 동작 유지 (하위 호환)
- `blurMask === undefined` + `blur > 0`  → 전체 이미지 블러 (v10 동작)
- `blurMask` 가 있으면 → **칠한 영역만** 블러
  - 전체 지우기 누르면 다시 전체 블러로 돌아감

### ⚠ 저장/다운로드 시 유의
html2canvas 의 CSS `mask-image` 지원 여부가 브라우저/버전에 따라 다릅니다. 캡처된 PNG 에 마스크가 반영 안 되면 합성 canvas 로 미리 구워내는 경로를 추가해야 할 수 있어요. 저장 결과 확인 후 필요 시 대응하겠습니다.

### 파일
- `src/app/main-visual/types.ts` — `ImageTransform.blurMask` 필드 추가
- `src/components/DraggableImage.tsx` — 재작성. 브러시 페인팅 + 이중 레이어 렌더 + 지우개/클리어.
- `src/components/MainVisualCanvas.tsx` — `brushMode`, `brushSize`, `brushErase` prop 추가
- `src/app/main-visual/page.tsx` — 브러시 state·UI·캡처 캔버스 이중 레이어 렌더

---

# 변경 내역 (v10 - 이미지 블러 처리로 배경과 자연스럽게 섞기)

## 🌫️ 이미지 가장자리 블러 — 그라데이션과의 경계 완화

### 문제
참고 이미지(현재 스크린샷)에서 이미지 영역과 그라데이션 영역의 경계가 너무 선명해서 콜라주처럼 "붙인 느낌"이 남음.

### 해결 — `filter: blur(${blur}px)` 옵션 추가
이미지에 CSS blur 필터를 적용해서 가장자리가 배경(그라데이션·bgColor)과 부드럽게 섞이게 함. 블러 양이 클수록 이미지 경계가 퍼지면서 자연스러운 합성 효과.

### 타입 확장
```ts
// types.ts
export interface ImageTransform {
  x: number;
  y: number;
  width: number;
  aspect: number;
  blur?: number;  // 0~20px 권장, 기본 0 (선명)
}
```

### UI
자유 배치 모드 컨트롤에 슬라이더 추가:
```
흐림(블러) [0]px ─────────── [20]
                           ↑
                      드래그해서 조정
```
라벨: *"배경과 자연스럽게 섞기"*
기본값 0 → 사용자가 필요할 때 올리는 방식 (업로드 직후 이미지가 뿌옇게 나와서 "왜 이래" 하는 혼란 방지)

### 적용 범위
편집 캔버스(`DraggableImage`) + 숨겨진 캡처 캔버스 양쪽 모두 `filter: blur(...)` 적용 → **다운로드/업로드된 PNG 파일에도 블러 효과 반영**.

### 추천값
- 1~3px: 거의 티 안 나지만 경계가 살짝 부드러워짐
- 4~8px: 확실히 배경과 어울리는 느낌
- 10+px: 강한 블러 (피사계 심도 효과)

---

# 변경 내역 (v9 - 키보드 단축키 + 좌상단 리사이즈 핸들)

## ⌨️ 키보드 단축키 정리

| 키 | 동작 | 주의 |
|---|---|---|
| **Esc** | 선택 해제 (텍스트·이미지) | input 안에서도 blur + 해제 |
| **Enter** | input/textarea 편집 확정 후 blur + 선택 해제 | 줄바꿈은 `Shift+Enter` |
| **Delete** | 선택된 텍스트/이미지 삭제 | input 안에서는 기본 글자 삭제 동작 존중 |
| **Ctrl+Z** / **⌘+Z** | 실행 취소 (기존) | — |
| **Ctrl+Shift+Z** / **Ctrl+Y** | 다시 실행 (기존) | — |

### DraggableText 로컬 Del/Backspace 핸들러 제거
전역 리스너로 일원화. `Backspace` 로 실수 삭제되던 현상 제거.
`tabIndex`, `onKeyDown` 속성 삭제.

## 🎯 이미지 리사이즈 — 좌상단 핸들 추가

### 문제
기존에는 우하단 핸들 하나뿐 → 좌상단 고정 상태로만 크기 조정 가능.

### 해결
**좌상단 핸들 추가** — 우하단을 고정한 상태로 좌상단을 잡아당겨 크기 조절.
- aspect 유지 (가로폭 변화량에 비례해 세로/좌표도 자동 조정)
- 최소 40px 폭 clamp
- 리사이즈 로직 (`resize-tl` 분기):
  ```
  newW = startW - dx
  actualDx = startW - newW     (clamp 반영된 실제 감소량)
  newX = startX + actualDx
  newY = startY + actualDx / aspect
  ```
  → 우하단 좌표 `(x+width, y+height)` 가 리사이즈 내내 고정.

핸들 스타일은 공통 `handleStyle('tl' | 'br')` 로 생성.
크기 레이블은 좌상단 핸들을 피해 `left: 22` 로 이동.

---

# 변경 내역 (v8 - 그라데이션 페이드 복구 + 이미지 위 오버레이)

## 🎨 그라데이션을 참고 디자인처럼 "페이드" 구조로 되돌림

### 문제
v6에서 "화면 전체 균일 솔리드"로 바꾼 이후, 참고 이미지(2,3)의 느낌
(텍스트 영역 = 베이지 진하게 / 이미지 영역 = 투명해서 사진 보임)이 사라짐.

### 해결

**1) 그라데이션 스톱 = 한쪽 불투명 → 반대쪽 투명** 으로 복구
```ts
// types.ts
stops: [
  { color: '#F2E2CB', opacity: 1, offset: 0     },
  { color: '#F2E2CB', opacity: 0, offset: 62.5  },
]
```

**2) 캔버스 바탕색은 `#ffffff`** 로 변경 (이전엔 `#F2E2CB`)
→ 이미지 없을 때 베이지가 한쪽에서 흰색으로 페이드되는 효과 보임.

**3) 그라데이션은 이미지 위에 오버레이** (`zIndex: 1`)
```
레이어 (아래 → 위):
  bgColor (바탕)
  bgImage (cover/free)
  그라데이션 오버레이  ← 이제 이미지 위
  텍스트/버튼 (zIndex: 2~)
```
→ 참고 디자인처럼 "베이지가 이미지 위에 페이드되어 텍스트 가독성 확보".

**4) UI 라벨 "배경 색상" → "그라데이션 색상"**
색상 피커는 그라데이션 스톱의 `color` 만 동기화 (opacity·offset 유지)
→ 여전히 "색상 한 개만 제어". 각도·페이드 곡선은 숨김.

### 파일
- `src/app/main-visual/types.ts` — 스톱 opacity 1→0 복구, bgColor `#ffffff`
- `src/components/MainVisualCanvas.tsx` — 그라데이션 렌더 순서 재배치 (이미지 위 zIndex 1)
- `src/components/DraggableText.tsx` — 미리보기 모드 텍스트 zIndex 1→2 (그라데이션 위로)
- `src/app/main-visual/page.tsx` — 캡처 캔버스 렌더 순서 동기화, 색상 피커 로직 수정

---

# 변경 내역 (v7 - Undo/Redo + 요기보 맥스 버튼 auto-width)

## ↶ Undo / Redo

### 키보드 단축키
- **Ctrl+Z** / **⌘+Z** — 실행 취소
- **Ctrl+Shift+Z** / **⌘+Shift+Z** / **Ctrl+Y** — 다시 실행
- `<input>`·`<textarea>` 안에서는 브라우저 기본 텍스트 undo 를 방해하지 않음

### 헤더 UI 버튼
`↶` / `↷` 세그먼트 버튼. 빈 스택일 때 자동 회색 처리.

### 내부 구조 — History Envelope
```ts
interface HistoryEnvelope {
  past:    MainVisualState[];   // 이전 스냅샷 스택 (최대 100)
  present: MainVisualState;     // 현재 상태
  future:  MainVisualState[];   // redo 스택
}
```
기존 `const [state, setState] = useState(...)` 시그니처는 그대로 노출 —
모든 하위 핸들러(`updateCurrent`, `updateTexts`, ...)는 수정 없이 동작.

### 🎯 Drag Coalescing (300ms)
이미지·텍스트 드래그 중 매 mousemove마다 스냅샷이 쌓이면 Ctrl+Z 수백 번 눌러야
원위치 → 대신 **마지막 변경으로부터 300ms 내의 연속 setState 는 하나의 스냅샷으로 묶음**.
결과: 드래그 한 번 = Undo 한 번으로 원위치.

## 🎯 요기보 맥스 버튼 — width 고정 제거

### 문제
`width: 220` 으로 고정되어 있어서 텍스트를 길게 바꾸면 줄바꿈/잘림.

### 해결 — padding 기반 auto-grow
Figma 스펙에 맞춰 pill 버튼 padding을 `'10px 28px'` → `'8.5px 34.13px'` 로 조정.
`width` 속성 제거 → 버튼 너비는 콘텐츠(텍스트 길이)에 따라 자동 확장.

```ts
// types.ts — 웹/모바일 둘 다
{ isPill: true, width: 220 }  →  { isPill: true }
```

```tsx
// DraggableText.tsx & page.tsx 캡처 캔버스 양쪽
padding: style.isPill ? '8.5px 34.13px' : '0'
```

"요기보 맥스 →" → "더 길게 쓰는 CTA 텍스트 →" 로 바꿔도 버튼이 자연스럽게 늘어남.

---

# 변경 내역 (v6 - 배경 그라데이션 → 단일 색상으로 단순화)

## 🎨 배경 UI 단순화

### 문제
기존 그라데이션 UI가 복잡했음 — 각도 슬라이더, 각도 프리셋, 스톱별 색/투명도/오프셋, 스톱 추가/삭제. 또한 기본값이 `#F2E2CB` → 투명(0%)으로 되어 있어서 화면 한쪽만 색이 깔리고 나머지는 하얗게 비치는 문제.

### 해결 — "배경 색상" 하나로 일원화
그라데이션 인프라는 유지하되, **양쪽 스톱을 같은 색 + 완전 불투명**으로 고정해서 시각적으로 캔버스 전체에 균일한 솔리드 색이 깔리게 함. UI는 색상 피커 하나만 노출.

- 제거된 UI: 각도 슬라이더, 0/90/180/270° 프리셋, 스톱 색/투명도/오프셋 편집, 스톱 추가/삭제 버튼, 체크박스 토글, 미리보기 바
- 유지된 UI: 색상 피커 1개
- 색상 피커 변경 시 → `bgColor` + 양쪽 그라데이션 스톱 색을 동시에 동기화

### 기본값 변경 (`types.ts`)
```ts
// BEFORE — 왼쪽만 색, 오른쪽은 투명
stops: [
  { color: '#F2E2CB', opacity: 1, offset: 10.73 },
  { color: '#F2E2CB', opacity: 0, offset: 50.6  },
]

// AFTER — 캔버스 전체 균일
stops: [
  { color: '#F2E2CB', opacity: 1, offset: 0   },
  { color: '#F2E2CB', opacity: 1, offset: 100 },
]
```

### 수정 파일
- `src/app/main-visual/types.ts` — 두 디바이스 기본 그라데이션 스톱을 solid 로
- `src/app/main-visual/page.tsx` — 복잡한 그라데이션 블록(≈250줄) 제거, 단일 색상 피커로 교체

**주의**: 내부 데이터 구조(`CanvasGradient`, `GradientStop`)는 그대로 유지 → 기존 저장 데이터와 호환.

---

# 변경 내역 (v5 - 이미지 자유 배치 모드 부활)

## 🖼 이미지 업로드 방식 대폭 개선

### 문제
cover 모드로만 작동 → 어떤 이미지를 업로드해도 캔버스(1920×680 / 800×907)
비율에 맞춰 강제 크롭. 사용자가 이미지 위치·크기를 조절할 수 없음.

### 해결 — "자유 배치(free)" 모드 기본 적용
업로드 시 **원본 크기 그대로** 캔버스 중앙에 배치되고, 사용자가 직접 이동·리사이즈.

- **이미지 드래그**: 캔버스 위 이미지를 잡아서 이동
- **우하단 리사이즈 핸들**: 파란 정사각형 핸들을 잡고 드래그 → 가로폭 조정 (세로는 원본 비율 자동 유지)
- **우측 패널 컨트롤**:
  - X / Y 입력 (정밀 좌표)
  - 폭 슬라이더 (높이 자동 계산)
  - ⇋ 중앙 정렬 / ⤢ 꽉 채우기 빠른 정렬
- **cover 모드 토글**: 기존처럼 캔버스 꽉 채우고 싶을 때 한 번 클릭

### 업로드 로직
- 원본이 캔버스의 80%를 초과하면 비율 유지하며 축소 (UX 보정)
- 이하는 원본 그대로
- 위치는 캔버스 중앙
- 업로드 직후 자동으로 이미지 선택 상태 → 핸들 바로 보임

### 새 파일
- `src/components/DraggableImage.tsx` — 드래그 이동 + 우하단 핸들 리사이즈,
  캡처 모드(`isPreview`)에서는 테두리·핸들 숨김

### 타입 변경 (`main-visual/types.ts`)
```ts
+ export interface ImageTransform {
+   x: number;
+   y: number;
+   width: number;   // 높이는 aspect 로 계산
+   aspect: number;  // naturalWidth / naturalHeight
+ }

  interface MainVisualCanvas {
+   imageMode?: 'cover' | 'free';   // default 'free'
+   imageTransform?: ImageTransform;
  }
```

### 수정
- `src/components/MainVisualCanvas.tsx` — imageMode 분기, free 일 때 DraggableImage,
  이미지 있을 때 그라데이션 오버레이 자동 숨김
- `src/app/main-visual/page.tsx`
  - `handleBgUpload`: 원본 자연 크기 읽어서 free 모드로 세팅
  - `handleImageTransformChange`, `handleToggleImageMode`, `handleCenterImage`, `handleFitImage`
  - 우측 패널: 배치 모드 토글 + X/Y/폭 + 빠른 정렬 버튼
  - 숨겨진 캡처 캔버스: cover / free 분기 렌더

### 저장(FTP/DB) 페이로드
기존 구조 유지. `imageMode`, `imageTransform`는 `sections[0].web/mobile` 에
그대로 포함되어 저장 → 불러오기 시 그대로 복원되도록 추후 확장 가능.

---

# 변경 내역 (v4 - 자사몰 비주얼 리브랜딩 + 그라데이션 + 요기보 가이드)

## 🏷 리브랜딩: "메인비주얼" → "자사몰 비주얼"

사용자 노출 문자열 전수 변경. 라우트(`/main-visual`), 내부 식별자(`eventType: 'banner'`, 
`mainVisualPair`)는 기존 데이터 호환성을 위해 유지.

**영향 파일**
- `src/app/page.tsx` — 헤더 버튼, MetricCard, QuickAction, 세그먼트 탭,
  빈 상태 메시지, 썸네일 뱃지
- `src/app/main-visual/page.tsx` — 헤더 제목

## 🎨 자사몰 비주얼 기본 가이드 전면 재구성

### 배경
- 기존: 배경 이미지만 지원
- 신규: **선형 그라데이션 오버레이** 추가. 이미지 없을 때 표시.
  - 기본값: `#F2E2CB` → `#F2E2CB(투명)`
  - 웹: 90° (좌→우), 모바일: 0° (위→아래) = Figma Rotation -90° 재현
  - 각도 슬라이더 + 0/90/180/270° 프리셋
  - 스톱별 색상·투명도·오프셋 편집
  - 스톱 추가/삭제 (최소 2개 유지)

### 텍스트 가이드 (최초 접근 시 배치)
- **글로벌 NO.1 베스트 셀러** — Pretendard Bold 45px, lh 100px, ls -2%, `#252525`
- **YOGIBO MAX** — Pretendard ExtraBold 90px, lh 100px, ls -2%, `#FFFFFF`,
  Drop shadow `0 2px 10px #BCB29B`
- **5초에 1개씩 판매되는 빈백 소파** — Pretendard Regular 28px, lh 40px, ls -3%, `#252525`
- **요기보 맥스 →** — Pretendard SemiBold, pill 220, 연한 하늘색 `#8FCAD8`
  - **웹**: fontSize 28, `x=388, y=434` — "5초에 1개씩..." 박스 하단(y=393)
    + `margin-top: 41px` 기준
  - **모바일**: fontSize 26, `x=290, y=761` — 캔버스 하단(907)에서 버튼 하단까지
    100px 여백 (`907 − 100 − 약 46(버튼 실높이) = 761`)

폰트 전체 Pretendard 통일 (요구사항). 텍스트 간 margin-top ≈ 24px 적용.

### 이미지 가이드
- 기본 가이드에서는 **비어있음** (사용자가 직접 업로드)
- 업로드 시 그라데이션은 자동으로 가려짐

## 🧩 TextStyle 확장 (builder/types.ts)

```ts
+ fontFamily?: string      // CSS font-family
+ textShadow?: string      // CSS text-shadow (드롭쉐도우 등)
```

`lineHeight` 해석 규칙:
- `< 4` : CSS 배수 (e.g. 1.2)
- `>= 4`: 절대 픽셀 (e.g. 100 → `100px`)

DraggableText, 숨겨진 캡처 캔버스 양쪽에 동일 로직 적용.

## 📂 변경 파일

### 수정
- `src/app/builder/types.ts` — TextStyle에 fontFamily, textShadow 추가
- `src/app/main-visual/types.ts` — CanvasGradient 타입, 유틸 (`gradientStopsToCss`,
  `hexToRgba`), 기본 가이드 재작성
- `src/components/DraggableText.tsx` — fontFamily·textShadow·lineHeight 분기
- `src/components/MainVisualCanvas.tsx` — 그라데이션 오버레이 렌더
- `src/app/main-visual/page.tsx` — 그라데이션 편집 UI, 캡처 캔버스 업데이트
- `src/app/page.tsx` — 리브랜딩

---



## 🐛 버그 수정

### 1. DB 저장이 안 되던 문제
**원인**: `EventPage` Mongoose 스키마에 `eventType` 필드가 정의되어 있지 않아서
Mongoose strict 모드(기본값)가 **정의되지 않은 필드를 조용히 무시**하고 있었습니다.

**수정**:
- `src/models/EventPage.ts` — `eventType` 필드 추가 (`'event' | 'banner'`, default `'event'`, index)
- `src/app/api/events/[id]/route.ts` — PUT에서도 `eventType` 업데이트 지원
- HMR 대응: 캐시된 모델이 있으면 지우고 다시 등록 (개발 서버 재시작 없이 반영)

### 2. 저장 실패가 조용히 숨겨지던 문제
**원인**: FTP·DB 호출이 실패해도 `console.error`만 찍고 사용자에게 알리지 않음.

**수정**:
- FTP / DB 각 단계 실패를 명시적으로 추적
- 부분 성공·완전 성공·실패 케이스별로 구체적인 메시지 표시
- DB 저장이 실패하면 미리보기 모달이 닫히지 않음

---

## 🖼 이미지 처리 방식: cover 모드로 확정

사용자 선택에 따라 **cover 모드**로 단순화했습니다.

- 업로드한 이미지는 **원본 비율을 유지하면서 캔버스를 꽉 채우도록 자동 크롭**
- 캔버스(1920×680 또는 800×907) 비율과 안 맞는 이미지는 가장자리가 잘립니다
- 이미지 위치/크기 조절 UI 제거 → **훨씬 단순한 사용 흐름**
- 우측 패널에 "캔버스를 꽉 채우도록 비율 맞춰 크롭됩니다" 안내 문구 포함
- 원하는 구도를 얻으려면 **업로드 전에 이미지를 해당 비율로 잘라 준비**하시면 됩니다

### 권장 원본 비율
- 웹 배너: **1920 × 680** (가로 2.82 : 세로 1)
- 모바일 배너: **800 × 907** (가로 0.88 : 세로 1)

---

## 🎨 홈 페이지 전면 개편

- **Sticky 글래스 헤더** — 로고 배지 + 퀵 액션 버튼
- **메트릭 카드 4개** — 전체 / 이벤트 페이지 / 메인비주얼 / 최근 7일
- **퀵 액션 카드 2개** — 주요 기능 바로가기
- **pill 세그먼트 탭** + **실시간 검색창**
- **썸네일 카드 그리드** — aspect-ratio 일관, hover 인터랙션
- **스켈레톤 로더**, **빈 상태**, **토스트 알림**
- 절제된 모노톤 베이스 + 포인트 컬러

---

## 📂 변경된 파일

### 삭제
- `src/components/DraggableImage.tsx` — cover 모드로 전환되어 더 이상 필요 없음

### 새 파일 (없음 — 기존 파일 수정만)

### 수정된 파일
- `src/models/EventPage.ts` — `eventType` 필드 추가
- `src/app/api/events/[id]/route.ts` — PUT에서 `eventType` 지원
- `src/app/main-visual/types.ts` — `ImageTransform` 관련 삭제 (단순화)
- `src/components/MainVisualCanvas.tsx` — `object-fit: cover` 직접 사용
- `src/app/main-visual/page.tsx` — 이미지 드래그/리사이즈 관련 로직 제거
- `src/app/page.tsx` — 대시보드형 홈 UI

---

## 💡 사용 가이드

### 메인비주얼 제작 워크플로우
1. 이미지 업로드 → 캔버스에 cover로 자동 배치
2. 필요하면 텍스트 추가·편집
3. 웹 탭 / 모바일 탭 각각 작업
4. "미리보기 후 저장" → 모달에서 최종 확인
5. "확정"하면: 로컬 다운로드 + FTP 업로드 + DB 기록이 한 번에 진행됨
6. 결과 URL이 클립보드에 자동 복사됨

### DB 저장 검증
- 저장하면 Mongo의 `design` 컬렉션에 `eventType: 'banner'`로 기록됩니다
- 홈의 "메인비주얼" 탭에서 즉시 확인 가능
- 저장이 실패하면 FTP / DB 중 어떤 단계가 실패했는지 알림이 뜹니다

### 기존 데이터 마이그레이션
기존 배너 데이터를 "메인비주얼" 탭으로 이동시키려면 MongoDB에서 한 번:
```js
db.design.updateMany(
  { "sections.type": "mainVisualPair" },
  { $set: { eventType: "banner" } }
)
```

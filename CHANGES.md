# 변경 내역 (v3 - cover 모드 확정 + 저장 문제 수정 + 홈 개편)

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

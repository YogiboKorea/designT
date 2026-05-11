# event-ai-pack v4.2 — 캠페인 UI 수정 + 레퍼런스 FTP 업로드

## 변경 요약

### 1. 캠페인 유형 선택 — 시각 강조 명확화

```
[Before]
선택된 카드: 보라색 테두리 (#7c3aed)
   → 다른 보라색 요소들과 헷갈림
   → 어느 카드가 선택됐는지 불분명

[After]
선택된 카드:
  ✓ 빨간 테두리 (#dc2626) + 두께 3px
  ✓ 살짝 확대 (scale 1.02)
  ✓ 그림자 강조
  ✓ 우상단 "✓ 선택됨" 빨간 뱃지
  ✓ 카드 좌상단 ① ② ③ ④ ⑤ 번호
```

### 2. 레퍼런스 등록 — FTP 업로드 + 카테고리

기존 등록 방식을 사진 업로드 → FTP 자동 저장 방식으로 표준화:

```
[등록 흐름]
1. /references 페이지 진입
2. ➕ 새 레퍼런스 추가
3. 입력:
   - 이미지 파일 (PC 에서 선택)
   - 제목 (자동 추측: 파일명)
   - 카테고리 (web-banner / sns / sns-story / mobile / thumbnail)
   - 플랫폼 (선택: instagram / kakao 등)
   - 태그 (쉼표 구분)
   - 시각 메모 (AI 프롬프트 보충)
4. ✓ 등록 클릭
   → /api/ftp 업로드 → /api/references 등록
5. 갤러리에 표시
```

### 3. 카테고리 시스템 도입 (v4.3 준비)

레퍼런스에 카테고리/플랫폼 필드 추가:

| 카테고리 | 용도 |
|---------|-----|
| `web-banner` | 자사몰/스마트스토어 가로형 배너 |
| `sns` | 인스타 정사각, 카카오톡 등 SNS |
| `sns-story` | 인스타 스토리/릴스 (세로형) |
| `mobile` | 모바일 메인 / 히어로 |
| `thumbnail` | 작은 썸네일, 상품 카드 |

| 플랫폼 (선택) | |
|------|-----|
| `instagram` | 인스타 피드 |
| `instagram-story` | 인스타 스토리/릴스 |
| `facebook`, `kakao`, `naver-blog`, `youtube`, `cafe24`, `smart-store` | 각 플랫폼 |

→ v4.3 에서 빌더 사이즈 선택 시 자동 필터링에 사용됨.

## 패키지 파일 (5개)

```
src/models/ReferenceImage.ts             🆕 레퍼런스 모델 (카테고리 포함)
src/app/api/references/route.ts          🆕 GET/POST API
src/app/api/references/[id]/route.ts     🆕 단일 GET/PATCH/DELETE
src/app/references/page.tsx              🆕 관리 페이지 (FTP 업로드 폼)
src/app/prompt-builder/page.tsx          🔁 캠페인 카드 시각 강조 강화
```

## 적용 방법

```powershell
cd "C:\Users\Yogibo Design\Desktop\eventTemp"

# 캐시 정리
taskkill /F /IM node.exe
Remove-Item .next -Recurse -Force

# 적용
Expand-Archive event-ai-pack-v4.2.zip -DestinationPath .
Copy-Item -Path event-ai-pack-v4.2\src\* -Destination src\ -Recurse -Force

npm run dev
```

## ⚠️ 기존 데이터와 호환성

### 기존 ReferenceImage 데이터가 있는 경우

이미 DB 에 레퍼런스가 등록되어 있다면, **`category` 필드가 없는 옛 문서**가 있을 수 있습니다.

해결:
- 모델 schema 의 default 가 `'web-banner'` 라서 새로 읽을 때 자동으로 `web-banner` 로 처리됨
- 그러나 기존 데이터는 DB 에 `category` 필드가 빈 채로 남아있을 수 있음

기존 데이터 일괄 업데이트하고 싶으면 (선택):

```javascript
// MongoDB shell 또는 Compass 에서 한 번 실행
db.referenceimages.updateMany(
  { category: { $exists: false } },
  { $set: { category: 'web-banner', platform: null } }
);
```

또는 그냥 두면 시간 지나면서 자연스럽게 카테고리 부여됨 (다음에 PATCH 할 때).

### /api/ftp 엔드포인트 확인

레퍼런스 등록 시 `/api/ftp` 를 호출합니다. 이 라우트가:
- 이미 존재하면 → 그대로 사용 ✓
- 없으면 → 별도 작업 필요

확인:
```powershell
dir src\app\api\ftp\
```

`route.ts` 가 있으면 OK. 응답 형식이 `{success: true, imageUrl: '...'}` 이어야 함.

다른 형식이라면 `src/app/references/page.tsx` 의 113번 라인 부근에서 응답 파싱 부분만 조정:

```tsx
// 현재 가정
const ftpJson = await ftpRes.json();
if (!ftpRes.ok || !ftpJson.success || !ftpJson.imageUrl) {
  throw new Error(ftpJson.message || 'FTP 업로드 실패');
}

// 만약 응답이 다르면 (예: { url: ... } 형태) 다음과 같이 변경:
if (!ftpRes.ok || !ftpJson.url) {
  throw new Error(ftpJson.message || 'FTP 업로드 실패');
}
const imageUrl = ftpJson.url;  // 또는 ftpJson.imageUrl
```

## 검증 흐름

### 검증 ① 캠페인 유형 선택
```
1. /prompt-builder 진입
2. ① 캠페인 유형 섹션 확인:
   ✓ 카드 좌상단에 ① ② ③ ④ ⑤ 번호 표시
   ✓ 첫 번째 카드(시즌 세일)가 default 선택 상태
   ✓ 빨간 테두리 + "✓ 선택됨" 뱃지

3. 다른 카드 클릭:
   ✓ 클릭한 카드만 빨간 강조
   ✓ 다른 카드는 회색 테두리
   ✓ ② 세부 정보 영역이 클릭한 양식 필드로 바뀜
```

### 검증 ② 레퍼런스 등록
```
1. /references 진입
   ✓ 빈 갤러리 (또는 기존 데이터)
   ✓ 우상단 "➕ 새 레퍼런스 추가" 버튼

2. 추가 버튼 클릭:
   ✓ 등록 폼 표시
   ✓ 파일 선택, 제목, 카테고리, 플랫폼, 태그, 시각 메모 필드

3. 이미지 업로드 + 저장:
   ✓ 미리보기 표시
   ✓ "✓ 등록" 클릭
   ✓ "업로드 중..." 표시
   ✓ 등록 완료 → 폼 닫힘 → 갤러리에 카드 표시

4. 카테고리 필터 동작:
   ✓ 상단 chip 클릭 시 해당 카테고리만 표시
   ✓ 각 chip 옆에 (개수) 표시

5. 삭제 버튼:
   ✓ 카드 우상단 ✕ 클릭 → 확인 → 목록에서 사라짐 (DB 는 active=false)
```

## 트러블슈팅

| 증상 | 원인 | 해결 |
|------|------|------|
| 캠페인 카드 강조 안 보임 | 캐시 | dev 재시작 + .next 삭제 |
| 레퍼런스 등록 시 "FTP 업로드 실패" | /api/ftp 응답 형식 다름 | page.tsx 113 라인 응답 파싱 조정 |
| 등록 후 갤러리에 안 보임 | DB 연결 실패 또는 새로고침 필요 | F12 콘솔 확인, 페이지 새로고침 |
| 기존 레퍼런스가 카테고리 필터에 안 잡힘 | 기존 데이터에 category 없음 | MongoDB 일괄 업데이트 (위 안내 참고) |
| 이미지 미리보기 엑박 | CORS 문제 | v4.0/v4.1 적용됐는지 확인 (SafeImage 사용 중) |

## 다음 — v4.3 예고

이번 v4.2 적용 후 SNS 레퍼런스 5~10개 등록하면 v4.3 에서:

```
[v4.3 작업]
✓ ASPECT_RATIOS 에 SNS 사이즈 추가 (인스타 정사각, 스토리 등)
✓ 사이즈 선택 시 → 매칭되는 카테고리 레퍼런스 자동 필터링
✓ 사이즈별 디자인 코드 시스템 프롬프트 (SNS 정사각/세로 / 웹 배너 등)
✓ 빌더 UI 에 "🔍 자동 필터링됨: SNS" 안내
```

## 정리

```
v4.2 → 인프라 정비
  - 캠페인 선택 UI 명확화
  - 레퍼런스 = FTP 업로드 + 카테고리 분류
  - 데이터 모델 통일

v4.3 → SNS 통합 (다음)
  - 사이즈 ↔ 레퍼런스 자동 매칭
  - 사이즈별 디자인 코드
  - SNS 전용 프롬프트 룰
```

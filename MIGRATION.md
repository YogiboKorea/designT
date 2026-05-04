# event-ai-pack v3.1 — AI 자동 디자인 제거 + 프롬프트 빌더 진입점 통합

## 변경 개요

기존 빌더 우측 패널의 **AIComposeForm**을 제거하고,
대신 **프롬프트 빌더로 가는 진입 카드**를 표시합니다.

### Before (v3까지)
```
빌더 우측 패널
└─ 🤖 AI 자동 디자인 폼
    ├─ 대표 텍스트
    ├─ 할인율
    └─ ✨ AI 디자인 생성 → 캔버스 자동 적용

[문제점]
- 결과물 품질 낮음 (텍스트 위치 겹침 등)
- 배경 이미지 자동 생성 안 됨
- 사용성 떨어짐
```

### After (v3.1)
```
빌더 우측 패널
└─ 🪄 AI 이미지 만들기 (간결 카드)
    ├─ 안내 문구
    └─ 🚀 프롬프트 빌더 열기 (새 탭)
            ↓
    /prompt-builder 페이지
        ├─ 5개 캠페인 양식
        ├─ 레퍼런스 선택
        ├─ 도구 선택 (ChatGPT/Midjourney/...)
        └─ ✨ 정교화된 프롬프트 생성
                ↓
            ChatGPT/Midjourney 등에 붙여넣어 실제 이미지 생성
                ↓
            빌더로 돌아와 이미지 업로드 + 텍스트 수동 배치
```

## 파일 변경 사항

### 신규/교체 (2개)
```
src/components/PromptBuilderLink.tsx        🆕 빌더 진입 카드
src/components/PropertiesPanel.tsx          🔁 AIComposeForm → PromptBuilderLink
```

### 삭제 권장 (선택)
다음 파일들은 더 이상 사용되지 않습니다. 삭제해도 되고 그대로 둬도 됩니다 (그대로 두면 죽은 코드로 남음):

```
src/components/AIComposeForm.tsx            ❌ 미사용 (수동 삭제 권장)
src/app/api/ai-compose/route.ts             ❌ 미사용 (수동 삭제 권장)
```

DB 모델/레퍼런스 관련 파일은 **계속 사용**됩니다 (프롬프트 빌더의 갤러리 선택 기능에 필요):
- `src/models/ReferenceImage.ts` ✅ 유지
- `src/models/EventPage.ts` ✅ 유지
- `src/lib/ai-vision.ts` ✅ 유지 (analyze-references.mjs 가 사용)
- `src/app/api/references/*` ✅ 유지

## 적용 방법

### 1. 압축 풀고 덮어쓰기
```bash
unzip event-ai-pack-v3.1.zip
cd event-ai-pack-v3.1
cp -r src/* /path/to/eventTemp/src/
```

이러면:
- `PromptBuilderLink.tsx` 새로 추가
- `PropertiesPanel.tsx` 패치 버전으로 덮어쓰기

### 2. (선택) 죽은 파일 삭제
```bash
cd /path/to/eventTemp
rm src/components/AIComposeForm.tsx
rm src/app/api/ai-compose/route.ts
rmdir src/app/api/ai-compose
```

PowerShell:
```powershell
Remove-Item src\components\AIComposeForm.tsx
Remove-Item src\app\api\ai-compose -Recurse
```

### 3. dev 서버 재시작
```bash
npm run dev
```

## 검증

1. 빌더(`/builder`) 진입
2. 메인 비주얼 섹션 추가
3. 섹션 선택 → 우측 패널 상단 확인
4. 다음과 같이 보여야 함:
   ```
   ┌─────────────────────────────┐
   │ 🪄 AI 이미지 만들기          │
   │ 프롬프트 빌더에서 캠페인...   │
   │ 💡 메인 비주얼은 16:9 또는...│
   │ [🚀 프롬프트 빌더 열기 ↗]   │
   │ 지원 도구: ChatGPT · ...    │
   └─────────────────────────────┘
   ```
5. "🚀 프롬프트 빌더 열기" 클릭 → 새 탭에서 `/prompt-builder` 열림

## 작업 흐름 (전체)

```
┌─ 1. 빌더에서 새 페이지 시작 ──────┐
│  /builder 진입 → 섹션 추가       │
└────────────────────────────────┘
              ↓
┌─ 2. 우측 패널의 AI 카드 클릭 ────┐
│  🪄 AI 이미지 만들기            │
│  → 프롬프트 빌더 열기 (새 탭)    │
└────────────────────────────────┘
              ↓
┌─ 3. 프롬프트 빌더에서 양식 작성 ┐
│  /prompt-builder                │
│  ① 양식 (어버이날 등)           │
│  ② 세부 정보 (카피, 할인율)      │
│  ③ 레퍼런스 선택                │
│  ④ 타겟 도구 (ChatGPT 등)       │
│  ⑤ ✨ 프롬프트 생성             │
└────────────────────────────────┘
              ↓
┌─ 4. 외부 AI 도구로 이미지 생성 ─┐
│  📋 복사 → 🚀 ChatGPT 바로가기  │
│  → 이미지 생성 → 다운로드         │
└────────────────────────────────┘
              ↓
┌─ 5. 빌더 탭으로 돌아오기 ────────┐
│  생성된 이미지를 배경으로 업로드  │
│  텍스트 직접 추가 또는 템플릿 적용│
│  미세 조정 후 저장                │
└────────────────────────────────┘
```

## 트러블슈팅

| 증상 | 해결 |
|------|------|
| AI 자동 디자인이 그대로 보임 | dev 재시작 + .next 캐시 삭제 |
| "🪄 AI 이미지 만들기" 카드가 안 보임 | PropertiesPanel.tsx 덮어쓰기 확인 |
| 프롬프트 빌더 페이지가 404 | v3 패키지가 적용되어 있어야 함 |
| 새 탭이 안 열림 | 브라우저 팝업 차단 설정 확인 |

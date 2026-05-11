# event-ai-pack v2 패치 — Claude 전환

v1(Gemini 기반)에서 v2(Claude 기반)로 전환하는 패치입니다.

## 배경

- Gemini API 키가 유출 신고되어 403 PERMISSION_DENIED 에러 발생
- Anthropic Claude API 로 전환 (안정적, 더 일관된 JSON 출력)

## 변경 사항

### 교체되는 파일 (3개)
```
src/lib/ai-vision.ts                    # Gemini → Claude Haiku 4.5
src/app/api/ai-compose/route.ts         # Gemini → Claude Sonnet 4.6
scripts/analyze-references.mjs          # Gemini → Claude Haiku 4.5
```

### 변경되지 않는 파일
나머지 13개 파일은 그대로 유지 — `ai-vision.ts` 의 함수 시그니처가
완전히 동일하므로 호출하는 쪽은 코드 변경 없음.

## 적용 방법

### 1. 압축 풀고 덮어쓰기
```bash
unzip event-ai-pack-v2.zip
cp event-ai-pack-v2/src/lib/ai-vision.ts /path/to/eventTemp/src/lib/
cp event-ai-pack-v2/src/app/api/ai-compose/route.ts /path/to/eventTemp/src/app/api/ai-compose/
cp event-ai-pack-v2/scripts/analyze-references.mjs /path/to/eventTemp/scripts/
```

### 2. 환경변수 변경 (`.env.local`)

**제거 (또는 유지하되 무시됨)**:
```
GEMINI_API_KEY=...
```

**추가**:
```
ANTHROPIC_API_KEY=sk-ant-api03-...
```

> Anthropic Console (https://console.anthropic.com/) 에서 발급.
> API 키는 한 번만 표시되므로 안전한 곳에 저장.

**선택 — 모델 변경 시** (기본값으로 충분함):
```
CLAUDE_VISION_MODEL=claude-haiku-4-5      # 이미지 분석용 (기본)
CLAUDE_COMPOSE_MODEL=claude-sonnet-4-6    # 디자인 생성용 (기본)
```

### 3. 유출된 Gemini API 키 폐기
- Google AI Studio (https://aistudio.google.com/app/apikey)
- 해당 키를 Delete

### 4. dev 서버 재시작
```bash
npm run dev
```

## 비용 비교

월 100건 페이지 생성 + 100건 레퍼런스 분석 기준:

| 항목 | Gemini 무료티어 | Claude (현재) |
|------|----------------|---------------|
| 페이지 생성 (Sonnet 4.6) | $0 | ~$2.10 |
| 레퍼런스 분석 (Haiku 4.5) | $0 | ~$0.30 |
| **합계** | **$0** | **~$2.40** |

월 500건 규모로 늘어도 약 $12 (≈16,000원) 수준이라
유출/한도 걱정 없이 안정 운영 가능합니다.

## 모델 선택 로직

| 작업 | 추천 모델 | 이유 |
|------|----------|------|
| 이미지 → 디자인 토큰 추출 | Haiku 4.5 | 단순 추출이라 가장 저렴한 모델로 충분 |
| 레퍼런스 → SectionData 생성 | Sonnet 4.6 | 복잡한 JSON 구조 생성, 위치 평균 등 추론 필요 |

비용 더 줄이려면:
- `CLAUDE_COMPOSE_MODEL=claude-haiku-4-5` 로 변경 (월 $2 정도 절감, 품질 살짝 하락 가능)

품질 더 올리려면:
- `CLAUDE_VISION_MODEL=claude-sonnet-4-6` 로 변경 (월 $3 정도 추가)

## 검증

배포 후 다음 순서로 확인:

1. `/references/import` → URL 4개 + AI 분석 ON + 시뮬레이션 OFF → 실행
   - `ok: true, registered: 4, errorCount: 0` 이면 정상
   - 이전 403 에러가 해결됐는지 확인
2. `/references` → 4개 카드에 색상 팔레트가 보이면 분석 성공
3. 빌더 우측 패널 🤖 AI 자동 디자인 → 텍스트+할인율 → 생성
   - SectionData 가 캔버스에 즉시 적용되면 정상

## 트러블슈팅

| 에러 | 원인 | 해결 |
|------|------|------|
| `401 invalid_api_key` | 키 오타 또는 미설정 | `.env.local` 확인 후 dev 재시작 |
| `429 rate_limit_error` | RPM 한도 초과 | 배치 스크립트 간격 늘리기 |
| `529 overloaded_error` | Claude 일시 과부하 | 자동 재시도 후 그래도 실패하면 1~2분 대기 |
| `400 messages.0.content...` | 이미지 형식 오류 | webp/jpeg/png/gif 만 가능 — 코드에서 자동 보정 |

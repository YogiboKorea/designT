# Quick Start — 5분 내 첫 사용

## 1. 압축 풀고 적용 (1분)
```bash
unzip event-ai-pack-v2-full.zip
cd event-ai-pack-v2-full
cp -r src/* /path/to/eventTemp/src/
cp scripts/* /path/to/eventTemp/scripts/
```

## 2. .env.local 에 키 추가 (1분)
```bash
ANTHROPIC_API_KEY=sk-ant-api03-여기에키
```

## 3. dev 서버 재시작 (1분)
```bash
# Ctrl+C 후
npm run dev
```

## 4. 첫 레퍼런스 등록 (2분)

### A. 메인 화면에서 메뉴 확인
```
http://localhost:3000
```
헤더에 **📚 레퍼런스 / 📥 일괄 등록** 버튼이 보이면 적용 성공.

### B. 일괄 등록 페이지로 이동
"📥 일괄 등록" 클릭

### C. URL 1개로 첫 테스트
1. ③ **URL 목록 붙여넣기** 탭 선택
2. URL 입력:
   ```
   https://yogibo.kr/web/img/reference/jp/04_jp_01.webp
   ```
3. 기본 태그: `2024, japan, jp`
4. ☑ **AI 디자인 토큰 분석 함께 실행** (체크)
5. ☐ **시뮬레이션만 실행** (꼭 해제!)
6. 버튼이 "✅ 실행" 으로 바뀐 거 확인 → 클릭

### D. 결과 확인
약 5~10초 후:
```json
{
  "ok": true,
  "registered": 1,
  "errorCount": 0
}
```
→ 성공!

### E. 갤러리 확인
"📚 레퍼런스" 클릭 → 1개 카드에 색상 팔레트 표시되면 완료.

## 5. (선택) 빌더 통합
`INTEGRATION.md` 참고하여 PropertiesPanel.tsx 에 5줄 추가.

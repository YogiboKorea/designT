# 통합 완료 알림

이 패키지는 PropertiesPanel.tsx 통합까지 **이미 완료된 상태**로 제공됩니다.

`src/components/PropertiesPanel.tsx` 가 패치된 버전으로 포함되어 있어,
복사만 하면 빌더 우측 패널 최상단에 🤖 AI 자동 디자인 폼이 자동 표시됩니다.

## 변경된 부분 (참고용 — 직접 수정할 필요 없음)

### 1. import 추가 (8행)
```tsx
import AIComposeForm from './AIComposeForm';
```

### 2. props-header 다음에 폼 삽입 (1549~1559행)
```tsx
<div className="props-header">
  <h2>...</h2>
</div>
<AIComposeForm
  sectionType={activeSection.type}
  onApply={(generatedSection) => {
    onUpdate({
      ...generatedSection,
      id: activeSection.id,
    } as SectionData);
  }}
/>
{activeSection.type === 'main' && ...}
```

총 변경: 11줄 추가, 기존 코드 0줄 수정.

## 사용 방법

1. 빌더 진입 (`/builder`)
2. 섹션 추가 (메인 비주얼/쿠폰/상품)
3. 섹션 클릭 → 우측 속성 패널 최상단에 🤖 AI 자동 디자인 폼
4. ▸ 클릭하여 펼치기
5. 대표 텍스트 + 할인율 입력
6. ✨ AI 디자인 생성 클릭
7. 1~3초 후 활성 섹션 자동 교체 (Claude Sonnet 4.6 처리)
8. 미세 조정 후 저장

## 빌더 ⭐ 토글 (선택 — 별도 작업)

`builder/page.tsx` 의 저장 버튼 옆에 레퍼런스 토글 추가하려면:

```tsx
const [isReference, setIsReference] = useState(false);

const toggleReference = async (eventId: string) => {
  const next = !isReference;
  const res = await fetch(`/api/events/${eventId}/reference`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ isReference: next }),
  });
  const json = await res.json();
  if (json.ok) setIsReference(next);
};

<button onClick={() => toggleReference(currentEventId)}>
  {isReference ? '⭐ 레퍼런스로 등록됨' : '☆ 레퍼런스로 등록'}
</button>
```

이건 v3 에서 같이 통합 가능합니다.

/**
 * 캠페인 양식 (템플릿 프리셋)
 * ─────────────────────────────────────────────────────────────────
 * MD 가 자주 만드는 이커머스 캠페인 유형별 입력 양식.
 * 각 양식은 동적 필드(fields)를 가지며, 빌더가 양식 선택 시 해당 필드만 노출.
 *
 * 새 양식 추가는 이 파일에 항목 한 개만 추가하면 됨.
 * ─────────────────────────────────────────────────────────────────
 */

// ════════════════════════════════════════════════════════════════
// 제품 카테고리 (Yogibo 라인업 — 빈백/바디필로우/인형)
// ════════════════════════════════════════════════════════════════
//
// 각 카테고리는 AI 이미지 생성에 필요한 정확한 시각적 단서를 제공.
// 시스템 프롬프트에 자동 주입되어 결과물의 정체성을 명확히 한다.
//
export interface ProductCategory {
  id: string;
  emoji: string;
  nameKr: string;
  nameEn: string;
  /** AI 에 전달되는 풍부한 영문 시각 정의 */
  visualDefinition: string;
  /** 사용 가능한 변형(서브타입) — 선택 사항 */
  variants?: { value: string; label: string; visualHint: string }[];
}

export const PRODUCT_CATEGORIES: ProductCategory[] = [
  {
    id: 'beanbag',
    emoji: '🛋',
    nameKr: '빈백',
    nameEn: 'Beanbag',
    visualDefinition: `Yogibo-style beanbag chair — soft amorphous body-conforming lounger,
made of stretchy lycra-spandex fabric in vibrant solid colors (pink, lime, navy, gray, etc.),
filled with millions of micro-beads (EPS expanded polystyrene) that mold to the body shape.
Visual cues:
- person partially sinking into the soft surface, NOT sitting rigidly
- relaxed lounging posture: legs outstretched, head tilted back
- rounded organic blob-like shape with NO hard edges or visible internal structure
- size ranges from 70cm (single) up to 180cm (family-size)
- the beanbag visibly conforms to body weight, depressions where contact occurs
Common scenes: living room TV time, reading corner, kids playroom, dorm room, gaming setup`,
    variants: [
      { value: 'single',  label: '1인용 (Mini/Pod)', visualHint: 'small to medium beanbag, 70-100cm, fits one person' },
      { value: 'double',  label: '2인용 (Max)',      visualHint: 'large oversized beanbag, 150-180cm, fits 2 people side by side' },
      { value: 'family',  label: '패밀리 (Lounger)', visualHint: 'oversized family-size beanbag lounger, fits 3+ people' },
    ],
  },

  {
    id: 'body-pillow',
    emoji: '🤗',
    nameKr: '바디필로우',
    nameEn: 'Body Pillow',
    visualDefinition: `Yogibo-style body pillow — long support pillow filled with the same
micro-beads as the beanbags, covered in soft lycra-spandex fabric.
Visual cues:
- typically 100-150cm long, 30-40cm diameter (cylindrical roll form)
- person hugging the pillow while lying on side, OR using as body support
- pillow visibly conforms to the body, wrapping around the user
- solid pastel or vibrant colors matching the beanbag line
- soft draped texture, never stiff
Common scenes: bedroom side-sleeping, sofa lounging while reading,
pregnancy comfort support, post-surgery recovery, lazy weekend morning`,
    variants: [
      { value: 'roll',         label: '롤형 (Roll)',          visualHint: 'long cylindrical roll pillow, classic body pillow shape' },
      { value: 'u-shape',      label: 'U자형 (U-shape)',      visualHint: 'U-shaped pregnancy/maternity pillow, wraps around the body' },
      { value: 'caterpillar',  label: '누에형 (Caterpillar)', visualHint: 'segmented caterpillar-shaped flexible body pillow, can be bent' },
    ],
  },

  {
    id: 'plush',
    emoji: '🧸',
    nameKr: '인형',
    nameEn: 'Plush / Stuffed Toy',
    visualDefinition: `Yogibo-style plush toy — oversized character/animal-shaped stuffed
companion, filled with the same squishy micro-beads as the beanbags (NOT regular cotton stuffing),
giving it a uniquely huggable conforming texture.
Visual cues:
- larger than typical plushies (50-100cm), often kid-sized or bigger
- cute animal/character designs (Yogibo Mate series: dogs, frogs, sharks, cats, ducks, etc.)
- soft lycra-spandex outer fabric (NOT fuzzy traditional plush) — smooth and slightly stretchy
- bright cheerful saturated colors
- visibly squishes and reshapes when hugged
- often shown with kids hugging, sleeping with, or carrying
Common scenes: kids bedroom with character-themed decor, gift unboxing,
cuddling on sofa, character merchandise display, birthday celebration`,
    variants: [
      { value: 'animal',    label: '동물형',  visualHint: 'animal character (dog, cat, frog, shark, duck, etc.) plush' },
      { value: 'character', label: '캐릭터형', visualHint: 'mascot/character plush with distinctive face and accessories' },
      { value: 'food',      label: '음식형',  visualHint: 'food-shaped plush (donut, sushi, fruit, etc.), cute and quirky' },
    ],
  },
];

export const USAGE_SCENES = [
  { value: 'living-room', label: '거실',          en: 'modern living room with natural light, family relaxing' },
  { value: 'bedroom',     label: '침실',          en: 'cozy bedroom interior, intimate evening lighting' },
  { value: 'kids-room',   label: '키즈룸',        en: 'colorful kids room with toys and playful decor' },
  { value: 'home-office', label: '홈오피스',      en: 'home office workspace, productivity-focused' },
  { value: 'outdoor',     label: '야외/캠핑',     en: 'outdoor terrace or camping setting, leisure mood' },
  { value: 'studio',      label: '스튜디오',      en: 'clean studio background, product-focused photography' },
  { value: 'lifestyle',   label: '라이프스타일',  en: 'casual lifestyle scene, candid moment' },
];

// ════════════════════════════════════════════════════════════════
// 원본 이미지 보존 강도
// ════════════════════════════════════════════════════════════════
//
// 대표 이미지(mainImageUrl) 가 첨부되었을 때 사용됨.
// AI 도구마다 다르게 동작:
//   - ChatGPT/Gemini: 첨부 이미지 + 텍스트 설명 → 새 이미지
//   - Midjourney:     /imagine 에 image URL prompt 로 사용
//   - fal.ai (Flux):  img2img 모드 또는 ControlNet 활용
//
export interface PreservationMode {
  value: 'free' | 'similar' | 'strict' | 'overlay-only';
  emoji: string;
  label: string;
  description: string;
  /** AI 프롬프트에 주입되는 영문 지시문 */
  instruction: string;
}

export const PRESERVATION_MODES: PreservationMode[] = [
  {
    value: 'free',
    emoji: '🎨',
    label: '자유롭게 재해석',
    description: '참고용으로만 사용 — AI가 자유롭게 재창조',
    instruction: `IMAGE PRESERVATION LEVEL: LOOSE
Use the source image only as visual inspiration for mood and color.
The AI may freely reinterpret subjects, composition, and lighting.
The final result does not need to closely resemble the source.`,
  },
  {
    value: 'similar',
    emoji: '🎯',
    label: '대부분 비슷하게',
    description: '분위기 + 구도 유지, 일부 재해석 허용',
    instruction: `IMAGE PRESERVATION LEVEL: MODERATE
Maintain the overall composition, color palette, and lighting mood
of the source image. The main subject's general pose and placement
should be similar, but allow some artistic reinterpretation in details
(textures, background elements, etc.).`,
  },
  {
    value: 'strict',
    emoji: '🔒',
    label: '원본 최대한 살리기',
    description: '주요 요소 보존, 최소한의 변경만 (img2img 권장)',
    instruction: `IMAGE PRESERVATION LEVEL: STRICT (PRESERVE ORIGINAL)
PRESERVE the source image as much as possible.
Keep the EXACT subject, pose, facial expression, lighting, and composition.
Do NOT change the person/product/scene fundamentally.
Only modify or add minimal elements as specifically instructed below.
For tools that support img2img mode (Flux, ChatGPT image edit), use this image
as the input/init image with low denoising strength (0.3-0.5).`,
  },
  {
    value: 'overlay-only',
    emoji: '✏️',
    label: '원본 그대로 (텍스트만 추가)',
    description: '이미지는 건드리지 말고 텍스트/타이포그래피만 오버레이',
    instruction: `IMAGE PRESERVATION LEVEL: TEXT-OVERLAY ONLY
Use the source image AS-IS without ANY modification to its visual content.
DO NOT regenerate, alter, or restyle the image itself.
ONLY add the specified Korean text/typography as an overlay on top of the image.
This is essentially a typography composition over a fixed background image.
For best results, use ChatGPT's image-edit mode or Photoshop-style overlay tools
rather than full image generation.`,
  },
];

export type FieldType = 'text' | 'number' | 'select' | 'multiselect' | 'textarea';

export interface FieldDef {
  key: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  options?: { value: string; label: string }[];
  required?: boolean;
  defaultValue?: string | number;
  hint?: string;
}

export interface CampaignTemplate {
  id: string;
  emoji: string;
  name: string;
  description: string;
  fields: FieldDef[];
  /** AI 프롬프트 정교화 시 사용하는 컨텍스트 (Claude 에 전달) */
  contextForAI: string;
}

export const CAMPAIGN_TEMPLATES: CampaignTemplate[] = [
  {
    id: 'seasonal-sale',
    emoji: '🌸',
    name: '시즌 세일',
    description: '봄/여름/가을/겨울 정기 세일 캠페인',
    fields: [
      {
        key: 'season',
        label: '시즌',
        type: 'select',
        required: true,
        options: [
          { value: 'spring', label: '봄 (3~5월)' },
          { value: 'summer', label: '여름 (6~8월)' },
          { value: 'autumn', label: '가을 (9~11월)' },
          { value: 'winter', label: '겨울 (12~2월)' },
        ],
        defaultValue: 'spring',
      },
      {
        key: 'mainCopy',
        label: '메인 카피',
        type: 'text',
        required: true,
        placeholder: '예: 봄맞이 신상 30% 할인',
        hint: '캔버스에 가장 크게 표시될 한국어 카피',
      },
      {
        key: 'discount',
        label: '할인율 (%)',
        type: 'number',
        required: true,
        defaultValue: 30,
      },
      {
        key: 'mood',
        label: '무드',
        type: 'select',
        options: [
          { value: 'fresh', label: '상큼/화사함' },
          { value: 'warm', label: '따뜻함' },
          { value: 'cool', label: '시원함' },
          { value: 'minimal', label: '미니멀' },
          { value: 'luxurious', label: '고급스러움' },
        ],
        defaultValue: 'fresh',
      },
      {
        key: 'extraNote',
        label: '추가 요청사항 (선택)',
        type: 'textarea',
        placeholder: '예: 제품 사진 좌측 배치, 큰 할인율 강조',
      },
    ],
    contextForAI:
      'A seasonal sale campaign banner for a Korean e-commerce store (Yogibo, premium beanbag/cushion brand). Should evoke seasonal mood and emphasize discount.',
  },

  {
    id: 'anniversary',
    emoji: '🎉',
    name: '기념일 캠페인',
    description: '어버이날 / 어린이날 / 발렌타인 / 크리스마스 등',
    fields: [
      {
        key: 'occasion',
        label: '기념일',
        type: 'select',
        required: true,
        options: [
          { value: 'mothers-day', label: '어버이날' },
          { value: 'childrens-day', label: '어린이날' },
          { value: 'valentine', label: '발렌타인' },
          { value: 'white-day', label: '화이트데이' },
          { value: 'christmas', label: '크리스마스' },
          { value: 'pepero-day', label: '빼빼로데이' },
          { value: 'new-year', label: '신년' },
          { value: 'chuseok', label: '추석' },
          { value: 'custom', label: '기타 (직접 입력)' },
        ],
      },
      {
        key: 'customOccasion',
        label: '기타 기념일 명',
        type: 'text',
        placeholder: '예: 설날',
        hint: '기념일에서 "기타" 선택 시에만 사용',
      },
      {
        key: 'mainCopy',
        label: '메인 카피',
        type: 'text',
        required: true,
        placeholder: '예: 어버이날 감사 세일',
      },
      {
        key: 'discount',
        label: '할인율 (%)',
        type: 'number',
        defaultValue: 20,
      },
      {
        key: 'visualKeyword',
        label: '비주얼 키워드',
        type: 'text',
        placeholder: '예: 카네이션, 가족, 케이크',
        hint: '이미지에 포함되었으면 하는 시각적 요소',
      },
      {
        key: 'extraNote',
        label: '추가 요청사항 (선택)',
        type: 'textarea',
      },
    ],
    contextForAI:
      'An anniversary/special-occasion campaign banner. Should reflect the emotional theme of the occasion (warmth for Mothers Day, fun for Childrens Day, romance for Valentines, etc.) while staying on-brand for an e-commerce home goods store.',
  },

  {
    id: 'new-product',
    emoji: '✨',
    name: '신상 출시',
    description: '신제품 런칭 / 컬렉션 출시',
    fields: [
      {
        key: 'productName',
        label: '제품명',
        type: 'text',
        required: true,
        placeholder: '예: 요기보 맥스 2026 NEW',
      },
      {
        key: 'productCategory',
        label: '제품 카테고리',
        type: 'select',
        options: [
          { value: 'beanbag', label: '빈백' },
          { value: 'cushion', label: '쿠션' },
          { value: 'sofa', label: '소파' },
          { value: 'cover', label: '커버' },
          { value: 'accessory', label: '액세서리' },
          { value: 'other', label: '기타' },
        ],
        defaultValue: 'beanbag',
      },
      {
        key: 'mainCopy',
        label: '메인 카피',
        type: 'text',
        required: true,
        placeholder: '예: NEW 컬렉션 입고',
      },
      {
        key: 'productFeature',
        label: '제품 강조 포인트',
        type: 'text',
        placeholder: '예: 100% 친환경 소재, 신축성 강화',
        hint: '광고문구처럼 한 줄로',
      },
      {
        key: 'priceInfo',
        label: '가격 정보 (선택)',
        type: 'text',
        placeholder: '예: 출시기념 15% OFF 또는 49,000원',
      },
      {
        key: 'extraNote',
        label: '추가 요청사항 (선택)',
        type: 'textarea',
      },
    ],
    contextForAI:
      'A new product launch banner. Should focus on the product itself with clean, modern aesthetics. Highlight the product silhouette/features clearly.',
  },

  {
    id: 'coupon',
    emoji: '🎟️',
    name: '쿠폰 / 특가',
    description: '단독 쿠폰 발급 / 한정 특가 / 타임 세일',
    fields: [
      {
        key: 'couponType',
        label: '쿠폰 타입',
        type: 'select',
        required: true,
        options: [
          { value: 'amount', label: '정액 할인 (예: 5,000원 할인)' },
          { value: 'percent', label: '정률 할인 (예: 20% 할인)' },
          { value: 'free-shipping', label: '무료 배송' },
          { value: 'gift', label: '사은품 증정' },
        ],
        defaultValue: 'percent',
      },
      {
        key: 'discount',
        label: '할인 금액 또는 %',
        type: 'text',
        placeholder: '예: 30% 또는 5000원',
      },
      {
        key: 'urgency',
        label: '긴급성/한정성',
        type: 'select',
        options: [
          { value: 'none', label: '없음' },
          { value: 'limited-time', label: '시간 한정 (24시간)' },
          { value: 'limited-quantity', label: '수량 한정' },
          { value: 'weekend-only', label: '주말 한정' },
          { value: 'first-come', label: '선착순' },
        ],
        defaultValue: 'limited-time',
      },
      {
        key: 'mainCopy',
        label: '메인 카피',
        type: 'text',
        required: true,
        placeholder: '예: 주말 한정 단독 쿠폰',
      },
      {
        key: 'extraNote',
        label: '추가 요청사항 (선택)',
        type: 'textarea',
      },
    ],
    contextForAI:
      'A coupon/flash-sale campaign banner. Should convey urgency and value. Common visual cues: clock icons, ticket shapes, bold percentage numbers, contrasting colors.',
  },

  {
    id: 'event',
    emoji: '🎊',
    name: '이벤트 / 응모',
    description: '응모 이벤트 / 리뷰 이벤트 / 추첨',
    fields: [
      {
        key: 'eventType',
        label: '이벤트 유형',
        type: 'select',
        required: true,
        options: [
          { value: 'review', label: '리뷰 이벤트' },
          { value: 'lottery', label: '추첨 이벤트' },
          { value: 'sns-share', label: 'SNS 공유' },
          { value: 'subscribe', label: '구독/팔로우' },
          { value: 'attendance', label: '출석체크' },
        ],
      },
      {
        key: 'mainCopy',
        label: '메인 카피',
        type: 'text',
        required: true,
        placeholder: '예: 리뷰 작성하고 5,000원 적립금',
      },
      {
        key: 'reward',
        label: '리워드',
        type: 'text',
        placeholder: '예: 5,000원 적립금 또는 추첨 5명 무료증정',
      },
      {
        key: 'period',
        label: '진행 기간',
        type: 'text',
        placeholder: '예: 5/1 ~ 5/15',
      },
      {
        key: 'extraNote',
        label: '추가 요청사항 (선택)',
        type: 'textarea',
      },
    ],
    contextForAI:
      'An event/promotion campaign banner. Should be playful, eye-catching, and clearly communicate the participation method and reward.',
  },
];

export const TARGET_TOOLS = [
  {
    id: 'chatgpt',
    name: 'ChatGPT (DALL-E)',
    emoji: '🤖',
    url: 'https://chat.openai.com/',
    style: 'natural-language',
    description: '자연스러운 문장 형태 — DALL-E / GPT Image',
    /**
     * 이미지 입력 방식:
     *   - 'attach': 이미지 파일을 채팅에 직접 업로드 (URL X)
     *   - 'url':    URL 을 텍스트로 prompt 에 포함 (Midjourney 방식)
     *   - 'param':  별도 파라미터로 (init_image_url 등)
     */
    imageInputMethod: 'attach' as const,
  },
  {
    id: 'midjourney',
    name: 'Midjourney',
    emoji: '🎨',
    url: 'https://discord.com/channels/@me',
    style: 'keywords-with-params',
    description: '키워드 나열 + 파라미터 (--ar 16:9 --v 6)',
    imageInputMethod: 'url' as const,
  },
  {
    id: 'gemini',
    name: 'Gemini',
    emoji: '✨',
    url: 'https://gemini.google.com/',
    style: 'natural-language',
    description: 'Google Gemini — 자연어 + 이미지 첨부',
    imageInputMethod: 'attach' as const,
  },
  {
    id: 'fal',
    name: 'fal.ai (Flux)',
    emoji: '🌊',
    url: 'https://fal.ai/models/fal-ai/flux-pro',
    style: 'english-keywords',
    description: 'Flux 모델 — 영문 키워드 위주',
    imageInputMethod: 'param' as const,
  },
  {
    id: 'nanobanana',
    name: 'NanoBanana',
    emoji: '🍌',
    url: 'https://nanobanana.ai/',
    style: 'natural-language',
    description: 'NanoBanana — 자연어 프롬프트',
    imageInputMethod: 'attach' as const,
  },
];

// ════════════════════════════════════════════════════════════════
// 이벤트 운영 정보 — 모든 양식에 공통으로 적용되는 추가 필드
// ════════════════════════════════════════════════════════════════
//
// 이전엔 메인 카피 + 할인율만 받았는데,
// 실제 이커머스 배너에 들어가는 핵심 요소들 (기간, CTA 버튼, 라벨, 유의사항)
// 을 사전에 입력받아 AI 에 전달.
// → 디자인에 모든 요소가 자연스럽게 배치된 완성형 결과.
//

export const DATE_FORMATS = [
  {
    value: 'kr-short',
    label: '5.1(목) ~ 5.11(일)',
    example: '5.1(목) ~ 5.11(일)',
  },
  {
    value: 'kr-full',
    label: '2026.05.01 ~ 2026.05.11',
    example: '2026.05.01 ~ 2026.05.11',
  },
  {
    value: 'kr-natural',
    label: '5월 1일 ~ 5월 11일',
    example: '5월 1일 ~ 5월 11일',
  },
  {
    value: 'en-short',
    label: 'May 1 - May 11',
    example: 'May 1 - May 11',
  },
];

export const CTA_BUTTON_STYLES = [
  {
    value: 'standard',
    label: '표준 — 둥근 사각형 + 화살표',
    aiHint:
      'standard rounded rectangle button with arrow icon, brand color fill, white text, comfortable padding',
  },
  {
    value: 'bold',
    label: '강조 — 크고 진한',
    aiHint:
      'bold large prominent button, strong saturated brand color, larger size for emphasis, may include shadow or glow',
  },
  {
    value: 'minimal',
    label: '미니멀 — 테두리만',
    aiHint:
      'minimal outlined button, thin border only, transparent background, refined typography',
  },
  {
    value: 'pill',
    label: '필 — 양쪽 둥근 알약형',
    aiHint:
      'pill-shaped button with fully rounded edges, modern e-commerce style',
  },
  {
    value: 'gradient',
    label: '그라디언트 — 입체적',
    aiHint:
      'button with gradient fill background, slightly 3D appearance, premium feel',
  },
];

export const HEADER_LABEL_STYLES = [
  {
    value: 'ribbon',
    label: '리본 — 띠 형태',
    aiHint: 'ribbon-style banner at top, like a flag or banner',
  },
  {
    value: 'badge',
    label: '뱃지 — 둥근 라벨',
    aiHint: 'circular or rounded badge, like a stamp or seal',
  },
  {
    value: 'tag',
    label: '태그 — 가격표 형태',
    aiHint: 'price-tag style label with notched corner',
  },
  {
    value: 'simple-text',
    label: '심플 — 작은 텍스트',
    aiHint: 'simple uppercase or accent small text without decoration',
  },
];

/**
 * 이벤트 운영 정보 — 입력 양식에 모든 캠페인 양식 공통으로 표시.
 *
 * 모두 선택사항(optional). 비워두면 AI 가 알아서 적당히 처리.
 */
export interface EventOperationInfo {
  /** 이벤트 시작일 — YYYY-MM-DD 형식 */
  startDate?: string;
  /** 이벤트 종료일 */
  endDate?: string;
  /** 날짜 표시 형식 (DATE_FORMATS) */
  dateFormat?: string;

  /** CTA 버튼 문구 — 예: "지금 쇼핑하기", "구매하러 가기" */
  ctaText?: string;
  /** CTA 버튼 스타일 (CTA_BUTTON_STYLES) */
  ctaStyle?: string;

  /** 헤더 라벨 — 예: "어린이날 기념", "주말 한정" */
  headerLabel?: string;
  /** 헤더 라벨 스타일 (HEADER_LABEL_STYLES) */
  headerLabelStyle?: string;

  /** 하단 유의사항 — 예: "※ 일부 상품 제외, 타 쿠폰 중복 불가" */
  disclaimer?: string;
}

// ════════════════════════════════════════════════════════════════
// 결과 다양화 옵션 — 같은 제품/사진이라도 매번 다른 결과
// ════════════════════════════════════════════════════════════════
//
// 같은 첨부 이미지 + 같은 프롬프트로 생성하면 비슷한 결과만 반복되는 문제 해결.
// 선택한 항목들이 시스템 프롬프트에 변형 지시로 추가됨.
//
// 보존 강도가 'strict' / 'overlay-only' 일 땐 효과 제한적,
// 'similar' 또는 'free' 일 때 효과가 큼.
//
export interface VariationOption {
  value: string;
  emoji: string;
  label: string;
  /** AI 에게 전달되는 변형 지시문 (영문) */
  hint: string;
}

export const CAMERA_ANGLES: VariationOption[] = [
  { value: 'auto',      emoji: '🎯', label: '자동 (원본대로)',  hint: '' },
  { value: 'front',     emoji: '👤', label: '정면',            hint: 'shot from a front-facing camera angle, eye level' },
  { value: '45deg',     emoji: '↗️', label: '45도 측면',       hint: 'shot from a 45-degree angled side view, dynamic perspective' },
  { value: 'side',      emoji: '➡️', label: '완전 측면',       hint: 'shot from a strict side profile view (90 degrees)' },
  { value: 'top',       emoji: '⬇️', label: '위에서 내려다본', hint: 'shot from a top-down birds-eye view, looking down at the scene' },
  { value: 'low',       emoji: '⬆️', label: '낮은 각도',       hint: 'shot from a low angle looking up, dramatic perspective' },
];

export const MODEL_POSES: VariationOption[] = [
  { value: 'auto',      emoji: '🎯', label: '자동',           hint: '' },
  { value: 'sitting',   emoji: '🪑', label: '앉아있는',       hint: 'model sitting upright on/in the product' },
  { value: 'reclining', emoji: '🛌', label: '비스듬히 누운',  hint: 'model reclining at a relaxed angle, partially lying down' },
  { value: 'lying',     emoji: '😴', label: '완전히 누운',    hint: 'model lying flat with relaxed expression' },
  { value: 'hugging',   emoji: '🤗', label: '껴안고 있는',    hint: 'model hugging or embracing the product warmly' },
  { value: 'standing',  emoji: '🧍', label: '서서 옆에',      hint: 'model standing beside the product, presenting it' },
];

export const PEOPLE_COMPOSITION: VariationOption[] = [
  { value: 'auto',      emoji: '🎯', label: '자동',          hint: '' },
  { value: 'solo',      emoji: '👤', label: '1인',          hint: 'a single person interacting with the product' },
  { value: 'couple',    emoji: '👫', label: '2인 (커플)',   hint: 'a couple sharing the product, intimate atmosphere' },
  { value: 'family',    emoji: '👨‍👩‍👧', label: '가족',         hint: 'a family (parents and children) gathered around the product' },
  { value: 'kids',      emoji: '🧒', label: '아이들',       hint: 'children playing with or using the product' },
  { value: 'no-people', emoji: '🪑', label: '제품만 (인물 X)', hint: 'product-only shot, no people in frame, clean studio or interior setting' },
];

export const LIGHTING_TIME: VariationOption[] = [
  { value: 'auto',      emoji: '🎯', label: '자동',           hint: '' },
  { value: 'morning',   emoji: '🌅', label: '아침 햇살',      hint: 'soft morning sunlight, fresh and energetic atmosphere' },
  { value: 'daylight',  emoji: '☀️', label: '한낮',          hint: 'bright midday natural daylight, clear and cheerful' },
  { value: 'golden',    emoji: '🌇', label: '골든아워',      hint: 'warm golden hour lighting (sunset), nostalgic mood' },
  { value: 'evening',   emoji: '🌆', label: '저녁',          hint: 'soft evening indoor lighting, cozy and warm' },
  { value: 'night',     emoji: '🌙', label: '밤 (인공조명)', hint: 'nighttime with warm indoor lamps, intimate and quiet' },
];


//
// 같은 프롬프트를 받아도 도구마다 사용 방법이 다르기 때문에,
// "어떻게 써야 하는지" 단계별로 안내해서 사용자가 헷갈리지 않게 한다.
//
export interface ToolUsageGuide {
  withImage: { title: string; steps: string[]; tip?: string };
  withoutImage: { title: string; steps: string[]; tip?: string };
}

export const TOOL_USAGE_GUIDES: Record<string, ToolUsageGuide> = {
  chatgpt: {
    withImage: {
      title: 'ChatGPT 사용법 — 이미지 업로드 + 편집',
      steps: [
        '⬇️ 위 "대표 이미지 다운로드" 링크를 클릭해 이미지를 PC에 저장합니다.',
        'ChatGPT (https://chat.openai.com) 에 접속해 새 채팅을 엽니다. (GPT-4o 이상 권장)',
        '입력창의 📎 (클립) 아이콘 클릭 → 방금 다운로드한 이미지 업로드.',
        '⚠️ 입력창에 이미지 미리보기가 표시되는 것을 확인 (이게 핵심 — 이미지가 첨부되어야 동작).',
        '아래 프롬프트를 그대로 복사해 같은 입력창에 붙여넣고 전송.',
        '결과 이미지가 원본과 너무 다르면 "원본 이미지를 더 살려줘" 또는 "Use the attached image as the base, do not regenerate the product" 추가 요청.',
      ],
      tip: '⚠️ 이미지를 첨부하지 않고 프롬프트만 보내면 ChatGPT가 새 이미지를 처음부터 생성합니다. 반드시 4번 단계(이미지 미리보기 확인)를 거치세요. GPT-4o 이상에서 image edit 기능 사용 — 무료 플랜은 제한적이니 Plus 권장.',
    },
    withoutImage: {
      title: 'ChatGPT 사용법 — 새 이미지 생성',
      steps: [
        'ChatGPT (https://chat.openai.com) 에 접속해 새 채팅을 엽니다.',
        '아래 프롬프트를 복사해 입력창에 붙여넣고 전송.',
        '결과 이미지를 받으면 마음에 들 때까지 "더 ~하게 다시" 등으로 수정 요청.',
      ],
      tip: 'DALL-E 3 가 자동 호출됩니다. 한 번에 1장 생성되며, 변형이 필요하면 "다른 버전으로" 요청.',
    },
  },

  midjourney: {
    withImage: {
      title: 'Midjourney 사용법 — 이미지 URL 참고',
      steps: [
        'Discord 의 Midjourney 서버 또는 DM 으로 이동.',
        '아래 프롬프트를 그대로 복사 (이미 /imagine 명령어 + 이미지 URL 포함됨).',
        '입력창에 붙여넣고 Enter.',
        '4개 변형 중 마음에 드는 것 → U1~U4 로 업스케일.',
      ],
      tip: '이미지 URL 의 "이미지 weight" 가 기본 0.5~1.0. 더 강하게 따라하려면 프롬프트 끝에 --iw 2 추가.',
    },
    withoutImage: {
      title: 'Midjourney 사용법 — 새 이미지 생성',
      steps: [
        'Discord 의 Midjourney 서버 또는 DM 으로 이동.',
        '아래 프롬프트를 복사해 입력창에 붙여넣고 Enter (이미 /imagine 포함됨).',
        '4개 변형 중 선택해 업스케일.',
      ],
      tip: '한국어 텍스트는 Midjourney 가 정확히 못 그릴 수 있음. 텍스트는 후작업(포토샵)으로 추가 권장.',
    },
  },

  gemini: {
    withImage: {
      title: 'Gemini 사용법 — 이미지 업로드',
      steps: [
        '⬇️ 위 "대표 이미지 다운로드" 링크 클릭해 PC에 저장.',
        'Gemini (https://gemini.google.com) 접속 후 새 채팅.',
        '입력창의 📎 또는 + 아이콘으로 다운로드한 이미지 업로드.',
        '⚠️ 입력창에 이미지 미리보기가 보이는지 확인.',
        '아래 프롬프트를 복사해 같은 입력창에 붙여넣고 전송.',
      ],
      tip: '⚠️ 반드시 4번 단계(이미지 미리보기 확인) 거쳐야 첨부 이미지가 인식됩니다. Gemini 의 이미지 생성은 Imagen 모델 기반 — 한국어 텍스트 렌더링은 ChatGPT 가 더 우수.',
    },
    withoutImage: {
      title: 'Gemini 사용법 — 새 이미지 생성',
      steps: [
        'Gemini 접속 후 새 채팅.',
        '아래 프롬프트 입력 → 전송.',
      ],
    },
  },

  fal: {
    withImage: {
      title: 'fal.ai 사용법 — img2img 모드',
      steps: [
        'fal.ai (https://fal.ai/models/fal-ai/flux-pro/v1.1) 접속.',
        '"Image-to-Image" 또는 "Flux Redux" 모델 선택.',
        '"Image URL" 필드에 대표 이미지 URL 붙여넣기.',
        '"Prompt" 필드에 아래 프롬프트 본문 붙여넣기.',
        '"Strength" 또는 "Image strength" 를 0.3~0.5 로 설정 (낮을수록 원본 보존).',
        'Run 버튼 클릭.',
      ],
      tip: 'Strength 가 0.5 이상이면 원본이 많이 변형됨. "원본 최대한 살리기" 모드 선택 시 0.3 권장.',
    },
    withoutImage: {
      title: 'fal.ai 사용법 — Text-to-Image',
      steps: [
        'fal.ai (https://fal.ai/models/fal-ai/flux-pro) 접속.',
        '"Prompt" 필드에 아래 프롬프트 본문 붙여넣기.',
        'Aspect Ratio 설정 후 Run.',
      ],
    },
  },

  nanobanana: {
    withImage: {
      title: 'NanoBanana 사용법',
      steps: [
        'NanoBanana (https://nanobanana.ai) 접속.',
        '이미지 업로드 → 아래 프롬프트 본문 입력 → 생성.',
      ],
    },
    withoutImage: {
      title: 'NanoBanana 사용법',
      steps: [
        'NanoBanana 접속 → 아래 프롬프트 입력 → 생성.',
      ],
    },
  },
};

/**
 * 출력 사이즈 — 자사몰 + 스마트스토어 실제 운영 규격.
 *
 * value 형식: '가로x세로' (픽셀) 또는 비율 ('16:9' 등)
 * AI 도구에 전달 시: "1920x680 pixels (banner format)" 같은 자연어로 변환됨.
 */
export const ASPECT_RATIOS = [
  // ── 자사몰 (Cafe24 Yogibo) ──────────────────────
  {
    value: '1920x680',
    label: '🏠 자사몰 웹 메인 (1920×680)',
    group: '자사몰',
    width: 1920,
    height: 680,
  },
  {
    value: '800x907',
    label: '📱 자사몰 모바일 메인 (800×907)',
    group: '자사몰',
    width: 800,
    height: 907,
  },
  {
    value: '800x-',
    label: '📄 자사몰 이벤트 페이지 (800×가변)',
    group: '자사몰',
    width: 800,
    height: 0, // 가변
  },

  // ── 스마트스토어 (네이버) ────────────────────────
  {
    value: '1920x400',
    label: '🛒 스마트스토어 PC 메인 (1920×400)',
    group: '스마트스토어',
    width: 1920,
    height: 400,
  },
  {
    value: '750x600',
    label: '📱 스마트스토어 모바일 메인 (750×600)',
    group: '스마트스토어',
    width: 750,
    height: 600,
  },
  {
    value: '1280x200',
    label: '🎟️ 스마트스토어 PC 쿠폰/홍보 (1280×200)',
    group: '스마트스토어',
    width: 1280,
    height: 200,
  },
  {
    value: '750x240',
    label: '🎟️ 스마트스토어 모바일 쿠폰/홍보 (750×240)',
    group: '스마트스토어',
    width: 750,
    height: 240,
  },
  {
    value: '1300x1300',
    label: '🖼️ 스마트스토어 대표이미지 (1300×1300, 1:1)',
    group: '스마트스토어',
    width: 1300,
    height: 1300,
  },
  {
    value: '860x-',
    label: '📄 스마트스토어 상세페이지 (860×가변)',
    group: '스마트스토어',
    width: 860,
    height: 0,
  },

  // ── 일반 SNS ───────────────────────────────────
  {
    value: '1080x1080',
    label: '📷 인스타그램 정사각 (1080×1080)',
    group: 'SNS',
    width: 1080,
    height: 1080,
  },
  {
    value: '1080x1350',
    label: '📷 인스타그램 세로형 (1080×1350)',
    group: 'SNS',
    width: 1080,
    height: 1350,
  },
  {
    value: '1080x1920',
    label: '📱 인스타그램 스토리/릴스 (1080×1920)',
    group: 'SNS',
    width: 1080,
    height: 1920,
  },
];

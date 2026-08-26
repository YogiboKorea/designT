/**
 * 생성 이미지 프롬프트 조립기
 * ─────────────────────────────────────────────────────────────────
 * "레퍼런스(풍) + 제품 + 목표 사이즈" → Higgsfield 에 넣을 영문 프롬프트.
 *
 * ⚠️ 이 프롬프트는 **텍스트를 절대 그리지 않는다.**
 *    한글 카피·CTA·할인율은 배너 에디터(/main-visual)에서 얹는다.
 *    따라서 여기서 할 일은 두 가지다:
 *      ① 레퍼런스의 "풍"(조명·색·구도·질감)을 재현
 *      ② 나중에 텍스트가 들어갈 자리를 **의도적으로 비워두기**
 *    ②를 빼먹으면 AI 가 화면을 꽉 채워서 카피 얹을 자리가 안 남는다.
 *
 * ⚠️ 제품 묘사는 카테고리 단어("beanbag")로 하면 안 된다.
 *    맥스를 "beanbag" 이라고만 하면 둥근 공/라운저로 그려진다 (실측 확인됨).
 *    youtube 프로젝트에서 12차 실측으로 확립한 4종 세트를 그대로 쓴다:
 *      ① 카테고리 대신 기하 서술  ② 정확한 치수  ③ NOT 네거티브  ④ 인체 대비 앵커
 * ─────────────────────────────────────────────────────────────────
 */

/** Higgsfield(nano_banana 계열)가 받는 비율 프리셋. 임의 픽셀은 못 받는다. */
export const HIGGSFIELD_ASPECTS: { label: string; ratio: number }[] = [
  { label: '21:9', ratio: 21 / 9 },
  { label: '16:9', ratio: 16 / 9 },
  { label: '3:2', ratio: 3 / 2 },
  { label: '4:3', ratio: 4 / 3 },
  { label: '5:4', ratio: 5 / 4 },
  { label: '1:1', ratio: 1 },
  { label: '4:5', ratio: 4 / 5 },
  { label: '3:4', ratio: 3 / 4 },
  { label: '2:3', ratio: 2 / 3 },
  { label: '9:16', ratio: 9 / 16 },
];

export interface AspectPlan {
  /** Higgsfield 에 넘길 비율 문자열 */
  aspect: string;
  /** 목표 비율 (w/h) */
  targetRatio: number;
  /** 생성물에서 실제로 살아남는 비율 (1 = 손실 없음) */
  retention: number;
  /** 크롭 방향 */
  cropAxis: 'vertical' | 'horizontal' | 'none';
}

/**
 * 목표 픽셀 → 가장 가까운 Higgsfield 비율 + 크롭 계획.
 * 목표가 21:9 보다 넓거나 9:16 보다 좁으면 큰 크롭이 불가피하므로
 * retention 을 같이 돌려줘서 프롬프트에 경고를 넣게 한다.
 */
export function planAspect(targetW: number, targetH: number): AspectPlan {
  const targetRatio = targetW / targetH;
  let best = HIGGSFIELD_ASPECTS[0];
  let bestDiff = Infinity;
  for (const a of HIGGSFIELD_ASPECTS) {
    // 비율은 곱셈 스케일이라 로그 거리로 비교해야 한다.
    // (산술 차이로 하면 넓은 쪽 후보들이 부당하게 멀어 보인다)
    const diff = Math.abs(Math.log(a.ratio / targetRatio));
    if (diff < bestDiff) {
      bestDiff = diff;
      best = a;
    }
  }
  // 목표가 생성 비율보다 더 넓으면 위아래를 자르고, 반대면 좌우를 자른다
  const retention =
    targetRatio > best.ratio ? best.ratio / targetRatio : targetRatio / best.ratio;
  const cropAxis =
    Math.abs(targetRatio - best.ratio) < 0.01
      ? 'none'
      : targetRatio > best.ratio
        ? 'vertical'
        : 'horizontal';
  return { aspect: best.label, targetRatio, retention, cropAxis };
}

/** 카피가 들어갈 자리 — 가로형은 좌측, 세로형은 상단이 이커머스 관례 */
export type TextSafeArea = 'left' | 'right' | 'top' | 'bottom' | 'center' | 'none';

/**
 * 사이즈별 기본 카피 자리.
 * ─────────────────────────────────────────────────────────────────
 * ⚠️ 정사각을 'left' 로 두면 안 된다. SNS 는 상단 카피가 관례고,
 *    가로 배너와 똑같은 "좌측 비우기" 구도가 반복되면 캠페인 전체가
 *    한 장처럼 보인다 (실제로 그렇게 나와서 지적받음).
 *
 * 가로형은 좌/우 어느 쪽이든 되므로 side 인자로 뒤집을 수 있게 했다.
 * 같은 캠페인 안에서 배너를 여러 장 뽑을 땐 번갈아 쓰는 게 좋다.
 * ─────────────────────────────────────────────────────────────────
 */
export function planTextSafeArea(
  targetW: number,
  targetH: number,
  side: 'left' | 'right' = 'left',
): TextSafeArea {
  const r = targetW / targetH;
  if (r >= 1.3) return side; // 가로 배너 — 한쪽 카피 / 반대쪽 제품
  if (r >= 0.95) return 'top'; // 정사각(SNS) — 상단 카피 / 하단 제품
  return 'top'; // 세로형(모바일) — 상단 카피 / 하단 제품
}

/** 사이즈에 따라 달라지는 구도 지시 */
function compositionFor(targetW: number, targetH: number): string {
  const r = targetW / targetH;
  if (r >= 2.5) {
    return `EXTREME WIDE BANNER (${targetW}x${targetH}). Place the product and model in the RIGHT third. The LEFT half must be an empty, uncluttered wall/floor plane. Keep every essential element inside the vertical middle band of the frame - the top and bottom will be cropped away.`;
  }
  if (r >= 1.6) {
    return `WIDE WEB BANNER (${targetW}x${targetH}). Split composition: the LEFT 45% stays clean and empty for copy, product and model occupy the RIGHT side.`;
  }
  if (r >= 0.95) {
    return `SQUARE FORMAT (${targetW}x${targetH}). Product slightly below center, with clean breathing room in the upper-left quadrant for copy.`;
  }
  return `TALL MOBILE FORMAT (${targetW}x${targetH}). Vertical stack: the TOP third stays clean and empty for copy, the product and model fill the LOWER two thirds. Shoot from a slightly lower camera height so the product reads large on a phone screen.`;
}

/** 제품 기하 서술 — youtube/data/products.json + productPrompt.js 형식 */
export interface ProductGeometry {
  nameEn: string;
  /** 카테고리 단어 대신 쓰는 기하 서술 */
  shape: string;
  /** NOT 네거티브 */
  negative: string;
  /** 사용 자세 / 모드 */
  modes: string;
  /** 실측 치수 (cm) */
  spec?: {
    w?: string | number;
    d?: string | number;
    h?: string | number;
    weight?: string | number;
  };
  /** 인체 대비 스케일 앵커 */
  scalePrompt?: string;
  /** 색상명 + hex */
  color?: { name?: string; hex?: string };
  /** Higgsfield Element 토큰 — 있으면 제품 정확도가 가장 높다 */
  elementId?: string;
}

/**
 * 제품별 기본 색상.
 * ─────────────────────────────────────────────────────────────────
 * 지시에 색상 언급이 없으면 여기 값을 쓴다.
 * 색을 안 정하고 넘기면 모델이 매번 다른 색으로 그려서, 같은 캠페인 안에서
 * 배너마다 제품 색이 달라지는 사고가 난다. 그래서 "미지정 = 랜덤"이 아니라
 * "미지정 = 대표색"으로 고정한다.
 *
 * 맥스 기본값은 네이비블루(#1D395D) — 운영 지정값.
 * ─────────────────────────────────────────────────────────────────
 */
export const DEFAULT_PRODUCT_COLORS: Record<string, { name: string; hex: string }> = {
  MAX: { name: '네이비블루', hex: '#1D395D' },
};

/** 제품명(영문)에서 기본 색상 키를 찾는다. 'Max', 'max', 'MAX' 모두 매칭. */
export function defaultColorFor(nameEn: string | undefined): { name: string; hex: string } | null {
  if (!nameEn) return null;
  const key = nameEn.trim().toUpperCase();
  // 'Max Double' 처럼 뒤에 수식어가 붙어도 앞 토큰으로 잡는다
  const head = key.split(/[\s_-]/)[0];
  return DEFAULT_PRODUCT_COLORS[head] ?? DEFAULT_PRODUCT_COLORS[key] ?? null;
}

export interface BuildArgs {
  /** 레퍼런스 제목 (기록용) */
  referenceTitle?: string;
  /** 레퍼런스에서 읽어낸 풍 서술 — 조명/색/질감/구도 */
  styleNotes?: string;
  /** 접목할 제품 */
  product?: ProductGeometry | null;
  /** 목표 사이즈 */
  targetW: number;
  targetH: number;
  /** 시즌/무드 등 캠페인 맥락 */
  mood?: string;
  /** 추가 요청 */
  extra?: string;
}

export interface BuildResult {
  prompt: string;
  aspect: string;
  textSafeArea: TextSafeArea;
  retention: number;
  cropAxis: AspectPlan['cropAxis'];
  /** Element 토큰을 프롬프트에 심었는지 */
  usedElement: boolean;
}

/** 레퍼런스 + 제품 + 사이즈 → 최종 영문 프롬프트 */
export function buildGenerationPrompt(args: BuildArgs): BuildResult {
  const { referenceTitle, styleNotes, product, targetW, targetH, mood, extra } = args;

  const plan = planAspect(targetW, targetH);
  const safe = planTextSafeArea(targetW, targetH);

  const L: string[] = [];

  // ① 풍 — 레퍼런스 이미지를 첨부하고 그 문법을 그대로 따르게 한다
  L.push(
    `Use the attached reference image as the STYLE and LAYOUT reference for a Korean e-commerce banner${
      referenceTitle ? ` (reference: ${referenceTitle})` : ''
    }. Match its visual grammar exactly: lighting direction and softness, wall and floor materials, color temperature, prop density, camera height, and overall editorial mood.`,
  );
  if (styleNotes) L.push(`STYLE NOTES: ${styleNotes}`);

  // ② 제품 — 카테고리 단어 금지, 기하/치수/네거티브/스케일 4종 세트
  if (product) {
    // 색상 미지정이면 제품 대표색으로 채운다 (맥스 → 네이비블루).
    // 비워두면 모델이 매번 다른 색을 골라서 캠페인 내 색이 안 맞는다.
    const color = product.color?.hex || product.color?.name
      ? product.color
      : defaultColorFor(product.nameEn) ?? undefined;

    const token = product.elementId ? `<<<${product.elementId}>>> ` : '';
    L.push('');
    L.push(
      `PRODUCT - ${token}Yogibo ${product.nameEn}${
        color?.name ? ` (${color.name})` : ''
      }.`,
    );
    L.push(`SHAPE: ${product.shape}.`);
    const s = product.spec ?? {};
    const dims = [
      s.w && `${s.w}cm wide`,
      s.d && `${s.d}cm deep`,
      s.h && `${s.h}cm tall/long`,
    ]
      .filter(Boolean)
      .join(' x ');
    if (dims) L.push(`EXACT SIZE: ${dims}${s.weight ? `, ${s.weight}kg` : ''}.`);
    if (product.scalePrompt) L.push(`SCALE ANCHOR: ${product.scalePrompt}.`);
    L.push(`NEGATIVE: ${product.negative}.`);
    if (color?.name || color?.hex) {
      L.push(
        `COLOR: ${(color.name ?? '').toLowerCase()}${
          color.hex ? ` (${color.hex})` : ''
        } - exact, must not shift toward a neighbouring hue.`,
      );
    }
    L.push(`USE: ${product.modes}.`);
    L.push(
      `FABRIC: soft stretch cover that visibly compresses and dents under body weight; edges rise around the body as a person sinks in.`,
    );
  }

  // ③ 사이즈별 구도 + 텍스트 세이프존
  L.push('');
  L.push(compositionFor(targetW, targetH));
  L.push(
    `TEXT SAFE AREA: the ${safe.toUpperCase()} region must remain a clean, empty, low-detail surface. Korean copy will be overlaid there later in a separate editing step, so it must contain no objects, no pattern, and no strong shadow edges.`,
  );

  // 크롭이 심하면 미리 경고 — 안 그러면 잘라낸 뒤 구도가 무너진다
  if (plan.retention < 0.75) {
    L.push(
      `IMPORTANT FRAMING: the delivered image is cropped from ${plan.aspect} down to ${targetW}x${targetH} (only ${Math.round(
        plan.retention * 100,
      )}% of the ${plan.cropAxis === 'vertical' ? 'height' : 'width'} survives). Compose so that nothing essential sits near the ${
        plan.cropAxis === 'vertical' ? 'top or bottom' : 'left or right'
      } edge.`,
    );
  }

  if (mood) L.push(`MOOD: ${mood}.`);
  if (extra) L.push(`ADDITIONAL: ${extra}`);

  // ④ 텍스트 전면 금지 — 이 파이프라인의 대전제
  L.push('');
  L.push(
    `ABSOLUTELY NO TEXT: no typography, no Korean or English lettering, no numbers, no CTA button, no badges, no price tags, no logos, no watermarks. Pure photographic visual only.`,
  );

  return {
    prompt: L.join('\n'),
    aspect: plan.aspect,
    textSafeArea: safe,
    retention: plan.retention,
    cropAxis: plan.cropAxis,
    usedElement: !!product?.elementId,
  };
}

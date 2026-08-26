import mongoose, { Schema, Document } from 'mongoose';

/**
 * AI 생성 이미지 모델.
 * ─────────────────────────────────────────────────────────────────
 * "레퍼런스(풍) + 제품 → 생성" 파이프라인의 결과물을 보관한다.
 *
 * 생성 파이프라인 (Claude Code 세션에서 실행):
 *   ① 레퍼런스 선택      — ReferenceImage 에서 "이 풍으로"
 *   ② 제품 선택          — Product 에서 기하/치수/네거티브/스케일 앵커
 *   ③ 프롬프트 조립      — 텍스트 없음 + 텍스트 세이프존 확보
 *   ④ Higgsfield 생성    — 외부 도구 (서버에서 호출 불가, 세션에서 실행)
 *   ⑤ 목표 사이즈로 크롭
 *   ⑥ FTP 업로드         — /api/ftp
 *   ⑦ 이 모델로 등록     — POST /api/generated-images
 *
 * 등록되고 나면 이벤트 페이지 / 배너 에디터에서 픽커로 골라 쓸 수 있다.
 *
 * ⚠️ 이 이미지들은 **텍스트가 없는 순수 비주얼**이다.
 *    한글 카피·CTA·할인율은 배너 에디터(/main-visual)에서 얹는다.
 *    그래서 textSafeArea 로 "어디를 비워뒀는지" 를 같이 저장한다.
 *
 * ⚠️ imageUrl 에 unique 를 걸지 않는다.
 *    ReferenceImage 는 unique 라 같은 이미지를 두 곳에 못 넣는데,
 *    생성물은 같은 프롬프트로 여러 장·여러 폴더에 들어갈 수 있어야 한다.
 * ─────────────────────────────────────────────────────────────────
 */

/** 생성 이미지에서 비워둔 카피 영역 — 배너 에디터가 텍스트를 얹을 자리 */
export type TextSafeArea = 'left' | 'right' | 'top' | 'bottom' | 'center' | 'none';

/**
 * 생성에 실제로 넣은 입력 이미지 1장.
 * ─────────────────────────────────────────────────────────────────
 * referenceIds/productId 로 조인하지 않고 URL 을 그대로 박아둔다.
 * 레퍼런스나 제품이 나중에 수정·삭제돼도 "이 결과물이 무엇으로 만들어졌는지"는
 * 그대로 남아야 하기 때문. 이력은 스냅샷이어야 한다.
 */
export interface InputImage {
  /** reference = 풍(스타일) 소스 / product = 제품 단독 실사 / model = 모델 착석 썸네일 */
  kind: 'reference' | 'product' | 'model';
  /** 화면에 보여줄 이름 */
  title: string;
  /** 실제 이미지 URL */
  url: string;
  /** 이 입력이 담당한 역할 (예: '조명·벽·바닥 톤', '맥스 형태·색상') */
  role?: string;
}

export interface IGeneratedImage extends Document {
  /** 소속 폴더 (GeneratedFolder._id) */
  folderId: mongoose.Types.ObjectId;
  /** 표시 제목 */
  title: string;
  /** FTP 업로드된 최종 이미지 URL */
  imageUrl: string;
  /** 크롭 전 원본(생성 직후) URL — 재크롭용, 없을 수 있음 */
  sourceImageUrl: string;

  /** 최종 사이즈 */
  width: number;
  height: number;

  /** 실제로 사용한 영문 프롬프트 전문 */
  prompt: string;
  /** 생성에 쓴 AI 모델명 (예: nano_banana_2). Document.model() 과 충돌하므로 model 이 아니라 aiModel */
  aiModel: string;
  /** 생성 도구 (현재는 higgsfield 고정, 추후 fal 등) */
  provider: string;

  /** 생성에 실제로 넣은 입력 이미지들 (스냅샷) — "이걸로 만들어졌다" 를 보여주는 근거 */
  inputImages: InputImage[];

  /** 풍(스타일) 소스로 쓴 ReferenceImage._id 목록 */
  referenceIds: mongoose.Types.ObjectId[];
  /** 접목한 Product._id (맥스 등) */
  productId?: mongoose.Types.ObjectId | null;
  /** Higgsfield Element 토큰 (제품 정확도용, 있을 때만) */
  elementId: string;

  /** 텍스트를 얹으라고 비워둔 영역 */
  textSafeArea: TextSafeArea;

  /** 분류용 태그 */
  tags: string[];
  /** 운영 메모 */
  note: string;
  /** 활성 여부 (삭제는 소프트 삭제) */
  active: boolean;

  createdAt: Date;
  updatedAt: Date;
}

const GeneratedImageSchema = new Schema<IGeneratedImage>(
  {
    folderId: {
      type: Schema.Types.ObjectId,
      ref: 'GeneratedFolder',
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true },
    imageUrl: { type: String, required: true },
    sourceImageUrl: { type: String, default: '' },

    width: { type: Number, default: 0 },
    height: { type: Number, default: 0 },

    prompt: { type: String, default: '' },
    aiModel: { type: String, default: '' },
    provider: { type: String, default: 'higgsfield' },

    inputImages: {
      type: [
        {
          _id: false,
          kind: { type: String, enum: ['reference', 'product', 'model'], required: true },
          title: { type: String, default: '' },
          url: { type: String, required: true },
          role: { type: String, default: '' },
        },
      ],
      default: [],
    },

    referenceIds: [{ type: Schema.Types.ObjectId, ref: 'ReferenceImage' }],
    productId: { type: Schema.Types.ObjectId, ref: 'Product', default: null },
    elementId: { type: String, default: '' },

    textSafeArea: {
      type: String,
      enum: ['left', 'right', 'top', 'bottom', 'center', 'none'],
      default: 'left',
    },

    tags: { type: [String], default: [] },
    note: { type: String, default: '' },
    active: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

GeneratedImageSchema.index({ folderId: 1, active: 1, createdAt: -1 });
GeneratedImageSchema.index({ tags: 1 });

// HMR 환경 대응
if ((mongoose.models as any).GeneratedImage) {
  delete (mongoose.models as any).GeneratedImage;
  try {
    (mongoose as any).deleteModel && (mongoose as any).deleteModel('GeneratedImage');
  } catch {
    /* noop */
  }
}

export default mongoose.model<IGeneratedImage>(
  'GeneratedImage',
  GeneratedImageSchema,
  'generated_images',
);

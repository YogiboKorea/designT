import mongoose, { Schema, Document } from 'mongoose';

/**
 * AI 생성 이미지 폴더 모델.
 * ─────────────────────────────────────────────────────────────────
 * 캠페인 단위로 생성 이미지를 묶는 "폴더".
 *
 * ⚠️ 이 저장소의 다른 라이브러리들(ReferenceImage / Product / BannerPreset)은
 *    분류를 스키마 enum 으로 박아두는데, 그러면 enum 값이 스키마 + 각 페이지의
 *    CATEGORY_OPTIONS 로 2~3중 중복된다 (references 페이지에서 실제로 발생한 문제).
 *    폴더는 운영자가 계속 새로 만드는 값이므로 enum 이 아니라 **데이터**로 둔다.
 *    이름·이모지·색을 폴더 문서가 직접 들고 있으면 그 중복이 생기지 않는다.
 *
 * 폴더명 규칙:
 *   화면 표시는 한글 자유. 단 FTP 원격 경로/파일명에는 절대 쓰지 않는다.
 *   (cafe24 nginx 가 비-ASCII 경로에 403/404 를 냄 — /api/ftp 의 sanitizeFilename 참고)
 *   업로드 파일명은 slug(ASCII) 를 사용한다.
 * ─────────────────────────────────────────────────────────────────
 */

export interface IGeneratedFolder extends Document {
  /** 표시용 폴더명 (한글 자유, 예: '2026-08 여름마감세일') */
  name: string;
  /** ASCII 슬러그 — FTP 파일명 프리픽스로 사용 (한글 금지) */
  slug: string;
  /** 목록에서 구분용 이모지 */
  emoji: string;
  /** 카드 강조색 */
  color: string;
  /** 폴더 설명 / 캠페인 메모 */
  description: string;
  /** 활성 여부 (삭제는 소프트 삭제) */
  active: boolean;

  createdAt: Date;
  updatedAt: Date;
}

const GeneratedFolderSchema = new Schema<IGeneratedFolder>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, trim: true },
    emoji: { type: String, default: '📁' },
    color: { type: String, default: '#fe6326' },
    description: { type: String, default: '' },
    active: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

GeneratedFolderSchema.index({ active: 1, updatedAt: -1 });

// HMR 환경 대응
if ((mongoose.models as any).GeneratedFolder) {
  delete (mongoose.models as any).GeneratedFolder;
  try {
    (mongoose as any).deleteModel && (mongoose as any).deleteModel('GeneratedFolder');
  } catch {
    /* noop */
  }
}

export default mongoose.model<IGeneratedFolder>(
  'GeneratedFolder',
  GeneratedFolderSchema,
  'generated_folders',
);

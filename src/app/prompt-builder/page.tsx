'use client';
/**
 * /prompt-builder — AI 이미지 생성 프롬프트 빌더
 *
 * 흐름:
 *   1. 캠페인 양식 선택 (시즌세일/기념일/신상/쿠폰/이벤트)
 *   2. 양식별 필드 채우기
 *   3. 참고 레퍼런스 선택 (등록된 갤러리에서 + 새 업로드)
 *   4. 타겟 도구 선택 (ChatGPT/Midjourney/Gemini/fal.ai/NanoBanana)
 *   5. ✨ 프롬프트 생성 → Claude 가 정교화
 *   6. 📋 복사 → 🚀 외부 도구 바로가기
 */
import { useState, useEffect, CSSProperties } from 'react';
import {
  CAMPAIGN_TEMPLATES,
  TARGET_TOOLS,
  ASPECT_RATIOS,
  PRODUCT_CATEGORIES,
  USAGE_SCENES,
  PRESERVATION_MODES,
  DATE_FORMATS,
  CTA_BUTTON_STYLES,
  HEADER_LABEL_STYLES,
  CAMERA_ANGLES,
  MODEL_POSES,
  PEOPLE_COMPOSITION,
  LIGHTING_TIME,
  type CampaignTemplate,
  type FieldDef,
} from '../../data/campaign-templates';
import TopNav from '@/components/TopNav';

interface ReferenceItem {
  _id: string;
  title: string;
  imageUrl: string;
  tags: string[];
  extractedTokens?: any;
}

export default function PromptBuilderPage() {
  // ── 1. 양식 선택 ─────────────────────────────────────
  const [templateId, setTemplateId] = useState<string>(CAMPAIGN_TEMPLATES[0].id);
  const template: CampaignTemplate =
    CAMPAIGN_TEMPLATES.find((t) => t.id === templateId) ?? CAMPAIGN_TEMPLATES[0];

  // ── 2. 필드 값 ──────────────────────────────────────
  const [fields, setFields] = useState<Record<string, any>>({});

  // 양식 변경 시 기본값 초기화
  useEffect(() => {
    const defaults: Record<string, any> = {};
    template.fields.forEach((f) => {
      if (f.defaultValue !== undefined) defaults[f.key] = f.defaultValue;
    });
    setFields(defaults);
  }, [templateId, template]);

  // ── 3. 레퍼런스 선택 ─────────────────────────────────
  const [allReferences, setAllReferences] = useState<ReferenceItem[]>([]);
  const [selectedRefs, setSelectedRefs] = useState<string[]>([]); // _id 배열

  useEffect(() => {
    fetch('/api/references?limit=60')
      .then((r) => r.json())
      .then((d) => d.ok && setAllReferences(d.items));
  }, []);

  // ── 4. 도구 / 비율 ─────────────────────────────────
  const [targetTool, setTargetTool] = useState<string>('chatgpt');
  const [aspectRatio, setAspectRatio] = useState<string>('1920x680');

  // ── 4.5. 대표 이미지 (FTP 업로드 → URL) ────────────
  const [mainImageUrl, setMainImageUrl] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string>('');

  // ── 4.6. 원본 보존 강도 (대표 이미지가 있을 때만 사용됨) ──
  const [preservationMode, setPreservationMode] = useState<
    'free' | 'similar' | 'strict' | 'overlay-only'
  >('similar');

  // ── 0. 제품 정보 (모든 양식 공통) ────────────────
  const [productCategoryId, setProductCategoryId] = useState<string>('beanbag');
  const [productVariant, setProductVariant] = useState<string>('');
  const [usageScene, setUsageScene] = useState<string>('');

  const productCategory =
    PRODUCT_CATEGORIES.find((p) => p.id === productCategoryId) ?? PRODUCT_CATEGORIES[0];
  const variantInfo = productCategory.variants?.find((v) => v.value === productVariant);
  const sceneInfo = USAGE_SCENES.find((s) => s.value === usageScene);

  // ── 0.5 라이브러리 제품 (선택) ────────────────────
  // /api/products 에서 가져옴. 카테고리에 맞는 것만 표시.
  interface LibraryProduct {
    _id: string;
    category: string;
    nameKr: string;
    nameEn: string;
    productImageUrl: string;
    thumbnailUrl?: string;
    visualNotes?: string;
    tags?: string[];
    recommendedTool?: string;
  }
  const [libraryProducts, setLibraryProducts] = useState<LibraryProduct[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [libLoading, setLibLoading] = useState(false);

  useEffect(() => {
    setLibLoading(true);
    fetch(`/api/products?active=true&limit=200`)
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) setLibraryProducts(d.items);
      })
      .catch(() => { /* ignore */ })
      .finally(() => setLibLoading(false));
  }, []);

  const filteredLibraryProducts = libraryProducts.filter(
    (p) => p.category === productCategoryId,
  );
  const selectedProduct = libraryProducts.find((p) => p._id === selectedProductId);

  // ── 0.7 이벤트 운영 정보 (모든 양식 공통) ────────────
  const [evStartDate, setEvStartDate] = useState<string>('');
  const [evEndDate, setEvEndDate] = useState<string>('');
  const [evDateFormat, setEvDateFormat] = useState<string>('kr-short');
  const [evCtaText, setEvCtaText] = useState<string>('지금 쇼핑하기');
  const [evCtaStyle, setEvCtaStyle] = useState<string>('standard');
  const [evHeaderLabel, setEvHeaderLabel] = useState<string>('');
  const [evHeaderLabelStyle, setEvHeaderLabelStyle] = useState<string>('simple-text');
  const [evDisclaimer, setEvDisclaimer] = useState<string>('');

  // 날짜 포맷터 (UI 에서 미리 포맷해서 API 전달)
  const formatEventDate = (
    start: string,
    end: string,
    fmt: string,
  ): string => {
    if (!start && !end) return '';
    const tryParse = (s: string) => {
      if (!s) return null;
      const [y, m, d] = s.split('-').map((n) => parseInt(n, 10));
      if (!y || !m || !d) return null;
      return new Date(y, m - 1, d);
    };
    const s = tryParse(start);
    const e = tryParse(end);
    if (!s || !e) return start && end ? `${start} ~ ${end}` : start || end;

    const days = ['일', '월', '화', '수', '목', '금', '토'];
    switch (fmt) {
      case 'kr-short':
        return `${s.getMonth() + 1}.${s.getDate()}(${days[s.getDay()]}) ~ ${e.getMonth() + 1}.${e.getDate()}(${days[e.getDay()]})`;
      case 'kr-full':
        return `${s.getFullYear()}.${String(s.getMonth() + 1).padStart(2, '0')}.${String(s.getDate()).padStart(2, '0')} ~ ${e.getFullYear()}.${String(e.getMonth() + 1).padStart(2, '0')}.${String(e.getDate()).padStart(2, '0')}`;
      case 'kr-natural':
        return `${s.getMonth() + 1}월 ${s.getDate()}일 ~ ${e.getMonth() + 1}월 ${e.getDate()}일`;
      case 'en-short': {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${months[s.getMonth()]} ${s.getDate()} - ${months[e.getMonth()]} ${e.getDate()}`;
      }
      default:
        return `${start} ~ ${end}`;
    }
  };

  const formattedEventDate = formatEventDate(evStartDate, evEndDate, evDateFormat);

  // ── 0.8 결과 다양화 옵션 ──────────────────────────
  const [varCameraAngle, setVarCameraAngle] = useState<string>('auto');
  const [varModelPose, setVarModelPose] = useState<string>('auto');
  const [varPeople, setVarPeople] = useState<string>('auto');
  const [varLighting, setVarLighting] = useState<string>('auto');

  // ── 5. 결과 ────────────────────────────────────────
  const [loading, setLoading] = useState(false);
  const [resultPrompt, setResultPrompt] = useState<string>('');
  const [resultUsage, setResultUsage] = useState<any>(null);
  const [resultUsedLibraryAsMain, setResultUsedLibraryAsMain] = useState<boolean>(false);
  const [resultGuide, setResultGuide] = useState<{ title: string; steps: string[]; tip?: string } | null>(null);
  const [resultMainImageUrl, setResultMainImageUrl] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const updateField = (key: string, value: any) => {
    setFields((prev) => ({ ...prev, [key]: value }));
  };

  const toggleReference = (id: string) => {
    setSelectedRefs((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  // ── 대표 이미지 업로드 (FTP) ─────────────────────────
  const handleUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setUploadError('이미지 파일만 업로드 가능합니다.');
      return;
    }
    setUploading(true);
    setUploadError('');

    try {
      // base64 변환
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('파일 읽기 실패'));
        reader.readAsDataURL(file);
      });

      // 파일명 생성 (충돌 방지: timestamp + sanitized)
      const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
      const safeName = file.name
        .replace(/\.[^.]+$/, '')
        .replace(/[^a-zA-Z0-9가-힣_-]/g, '_')
        .slice(0, 30);
      const filename = `prompt_${Date.now()}_${safeName}.${ext}`;

      const res = await fetch('/api/ftp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64, filename }),
      });

      const json = await res.json();
      if (!json.success) throw new Error(json.message || 'FTP 업로드 실패');

      setMainImageUrl(json.imageUrl);
    } catch (err: any) {
      setUploadError(err?.message ?? '업로드 실패');
    } finally {
      setUploading(false);
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
  };

  const generate = async () => {
    setErrorMsg('');
    setResultPrompt('');
    setResultUsage(null);
    setResultGuide(null);
    setResultMainImageUrl('');
    setCopied(false);

    // 필수값 확인
    for (const f of template.fields) {
      if (f.required && !fields[f.key]) {
        setErrorMsg(`"${f.label}" 은 필수 입력입니다.`);
        return;
      }
    }

    setLoading(true);
    try {
      const selectedRefItems = allReferences.filter((r) =>
        selectedRefs.includes(r._id),
      );

      const preservationDef = PRESERVATION_MODES.find((m) => m.value === preservationMode);

      const res = await fetch('/api/prompt-builder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId,
          templateContext: template.contextForAI,
          fields,
          referenceUrls: selectedRefItems.map((r) => r.imageUrl),
          referenceTokens: selectedRefItems
            .map((r) => r.extractedTokens)
            .filter(Boolean),
          mainImageUrl,
          preservationMode,
          preservationInstruction: preservationDef?.instruction ?? '',
          productInfo: {
            categoryId: productCategory.id,
            categoryNameEn: productCategory.nameEn,
            visualDefinition: productCategory.visualDefinition,
            variantHint: variantInfo?.visualHint ?? '',
            sceneEn: sceneInfo?.en ?? '',
            // 라이브러리에서 선택된 정확한 제품이 있으면 추가
            ...(selectedProduct
              ? {
                  productImageUrl: selectedProduct.productImageUrl,
                  productNameEn: selectedProduct.nameEn,
                  productNameKr: selectedProduct.nameKr,
                  productVisualNotes: selectedProduct.visualNotes ?? '',
                  productTags: selectedProduct.tags ?? [],
                }
              : {}),
          },
          targetTool,
          aspectRatio,
          eventOperation: {
            startDate: evStartDate || undefined,
            endDate: evEndDate || undefined,
            dateFormat: evDateFormat,
            formattedDate: formattedEventDate || undefined,
            ctaText: evCtaText || undefined,
            ctaStyle: evCtaStyle,
            ctaStyleHint: CTA_BUTTON_STYLES.find((s) => s.value === evCtaStyle)?.aiHint,
            headerLabel: evHeaderLabel || undefined,
            headerLabelStyle: evHeaderLabelStyle,
            headerLabelStyleHint: HEADER_LABEL_STYLES.find((s) => s.value === evHeaderLabelStyle)?.aiHint,
            disclaimer: evDisclaimer || undefined,
          },
          variations: {
            cameraAngle: varCameraAngle,
            cameraAngleHint: CAMERA_ANGLES.find((c) => c.value === varCameraAngle)?.hint || '',
            modelPose: varModelPose,
            modelPoseHint: MODEL_POSES.find((m) => m.value === varModelPose)?.hint || '',
            peopleComposition: varPeople,
            peopleCompositionHint: PEOPLE_COMPOSITION.find((p) => p.value === varPeople)?.hint || '',
            lightingTime: varLighting,
            lightingTimeHint: LIGHTING_TIME.find((l) => l.value === varLighting)?.hint || '',
          },
        }),
      });

      const json = await res.json();
      if (!json.ok) throw new Error(json.message || '생성 실패');

      setResultPrompt(json.prompt);
      setResultUsage(json.usage);
      setResultGuide(json.toolGuide ?? null);
      setResultMainImageUrl(json.mainImageUrl ?? '');
      setResultUsedLibraryAsMain(!!json.usedLibraryAsMain);
    } catch (err: any) {
      setErrorMsg(err?.message ?? '알 수 없는 오류');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(resultPrompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert('클립보드 복사 실패. 직접 선택해서 복사해주세요.');
    }
  };

  const openTool = () => {
    const tool = TARGET_TOOLS.find((t) => t.id === targetTool);
    if (!tool) return;
    copyToClipboard();
    window.open(tool.url, '_blank');
  };

  // ── 비용 표시 ──────────────────────────────────────
  const estCost = resultUsage
    ? ((resultUsage.input_tokens ?? 0) * 1 + (resultUsage.output_tokens ?? 0) * 5) /
      1_000_000
    : 0;

  return (
    <>
      <TopNav active="prompt-builder" />
      <div style={S.page}>
        <header style={S.hd}>
          <h1 style={S.h1}>🪄 AI 이미지 프롬프트 빌더</h1>
          <p style={S.lead}>
            캠페인 정보를 입력하면, Claude가 ChatGPT/Midjourney/Gemini 등에 바로
            붙여넣을 수 있는 정교한 이미지 생성 프롬프트로 변환해드립니다.
          </p>
        </header>

        {/* ──── Step 0: 제품 카테고리 (필수, 모든 양식 공통) ──── */}
        <section style={S.section}>
          <h2 style={S.h2}>
            📦 제품 카테고리
            <span style={S.hint}> — Yogibo 라인업 중 어떤 제품인지 선택</span>
          </h2>
          <div style={S.productGrid}>
            {PRODUCT_CATEGORIES.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setProductCategoryId(p.id);
                  setProductVariant(''); // 카테고리 바뀌면 변형 초기화
                  setSelectedProductId(''); // 카테고리 바뀌면 선택된 제품 초기화
                }}
                style={{
                  ...S.productCard,
                  ...(p.id === productCategoryId ? S.productCardActive : {}),
                }}
              >
                <div style={S.productEmoji}>{p.emoji}</div>
                <div style={S.productName}>{p.nameKr}</div>
                <div style={S.productNameEn}>{p.nameEn}</div>
              </button>
            ))}
          </div>

          {/* 변형(선택) + 사용 시나리오(선택) */}
          <div style={S.subOptionsRow}>
            {productCategory.variants && productCategory.variants.length > 0 && (
              <div style={S.subOption}>
                <label style={S.fieldLabel}>세부 형태 (선택)</label>
                <select
                  value={productVariant}
                  onChange={(e) => setProductVariant(e.target.value)}
                  style={S.select}
                >
                  <option value="">자동 (지정 없음)</option>
                  {productCategory.variants.map((v) => (
                    <option key={v.value} value={v.value}>
                      {v.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div style={S.subOption}>
              <label style={S.fieldLabel}>사용 시나리오 (선택)</label>
              <select
                value={usageScene}
                onChange={(e) => setUsageScene(e.target.value)}
                style={S.select}
              >
                <option value="">자동 (지정 없음)</option>
                {USAGE_SCENES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 🆕 라이브러리에서 정확한 제품 선택 (선택) */}
          <div style={S.libraryBlock}>
            <div style={S.libraryHead}>
              <span style={S.libraryTitle}>
                ⭐ 라이브러리에서 정확한 제품 선택 (선택사항, 추천)
              </span>
              <a href="/products" target="_blank" rel="noopener noreferrer" style={S.libraryLink}>
                + 새 제품 등록 →
              </a>
            </div>
            <p style={S.libraryDesc}>
              실제 Yogibo 제품 사진을 선택하면, 일반 빈백/인형이 아닌
              <strong> 정확한 제품 정체성</strong>이 프롬프트에 포함됩니다.
            </p>

            {libLoading ? (
              <div style={S.libraryEmpty}>제품 라이브러리 불러오는 중...</div>
            ) : filteredLibraryProducts.length === 0 ? (
              <div style={S.libraryEmpty}>
                <span>이 카테고리({productCategory.nameKr})에 등록된 제품이 없습니다.</span>
                <a href="/products" target="_blank" rel="noopener noreferrer" style={S.libraryLinkInline}>
                  → /products 에서 등록하기
                </a>
              </div>
            ) : (
              <div style={S.libraryGrid}>
                {/* "사용 안 함" 카드 */}
                <button
                  type="button"
                  onClick={() => setSelectedProductId('')}
                  style={{
                    ...S.libraryCard,
                    ...(!selectedProductId ? S.libraryCardActive : {}),
                  }}
                >
                  <div style={S.libraryNoneIcon}>✕</div>
                  <div style={S.libraryNoneLabel}>사용 안 함</div>
                </button>

                {filteredLibraryProducts.map((p) => (
                  <button
                    key={p._id}
                    type="button"
                    onClick={() => setSelectedProductId(p._id)}
                    style={{
                      ...S.libraryCard,
                      ...(selectedProductId === p._id ? S.libraryCardActive : {}),
                    }}
                    title={p.visualNotes || p.nameEn}
                  >
                    <img
                      src={p.thumbnailUrl ?? p.productImageUrl}
                      alt={p.nameKr}
                      style={S.libraryImg}
                    />
                    <div style={S.libraryName}>{p.nameKr}</div>
                    {selectedProductId === p._id && (
                      <div style={S.libraryCheck}>✓</div>
                    )}
                  </button>
                ))}
              </div>
            )}

            {selectedProduct && (
              <div style={S.libraryInfo}>
                ✅ <strong>{selectedProduct.nameKr}</strong> 선택됨
                <br />
                <span style={{ fontSize: 11 }}>
                  이 제품의 공식 사진이 프롬프트에 포함되며,
                  <strong style={{ color: '#7c3aed' }}> 대표 이미지가 따로 없으면 자동으로 대표 이미지로 사용</strong>됩니다.
                  AI 도구에서 이 사진을 첨부 파일로 업로드해 사용하세요.
                </span>
              </div>
            )}
          </div>
        </section>

        {/* ──── Step 1: 양식 선택 ──── */}
        <section style={S.section}>
          <h2 style={S.h2}>① 캠페인 유형</h2>
          <div style={S.templateGrid}>
            {CAMPAIGN_TEMPLATES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTemplateId(t.id)}
                style={{
                  ...S.templateCard,
                  ...(t.id === templateId ? S.templateCardActive : {}),
                }}
              >
                <div style={S.templateEmoji}>{t.emoji}</div>
                <div style={S.templateName}>{t.name}</div>
                <div style={S.templateDesc}>{t.description}</div>
              </button>
            ))}
          </div>
        </section>

        {/* ──── Step 2: 양식 필드 ──── */}
        <section style={S.section}>
          <h2 style={S.h2}>② 세부 정보</h2>
          <div style={S.fieldsBox}>
            {template.fields.map((f) => (
              <FieldInput
                key={f.key}
                field={f}
                value={fields[f.key]}
                onChange={(v) => updateField(f.key, v)}
              />
            ))}
          </div>
        </section>

        {/* ──── Step 2.5: 이벤트 운영 정보 (모든 양식 공통) ──── */}
        <section style={S.section}>
          <h2 style={S.h2}>
            🗓️ 이벤트 운영 정보 (선택)
            <span style={S.hint}>
              {' '}— 디자인에 자연스럽게 녹여낼 운영 요소들. 입력하면 AI가 적절한 위치에 자동 배치합니다.
            </span>
          </h2>

          {/* 이벤트 기간 */}
          <div style={S.evGroup}>
            <div style={S.evGroupTitle}>📅 이벤트 기간</div>
            <div style={S.evGrid3}>
              <div>
                <label style={S.fieldLabel}>시작일</label>
                <input
                  type="date"
                  value={evStartDate}
                  onChange={(e) => setEvStartDate(e.target.value)}
                  style={S.input}
                />
              </div>
              <div>
                <label style={S.fieldLabel}>종료일</label>
                <input
                  type="date"
                  value={evEndDate}
                  onChange={(e) => setEvEndDate(e.target.value)}
                  style={S.input}
                />
              </div>
              <div>
                <label style={S.fieldLabel}>표시 형식</label>
                <select
                  value={evDateFormat}
                  onChange={(e) => setEvDateFormat(e.target.value)}
                  style={S.select}
                >
                  {DATE_FORMATS.map((f) => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </select>
              </div>
            </div>
            {formattedEventDate && (
              <div style={S.evPreview}>
                미리보기: <strong>{formattedEventDate}</strong>
              </div>
            )}
          </div>

          {/* CTA 버튼 */}
          <div style={S.evGroup}>
            <div style={S.evGroupTitle}>🔘 CTA 버튼</div>
            <div style={S.evGrid2}>
              <div>
                <label style={S.fieldLabel}>버튼 문구</label>
                <input
                  type="text"
                  value={evCtaText}
                  onChange={(e) => setEvCtaText(e.target.value)}
                  placeholder="예: 지금 쇼핑하기"
                  style={S.input}
                />
              </div>
              <div>
                <label style={S.fieldLabel}>버튼 스타일</label>
                <select
                  value={evCtaStyle}
                  onChange={(e) => setEvCtaStyle(e.target.value)}
                  style={S.select}
                >
                  {CTA_BUTTON_STYLES.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* 헤더 라벨 */}
          <div style={S.evGroup}>
            <div style={S.evGroupTitle}>🏷️ 헤더 라벨 (선택)</div>
            <div style={S.evGrid2}>
              <div>
                <label style={S.fieldLabel}>라벨 문구</label>
                <input
                  type="text"
                  value={evHeaderLabel}
                  onChange={(e) => setEvHeaderLabel(e.target.value)}
                  placeholder="예: 어버이날 기념, 주말 한정, 신상 입고"
                  style={S.input}
                />
              </div>
              <div>
                <label style={S.fieldLabel}>라벨 스타일</label>
                <select
                  value={evHeaderLabelStyle}
                  onChange={(e) => setEvHeaderLabelStyle(e.target.value)}
                  style={S.select}
                >
                  {HEADER_LABEL_STYLES.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* 유의사항 */}
          <div style={S.evGroup}>
            <div style={S.evGroupTitle}>⚠️ 유의사항 (선택)</div>
            <input
              type="text"
              value={evDisclaimer}
              onChange={(e) => setEvDisclaimer(e.target.value)}
              placeholder="예: ※ 일부 상품 제외, 타 쿠폰 및 프로모션 중복 적용 불가"
              style={S.input}
            />
          </div>
        </section>

        {/* ──── Step 2.7: 결과 다양화 옵션 (선택) ──── */}
        <section style={S.section}>
          <h2 style={S.h2}>
            🎬 결과 다양화 (선택)
            <span style={S.hint}>
              {' '}— 같은 이미지로 매번 비슷한 결과만 나올 때 변형 지시를 추가합니다.
              "원본 최대한 살리기" 모드에서는 무시됩니다.
            </span>
          </h2>

          <div style={S.varGrid}>
            <div>
              <label style={S.fieldLabel}>📷 카메라 각도</label>
              <select
                value={varCameraAngle}
                onChange={(e) => setVarCameraAngle(e.target.value)}
                style={S.select}
              >
                {CAMERA_ANGLES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.emoji} {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={S.fieldLabel}>🧍 모델 포즈</label>
              <select
                value={varModelPose}
                onChange={(e) => setVarModelPose(e.target.value)}
                style={S.select}
              >
                {MODEL_POSES.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.emoji} {m.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={S.fieldLabel}>👥 인물 구성</label>
              <select
                value={varPeople}
                onChange={(e) => setVarPeople(e.target.value)}
                style={S.select}
              >
                {PEOPLE_COMPOSITION.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.emoji} {p.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={S.fieldLabel}>🌅 조명/시간대</label>
              <select
                value={varLighting}
                onChange={(e) => setVarLighting(e.target.value)}
                style={S.select}
              >
                {LIGHTING_TIME.map((l) => (
                  <option key={l.value} value={l.value}>
                    {l.emoji} {l.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {(varCameraAngle !== 'auto' ||
            varModelPose !== 'auto' ||
            varPeople !== 'auto' ||
            varLighting !== 'auto') && (
            <div style={S.varNote}>
              💡 변형 지시가 활성화되어 있습니다. 보존 강도를 <strong>"비슷하게"</strong> 또는
              <strong> "자유롭게 재해석"</strong>으로 설정하면 효과가 큽니다.
              <button
                type="button"
                onClick={() => {
                  setVarCameraAngle('auto');
                  setVarModelPose('auto');
                  setVarPeople('auto');
                  setVarLighting('auto');
                }}
                style={S.smallBtn}
              >
                모두 초기화
              </button>
            </div>
          )}
        </section>

        {/* ──── Step 3: 레퍼런스 선택 ──── */}
        <section style={S.section}>
          <h2 style={S.h2}>
            ③ 참고 레퍼런스 (선택)
            <span style={S.hint}>
              {' '}
              — 선택한 이미지의 톤/색상을 따라 프롬프트가 작성됩니다.
            </span>
          </h2>
          {allReferences.length === 0 ? (
            <div style={S.emptyRef}>
              등록된 레퍼런스가 없습니다.{' '}
              <a href="/references/import" style={S.link}>
                일괄 등록 페이지
              </a>
              에서 먼저 추가해주세요.
            </div>
          ) : (
            <div style={S.refGrid}>
              {allReferences.map((r) => (
                <button
                  key={r._id}
                  type="button"
                  onClick={() => toggleReference(r._id)}
                  style={{
                    ...S.refCard,
                    ...(selectedRefs.includes(r._id) ? S.refCardActive : {}),
                  }}
                >
                  <img src={r.imageUrl} alt={r.title} style={S.refImg} />
                  <div style={S.refTitle}>{r.title}</div>
                  {selectedRefs.includes(r._id) && (
                    <div style={S.refCheck}>✓</div>
                  )}
                </button>
              ))}
            </div>
          )}
          {selectedRefs.length > 0 && (
            <div style={S.selectedInfo}>
              ✅ {selectedRefs.length}개 선택됨
            </div>
          )}
        </section>

        {/* ──── Step 3.5: 대표 이미지 업로드 (선택) ──── */}
        <section style={S.section}>
          <h2 style={S.h2}>
            ④ 대표 이미지 첨부 (선택)
            <span style={S.hint}>
              {' '}
              — 보존하고 싶은 메인 사진 (모델, 제품 등). 업로드하면 FTP에 저장되고 URL이 프롬프트에 포함됩니다.
            </span>
          </h2>

          {!mainImageUrl ? (
            <div style={S.uploadBox}>
              <input
                type="file"
                accept="image/*"
                onChange={onFileChange}
                disabled={uploading}
                style={{ display: 'none' }}
                id="main-image-upload"
              />
              <label
                htmlFor="main-image-upload"
                style={{
                  ...S.uploadLabel,
                  ...(uploading ? S.uploadLabelDisabled : {}),
                }}
              >
                {uploading ? (
                  <>⏳ FTP 업로드 중...</>
                ) : (
                  <>
                    <span style={{ fontSize: 28 }}>📎</span>
                    <span style={S.uploadText}>이미지 선택 또는 드래그</span>
                    <span style={S.uploadSub}>JPG, PNG, WEBP 지원</span>
                  </>
                )}
              </label>
              {uploadError && <div style={S.errorBox}>❌ {uploadError}</div>}
            </div>
          ) : (
            <div style={S.uploadedBox}>
              <img src={mainImageUrl} alt="대표 이미지" style={S.uploadedImg} />
              <div style={S.uploadedInfo}>
                <div style={S.uploadedTitle}>✅ 대표 이미지 등록됨</div>
                <div style={S.uploadedUrl}>{mainImageUrl}</div>
                <div style={S.uploadedActions}>
                  <button
                    type="button"
                    onClick={() => navigator.clipboard.writeText(mainImageUrl)}
                    style={S.smallBtn}
                  >
                    📋 URL 복사
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMainImageUrl('');
                      setUploadError('');
                    }}
                    style={S.smallBtnDanger}
                  >
                    🗑 제거
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 🆕 원본 보존 강도 (대표 이미지 업로드된 경우만) */}
          {mainImageUrl && (
            <div style={S.preservationBlock}>
              <h3 style={S.preservationTitle}>
                🎚️ 원본 이미지 보존 강도
                <span style={S.hint}> — 업로드한 이미지를 얼마나 살릴지</span>
              </h3>
              <div style={S.preservationGrid}>
                {PRESERVATION_MODES.map((mode) => (
                  <button
                    key={mode.value}
                    type="button"
                    onClick={() => setPreservationMode(mode.value)}
                    style={{
                      ...S.preservationCard,
                      ...(mode.value === preservationMode ? S.preservationCardActive : {}),
                    }}
                  >
                    <div style={S.preservationEmoji}>{mode.emoji}</div>
                    <div style={S.preservationLabel}>{mode.label}</div>
                    <div style={S.preservationDesc}>{mode.description}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* ──── Step 5: 타겟 도구 + 비율 ──── */}
        <section style={S.section}>
          <h2 style={S.h2}>⑤ 출력 도구 / 사이즈</h2>
          <div style={S.toolGrid}>
            {TARGET_TOOLS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTargetTool(t.id)}
                style={{
                  ...S.toolCard,
                  ...(t.id === targetTool ? S.toolCardActive : {}),
                }}
              >
                <div style={S.toolEmoji}>{t.emoji}</div>
                <div style={S.toolName}>{t.name}</div>
                <div style={S.toolDesc}>{t.description}</div>
              </button>
            ))}
          </div>

          <div style={{ marginTop: 16 }}>
            <label style={S.fieldLabel}>출력 사이즈 (몰별 권장)</label>
            <select
              value={aspectRatio}
              onChange={(e) => setAspectRatio(e.target.value)}
              style={S.select}
            >
              {/* 그룹별로 표시 */}
              {Array.from(new Set(ASPECT_RATIOS.map((r) => r.group))).map((group) => (
                <optgroup key={group} label={group}>
                  {ASPECT_RATIOS.filter((r) => r.group === group).map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
        </section>

        {/* ──── Step 5: 생성 ──── */}
        <section style={S.section}>
          <button
            type="button"
            onClick={generate}
            disabled={loading}
            style={{
              ...S.generateBtn,
              ...(loading ? S.generateBtnDisabled : {}),
            }}
          >
            {loading ? '🪄 Claude 가 작성 중…' : '✨ 프롬프트 생성'}
          </button>

          {errorMsg && <div style={S.errorBox}>❌ {errorMsg}</div>}

          {resultPrompt && (
            <div style={S.resultBox}>
              <div style={S.resultHead}>
                <span>✅ 생성된 프롬프트</span>
                {resultUsage && (
                  <span style={S.resultMeta}>
                    {resultUsage.input_tokens} in / {resultUsage.output_tokens} out
                    &nbsp;·&nbsp; ${estCost.toFixed(4)}
                  </span>
                )}
              </div>

              {/* 🆕 사용법 가이드 — 도구별로 다름 */}
              {resultGuide && (
                <div style={S.guideBox}>
                  <div style={S.guideTitle}>📖 {resultGuide.title}</div>

                  {/* 라이브러리 이미지가 자동 사용된 경우 안내 */}
                  {resultUsedLibraryAsMain && (
                    <div style={S.libAutoNotice}>
                      ℹ️ 라이브러리에서 선택한 제품 사진이 <strong>대표 이미지로 자동 사용</strong>됐습니다.
                      아래 다운로드 링크에서 그 사진을 받아 도구에 첨부하세요.
                    </div>
                  )}

                  <ol style={S.guideSteps}>
                    {resultGuide.steps.map((step, i) => (
                      <li key={i} style={S.guideStep}>{step}</li>
                    ))}
                  </ol>
                  {resultGuide.tip && (
                    <div style={S.guideTip}>💡 {resultGuide.tip}</div>
                  )}

                  {/* 대표 이미지 다운로드 안내 (있을 때만) */}
                  {resultMainImageUrl && (
                    <div style={S.imgDownload}>
                      <span style={S.imgDownloadLabel}>📥 대표 이미지 다운로드:</span>
                      <a
                        href={resultMainImageUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        download
                        style={S.imgDownloadLink}
                      >
                        {resultMainImageUrl}
                      </a>
                    </div>
                  )}
                </div>
              )}

              <textarea
                value={resultPrompt}
                onChange={(e) => setResultPrompt(e.target.value)}
                rows={12}
                style={S.resultText}
              />
              <div style={S.resultActions}>
                <button
                  type="button"
                  onClick={copyToClipboard}
                  style={{
                    ...S.copyBtn,
                    ...(copied ? S.copyBtnCopied : {}),
                  }}
                >
                  {copied ? '✓ 복사됨!' : '📋 프롬프트 복사'}
                </button>
                <button type="button" onClick={openTool} style={S.openBtn}>
                  🚀 {TARGET_TOOLS.find((t) => t.id === targetTool)?.name} 열기
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// 필드 입력 컴포넌트
// ─────────────────────────────────────────────────────────────
function FieldInput({
  field,
  value,
  onChange,
}: {
  field: FieldDef;
  value: any;
  onChange: (v: any) => void;
}) {
  return (
    <div style={S.field}>
      <label style={S.fieldLabel}>
        {field.label}
        {field.required && <span style={S.required}> *</span>}
      </label>
      {field.type === 'text' && (
        <input
          type="text"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          style={S.input}
        />
      )}
      {field.type === 'number' && (
        <input
          type="number"
          value={value ?? ''}
          onChange={(e) => onChange(Number(e.target.value))}
          placeholder={field.placeholder}
          style={S.input}
        />
      )}
      {field.type === 'select' && (
        <select
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          style={S.select}
        >
          <option value="">선택하세요</option>
          {field.options?.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      )}
      {field.type === 'textarea' && (
        <textarea
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          rows={3}
          style={S.textarea}
        />
      )}
      {field.hint && <div style={S.fieldHint}>{field.hint}</div>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 스타일
// ─────────────────────────────────────────────────────────────
const S: Record<string, CSSProperties> = {
  page: {
    padding: '24px 24px 80px',
    maxWidth: 1100,
    margin: '0 auto',
    fontFamily: 'Pretendard, -apple-system, sans-serif',
    color: '#111827',
  },
  hd: { marginBottom: 24 },
  h1: { margin: '0 0 8px', fontSize: 26, fontWeight: 800 },
  h2: {
    margin: '0 0 12px',
    fontSize: 16,
    fontWeight: 700,
    color: '#111827',
  },
  hint: {
    fontSize: 12,
    fontWeight: 400,
    color: '#6b7280',
  },
  lead: { margin: 0, color: '#6b7280', fontSize: 14, lineHeight: 1.6 },
  section: {
    marginBottom: 28,
    padding: 24,
    border: '1px solid #e5e7eb',
    borderRadius: 12,
    background: '#fff',
  },

  // 양식 카드
  templateGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
    gap: 12,
  },
  templateCard: {
    padding: '16px 14px',
    border: '2px solid #e5e7eb',
    borderRadius: 10,
    background: '#fff',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'all 0.15s',
  },
  templateCardActive: {
    borderColor: '#7c3aed',
    background: '#faf5ff',
    boxShadow: '0 0 0 3px rgba(124, 58, 237, 0.1)',
  },
  templateEmoji: { fontSize: 24, marginBottom: 6 },
  templateName: { fontSize: 14, fontWeight: 700, marginBottom: 4 },
  templateDesc: { fontSize: 11, color: '#6b7280', lineHeight: 1.4 },

  // 필드
  fieldsBox: { display: 'flex', flexDirection: 'column', gap: 14 },

  // 결과 다양화
  varGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: 12,
  },
  varNote: {
    marginTop: 12,
    padding: '10px 14px',
    background: '#fef3c7',
    border: '1px solid #fde68a',
    borderRadius: 6,
    fontSize: 12,
    color: '#78350f',
    lineHeight: 1.5,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    justifyContent: 'space-between',
  },

  // 이벤트 운영 정보
  evGroup: {
    padding: 14,
    background: '#fafafa',
    border: '1px solid #e5e7eb',
    borderRadius: 8,
    marginBottom: 12,
  },
  evGroupTitle: {
    fontSize: 13,
    fontWeight: 700,
    color: '#374151',
    marginBottom: 10,
  },
  evGrid2: {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr',
    gap: 10,
  },
  evGrid3: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1.5fr',
    gap: 10,
  },
  evPreview: {
    marginTop: 10,
    padding: '8px 12px',
    background: '#f0fdf4',
    border: '1px solid #bbf7d0',
    borderRadius: 6,
    fontSize: 12,
    color: '#15803d',
  },
  field: { display: 'block' },
  fieldLabel: {
    display: 'block',
    fontSize: 13,
    fontWeight: 600,
    marginBottom: 6,
    color: '#374151',
  },
  required: { color: '#dc2626' },
  fieldHint: { fontSize: 11, color: '#6b7280', marginTop: 4 },
  input: {
    width: '100%',
    padding: '9px 12px',
    border: '1px solid #d1d5db',
    borderRadius: 8,
    fontSize: 14,
    fontFamily: 'inherit',
    boxSizing: 'border-box',
  },
  select: {
    width: '100%',
    padding: '9px 12px',
    border: '1px solid #d1d5db',
    borderRadius: 8,
    fontSize: 14,
    fontFamily: 'inherit',
    background: '#fff',
    cursor: 'pointer',
  },
  textarea: {
    width: '100%',
    padding: '9px 12px',
    border: '1px solid #d1d5db',
    borderRadius: 8,
    fontSize: 14,
    fontFamily: 'inherit',
    resize: 'vertical',
    boxSizing: 'border-box',
  },

  // 레퍼런스
  refGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
    gap: 12,
  },
  refCard: {
    padding: 0,
    border: '2px solid #e5e7eb',
    borderRadius: 10,
    background: '#fff',
    cursor: 'pointer',
    overflow: 'hidden',
    position: 'relative',
    transition: 'all 0.15s',
  },
  refCardActive: {
    borderColor: '#7c3aed',
    boxShadow: '0 0 0 3px rgba(124, 58, 237, 0.15)',
  },
  refImg: {
    width: '100%',
    height: 100,
    objectFit: 'cover',
    display: 'block',
  },
  refTitle: {
    padding: '8px 10px',
    fontSize: 11,
    fontWeight: 600,
    textAlign: 'left',
    color: '#374151',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  refCheck: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: '50%',
    background: '#7c3aed',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 13,
    fontWeight: 700,
  },
  emptyRef: {
    padding: 32,
    textAlign: 'center',
    background: '#f9fafb',
    border: '2px dashed #e5e7eb',
    borderRadius: 8,
    color: '#6b7280',
    fontSize: 13,
  },
  link: { color: '#7c3aed', fontWeight: 600, textDecoration: 'underline' },
  selectedInfo: {
    marginTop: 12,
    fontSize: 12,
    color: '#7c3aed',
    fontWeight: 600,
  },

  // 제품 카테고리
  productGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 10,
    marginBottom: 12,
  },
  productCard: {
    padding: '18px 14px',
    border: '2px solid #e5e7eb',
    borderRadius: 10,
    background: '#fff',
    cursor: 'pointer',
    textAlign: 'center',
    transition: 'all 0.15s',
  },
  productCardActive: {
    borderColor: '#7c3aed',
    background: '#faf5ff',
    boxShadow: '0 0 0 3px rgba(124, 58, 237, 0.1)',
  },
  productEmoji: { fontSize: 32, marginBottom: 8 },
  productName: { fontSize: 15, fontWeight: 700, color: '#1f2937', marginBottom: 2 },
  productNameEn: { fontSize: 11, color: '#6b7280' },

  subOptionsRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 12,
  },
  subOption: { display: 'block' },

  // 라이브러리 그리드
  libraryBlock: {
    marginTop: 18,
    padding: 14,
    background: '#fff7ed',
    border: '1px solid #fed7aa',
    borderRadius: 10,
  },
  libraryHead: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  libraryTitle: {
    fontSize: 13,
    fontWeight: 700,
    color: '#9a3412',
  },
  libraryLink: {
    fontSize: 11,
    color: '#7c3aed',
    fontWeight: 600,
    textDecoration: 'none',
  },
  libraryLinkInline: {
    fontSize: 12,
    color: '#7c3aed',
    fontWeight: 600,
    marginLeft: 6,
  },
  libraryDesc: {
    margin: '0 0 10px',
    fontSize: 11,
    color: '#7c2d12',
    lineHeight: 1.5,
  },
  libraryEmpty: {
    padding: '14px 12px',
    background: '#fff',
    border: '1px dashed #fed7aa',
    borderRadius: 8,
    fontSize: 12,
    color: '#7c2d12',
    textAlign: 'center',
  },
  libraryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
    gap: 8,
  },
  libraryCard: {
    position: 'relative',
    padding: 0,
    border: '2px solid #fed7aa',
    borderRadius: 8,
    background: '#fff',
    cursor: 'pointer',
    overflow: 'hidden',
    minHeight: 110,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'flex-start',
    transition: 'all 0.15s',
  },
  libraryCardActive: {
    borderColor: '#ea580c',
    boxShadow: '0 0 0 3px rgba(234, 88, 12, 0.15)',
  },
  libraryImg: {
    width: '100%',
    height: 80,
    objectFit: 'cover',
    display: 'block',
  },
  libraryName: {
    width: '100%',
    padding: '4px 6px',
    fontSize: 10,
    fontWeight: 600,
    color: '#1f2937',
    textAlign: 'center',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  libraryNoneIcon: {
    fontSize: 28,
    color: '#9ca3af',
    marginTop: 18,
  },
  libraryNoneLabel: {
    fontSize: 10,
    fontWeight: 600,
    color: '#6b7280',
    marginTop: 6,
    marginBottom: 4,
  },
  libraryCheck: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 18,
    height: 18,
    borderRadius: '50%',
    background: '#ea580c',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 10,
    fontWeight: 700,
  },
  libraryInfo: {
    marginTop: 10,
    padding: '8px 12px',
    background: '#fff',
    border: '1px solid #fed7aa',
    borderRadius: 6,
    fontSize: 12,
    color: '#7c2d12',
  },

  // 보존 강도
  preservationBlock: {
    marginTop: 16,
    padding: 14,
    background: '#faf5ff',
    border: '1px solid #e9d5ff',
    borderRadius: 8,
  },
  preservationTitle: {
    margin: '0 0 10px',
    fontSize: 13,
    fontWeight: 700,
    color: '#6b21a8',
  },
  preservationGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: 8,
  },
  preservationCard: {
    padding: '12px 10px',
    border: '2px solid #e9d5ff',
    borderRadius: 8,
    background: '#fff',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'all 0.15s',
  },
  preservationCardActive: {
    borderColor: '#7c3aed',
    background: 'linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%)',
    boxShadow: '0 0 0 2px rgba(124, 58, 237, 0.15)',
  },
  preservationEmoji: { fontSize: 18, marginBottom: 4 },
  preservationLabel: {
    fontSize: 12,
    fontWeight: 700,
    color: '#1f2937',
    marginBottom: 3,
  },
  preservationDesc: {
    fontSize: 10,
    color: '#6b7280',
    lineHeight: 1.4,
  },

  // 업로드
  uploadBox: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  uploadLabel: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: '32px 16px',
    background: '#fafafa',
    border: '2px dashed #d1d5db',
    borderRadius: 10,
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  uploadLabelDisabled: {
    opacity: 0.6,
    cursor: 'wait',
  },
  uploadText: {
    fontSize: 13,
    fontWeight: 600,
    color: '#374151',
  },
  uploadSub: {
    fontSize: 11,
    color: '#9ca3af',
  },
  uploadedBox: {
    display: 'flex',
    gap: 14,
    padding: 14,
    background: '#f0fdf4',
    border: '1px solid #bbf7d0',
    borderRadius: 10,
  },
  uploadedImg: {
    width: 120,
    height: 120,
    objectFit: 'cover',
    borderRadius: 8,
    border: '1px solid #bbf7d0',
    background: '#fff',
  },
  uploadedInfo: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    minWidth: 0,
  },
  uploadedTitle: {
    fontSize: 13,
    fontWeight: 700,
    color: '#15803d',
    marginBottom: 6,
  },
  uploadedUrl: {
    fontSize: 11,
    color: '#374151',
    fontFamily: 'SF Mono, Monaco, Consolas, monospace',
    wordBreak: 'break-all',
    background: '#fff',
    padding: '6px 8px',
    borderRadius: 4,
    border: '1px solid #d1fae5',
    marginBottom: 8,
  },
  uploadedActions: {
    display: 'flex',
    gap: 6,
  },
  smallBtn: {
    padding: '5px 10px',
    background: '#fff',
    color: '#15803d',
    border: '1px solid #bbf7d0',
    borderRadius: 6,
    fontSize: 11,
    fontWeight: 600,
    cursor: 'pointer',
  },
  smallBtnDanger: {
    padding: '5px 10px',
    background: '#fff',
    color: '#dc2626',
    border: '1px solid #fecaca',
    borderRadius: 6,
    fontSize: 11,
    fontWeight: 600,
    cursor: 'pointer',
  },

  // 도구
  toolGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
    gap: 10,
  },
  toolCard: {
    padding: '14px 12px',
    border: '2px solid #e5e7eb',
    borderRadius: 10,
    background: '#fff',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'all 0.15s',
  },
  toolCardActive: {
    borderColor: '#7c3aed',
    background: '#faf5ff',
  },
  toolEmoji: { fontSize: 20, marginBottom: 4 },
  toolName: { fontSize: 13, fontWeight: 700, marginBottom: 2 },
  toolDesc: { fontSize: 10, color: '#6b7280', lineHeight: 1.4 },

  // 생성
  generateBtn: {
    width: '100%',
    padding: '14px 24px',
    background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    fontSize: 15,
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  generateBtnDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
  errorBox: {
    marginTop: 12,
    padding: '12px 16px',
    background: '#fef2f2',
    color: '#dc2626',
    border: '1px solid #fecaca',
    borderRadius: 8,
    fontSize: 13,
  },

  // 결과
  resultBox: {
    marginTop: 20,
    padding: 16,
    background: '#f0fdf4',
    border: '1px solid #bbf7d0',
    borderRadius: 10,
  },
  resultHead: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    fontSize: 14,
    fontWeight: 700,
    color: '#15803d',
  },
  resultMeta: {
    fontSize: 11,
    fontWeight: 400,
    color: '#6b7280',
  },

  // 사용법 가이드
  guideBox: {
    marginBottom: 12,
    padding: 14,
    background: '#fffbeb',
    border: '1px solid #fde68a',
    borderRadius: 8,
  },
  guideTitle: {
    fontSize: 13,
    fontWeight: 700,
    color: '#92400e',
    marginBottom: 10,
  },
  libAutoNotice: {
    padding: '8px 12px',
    background: '#faf5ff',
    border: '1px solid #e9d5ff',
    borderRadius: 6,
    fontSize: 11,
    color: '#6b21a8',
    marginBottom: 10,
    lineHeight: 1.5,
  },
  guideSteps: {
    margin: '0 0 8px',
    padding: '0 0 0 24px',
    fontSize: 12,
    color: '#451a03',
    lineHeight: 1.7,
  },
  guideStep: {
    marginBottom: 4,
  },
  guideTip: {
    marginTop: 10,
    padding: '8px 10px',
    background: 'rgba(254, 243, 199, 0.5)',
    border: '1px solid #fde68a',
    borderRadius: 6,
    fontSize: 11,
    color: '#78350f',
    lineHeight: 1.5,
  },
  imgDownload: {
    marginTop: 10,
    padding: '8px 10px',
    background: '#fff',
    border: '1px solid #fde68a',
    borderRadius: 6,
    fontSize: 11,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  imgDownloadLabel: {
    color: '#92400e',
    fontWeight: 600,
    flexShrink: 0,
  },
  imgDownloadLink: {
    color: '#7c3aed',
    textDecoration: 'underline',
    fontFamily: 'SF Mono, Monaco, Consolas, monospace',
    fontSize: 11,
    wordBreak: 'break-all',
  },
  resultText: {
    width: '100%',
    padding: 12,
    border: '1px solid #d1d5db',
    borderRadius: 8,
    fontSize: 13,
    fontFamily: 'SF Mono, Monaco, Consolas, monospace',
    lineHeight: 1.6,
    background: '#fff',
    boxSizing: 'border-box',
    resize: 'vertical',
  },
  resultActions: {
    display: 'flex',
    gap: 8,
    marginTop: 12,
  },
  copyBtn: {
    padding: '10px 18px',
    background: '#fff',
    color: '#15803d',
    border: '1px solid #bbf7d0',
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  copyBtnCopied: {
    background: '#15803d',
    color: '#fff',
    borderColor: '#15803d',
  },
  openBtn: {
    padding: '10px 18px',
    background: '#111827',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
    flex: 1,
  },
};

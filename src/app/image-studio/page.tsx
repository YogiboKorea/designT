'use client';
/**
 * /image-studio — 레퍼런스 풍으로 생성한 이미지 라이브러리
 * ─────────────────────────────────────────────────────────────────
 * 탭 2개:
 *   ① 갤러리    — 폴더별로 생성물을 모아 보고, 이벤트/배너에서 가져다 쓴다
 *   ② 생성 과정 — "이 레퍼런스로 이렇게 만들어졌다" 를 실제 데이터로 설명
 *
 * ⚠️ 여기 이미지들은 **텍스트가 없는 순수 비주얼**이다.
 *    한글 카피·CTA·할인율은 배너 생성(/banner/cafe24 → /main-visual)에서 얹는다.
 *    그래서 카드마다 "카피 자리"(textSafeArea)를 같이 표시해준다.
 *
 * 생성 자체는 이 화면에서 하지 않는다.
 * Higgsfield 는 외부 도구라 서버에서 호출할 수 없어서, 생성은 Claude Code 세션에서
 * 돌리고 결과만 여기로 등록된다 (POST /api/generated-images).
 * ─────────────────────────────────────────────────────────────────
 */
import { useState, useEffect, CSSProperties } from 'react';
import AppShell from '@/components/AppShell';

interface Folder {
  _id: string;
  name: string;
  slug: string;
  emoji: string;
  color: string;
  description: string;
  imageCount: number;
  updatedAt: string;
}

interface InputImage {
  kind: 'reference' | 'product';
  title: string;
  url: string;
  role?: string;
}

interface GenImage {
  _id: string;
  folderId: string;
  title: string;
  imageUrl: string;
  sourceImageUrl: string;
  width: number;
  height: number;
  prompt: string;
  model: string;
  provider: string;
  elementId: string;
  textSafeArea: string;
  inputImages: InputImage[];
  tags: string[];
  note: string;
  createdAt: string;
}

const KIND_LABEL: Record<string, string> = {
  reference: '📚 레퍼런스 (풍)',
  product: '📦 제품 (형태·색)',
};

/** "이 이미지들로 만들어졌다" — 입력 이미지 계보 */
function Lineage({ inputs, result }: { inputs: InputImage[]; result?: string }) {
  if (!inputs?.length) return null;
  return (
    <div style={S.lineage}>
      <div style={S.lineageTitle}>이 이미지들로 생성되었습니다</div>
      <div style={S.lineageRow}>
        {inputs.map((inp, i) => (
          <div key={inp.url + i} style={S.lineageItem}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={inp.url} alt={inp.title} style={S.lineageImg} />
            <div style={S.lineageKind}>{KIND_LABEL[inp.kind] ?? inp.kind}</div>
            <div style={S.lineageName}>{inp.title}</div>
            {inp.role && <div style={S.lineageRole}>{inp.role}</div>}
          </div>
        ))}
        {result && (
          <>
            <div style={S.arrow}>→</div>
            <div style={S.lineageItem}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={result} alt="결과" style={S.lineageImg} />
              <div style={{ ...S.lineageKind, color: '#fe6326' }}>✨ 결과</div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const SAFE_AREA_LABEL: Record<string, string> = {
  left: '◧ 좌측 비움',
  right: '◨ 우측 비움',
  top: '⬒ 상단 비움',
  bottom: '⬓ 하단 비움',
  center: '⬛ 중앙 비움',
  none: '— 여백 없음',
};

type Tab = 'gallery' | 'process';

export default function ImageStudioPage() {
  const [tab, setTab] = useState<Tab>('gallery');

  const [folders, setFolders] = useState<Folder[]>([]);
  const [images, setImages] = useState<GenImage[]>([]);
  const [activeFolder, setActiveFolder] = useState<string>(''); // '' = 전체
  const [loading, setLoading] = useState(true);

  // 새 폴더
  const [newFolderName, setNewFolderName] = useState('');
  const [creating, setCreating] = useState(false);

  // 상세 보기
  const [detail, setDetail] = useState<GenImage | null>(null);
  // 카드 하단 프롬프트/계보 펼침 상태
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const loadFolders = () => {
    fetch('/api/generated-images/folders')
      .then((r) => r.json())
      .then((d) => { if (d.ok) setFolders(d.items); })
      .catch(console.error);
  };

  const loadImages = (folderId: string) => {
    setLoading(true);
    const qs = folderId ? `?folderId=${folderId}` : '';
    fetch(`/api/generated-images${qs}`)
      .then((r) => r.json())
      .then((d) => { if (d.ok) setImages(d.items); })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadFolders(); }, []);
  useEffect(() => { loadImages(activeFolder); }, [activeFolder]);

  const createFolder = async () => {
    const name = newFolderName.trim();
    if (!name) return;
    setCreating(true);
    try {
      const res = await fetch('/api/generated-images/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.message);
      setNewFolderName('');
      loadFolders();
    } catch (err: any) {
      alert(err?.message ?? '폴더 생성 실패');
    } finally {
      setCreating(false);
    }
  };

  const copyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      alert('이미지 URL 복사됨.\n배너 생성 / 이벤트 페이지에 붙여넣어 사용하세요.');
    } catch {
      alert('복사 실패. 주소를 직접 선택해 복사해주세요.');
    }
  };

  const copyPrompt = async (prompt: string) => {
    try {
      await navigator.clipboard.writeText(prompt);
      alert('프롬프트 복사됨.\n같은 구성으로 다시 생성하거나, 일부만 고쳐서 변형을 만들 수 있습니다.');
    } catch {
      alert('복사 실패. 아래 내용을 직접 선택해 복사해주세요.');
    }
  };

  return (
    <AppShell>
      <div style={S.page}>
        {/* 헤더 */}
        <div style={S.header}>
          <div style={S.crumb}>콘텐츠 자산 › 이미지 생성</div>
          <h1 style={S.title}>🖼️ 이미지 생성</h1>
          <p style={S.desc}>
            등록된 <strong style={S.strong}>레퍼런스의 “풍”</strong>을 따라, 우리 제품을 접목한
            배너 비주얼을 만들어 폴더로 관리합니다. 여기 이미지는{' '}
            <strong style={S.strong}>텍스트가 없는 순수 비주얼</strong>이며, 한글 카피는{' '}
            <strong style={S.strong}>배너 생성</strong>에서 얹습니다.
          </p>
        </div>

        {/* 탭 */}
        <div style={S.tabs}>
          <button
            type="button"
            onClick={() => setTab('gallery')}
            style={{ ...S.tab, ...(tab === 'gallery' ? S.tabActive : {}) }}
          >
            📁 갤러리
          </button>
          <button
            type="button"
            onClick={() => setTab('process')}
            style={{ ...S.tab, ...(tab === 'process' ? S.tabActive : {}) }}
          >
            🔬 생성 과정
          </button>
        </div>

        {tab === 'gallery' ? (
          <>
            {/* 폴더 줄 */}
            <section style={S.section}>
              <div style={S.sectionHead}>
                <h2 style={S.h2}>① 폴더</h2>
                <div style={S.newFolder}>
                  <input
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') createFolder(); }}
                    placeholder="새 폴더명 (예: 2026-09 가을신상)"
                    style={S.input}
                  />
                  <button
                    type="button"
                    onClick={createFolder}
                    disabled={creating || !newFolderName.trim()}
                    style={{ ...S.btn, ...(creating || !newFolderName.trim() ? S.btnOff : {}) }}
                  >
                    ➕ 폴더 만들기
                  </button>
                </div>
              </div>

              <div style={S.folderRow}>
                <button
                  type="button"
                  onClick={() => setActiveFolder('')}
                  style={{ ...S.folderChip, ...(activeFolder === '' ? S.folderChipActive : {}) }}
                >
                  🗂️ 전체
                </button>
                {folders.map((f) => (
                  <button
                    key={f._id}
                    type="button"
                    onClick={() => setActiveFolder(f._id)}
                    style={{
                      ...S.folderChip,
                      ...(activeFolder === f._id ? S.folderChipActive : {}),
                    }}
                  >
                    {f.emoji} {f.name}
                    <span style={S.count}>{f.imageCount}</span>
                  </button>
                ))}
                {folders.length === 0 && (
                  <span style={S.empty}>폴더가 없습니다. 위에서 하나 만들어보세요.</span>
                )}
              </div>
            </section>

            {/* 이미지 그리드 */}
            <section style={S.section}>
              <h2 style={S.h2}>
                ② 생성된 이미지 {loading ? '' : `(${images.length}장)`}
              </h2>

              {loading ? (
                <div style={S.empty}>불러오는 중…</div>
              ) : images.length === 0 ? (
                <div style={S.emptyBox}>
                  아직 생성된 이미지가 없습니다.
                  <br />
                  <span style={S.emptySub}>
                    Claude Code 에서 “○○ 레퍼런스로 △△ 제품, □□ 사이즈” 라고 지시하면
                    생성 → FTP 업로드 → 이 폴더 등록까지 진행됩니다.
                  </span>
                </div>
              ) : (
                <div style={S.grid}>
                  {images.map((img) => (
                    <div key={img._id} style={S.card}>
                      <button
                        type="button"
                        onClick={() => setDetail(img)}
                        style={S.cardImgBtn}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={img.imageUrl} alt={img.title} style={S.cardImg} />
                      </button>
                      <div style={S.cardBody}>
                        <div style={S.cardTitle}>{img.title}</div>
                        <div style={S.cardMeta}>
                          {img.width}×{img.height}
                          <span style={S.dot}>·</span>
                          {SAFE_AREA_LABEL[img.textSafeArea] ?? img.textSafeArea}
                        </div>
                        {img.tags.length > 0 && (
                          <div style={S.tagRow}>
                            {img.tags.map((t) => (
                              <span key={t} style={S.tag}>{t}</span>
                            ))}
                          </div>
                        )}
                        <div style={S.cardBtnRow}>
                          <button
                            type="button"
                            onClick={() => copyUrl(img.imageUrl)}
                            style={S.copyBtn}
                          >
                            📋 URL
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setExpanded((p) => ({ ...p, [img._id]: !p[img._id] }))
                            }
                            style={S.copyBtn}
                          >
                            {expanded[img._id] ? '▲ 접기' : '▼ 프롬프트'}
                          </button>
                        </div>

                        {/* 하단: 어떤 이미지로 만들어졌는지 + 실제 사용한 프롬프트 */}
                        {expanded[img._id] && (
                          <div style={S.cardDetail}>
                            <Lineage inputs={img.inputImages} result={img.imageUrl} />
                            <div style={S.promptLabel}>실제 사용한 프롬프트</div>
                            <pre style={S.pre}>{img.prompt || '(기록 없음)'}</pre>
                            <button
                              type="button"
                              onClick={() => copyPrompt(img.prompt)}
                              style={S.copyBtn}
                            >
                              📋 프롬프트 복사
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        ) : (
          <ProcessTab images={images} />
        )}

        {/* 상세 모달 */}
        {detail && (
          <div style={S.overlay} onClick={() => setDetail(null)}>
            <div style={S.modal} onClick={(e) => e.stopPropagation()}>
              <div style={S.modalHead}>
                <strong>{detail.title}</strong>
                <button type="button" onClick={() => setDetail(null)} style={S.close}>✕</button>
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={detail.imageUrl} alt={detail.title} style={S.modalImg} />
              <div style={S.modalBody}>
                <Row label="사이즈" value={`${detail.width} × ${detail.height}`} />
                <Row label="카피 자리" value={SAFE_AREA_LABEL[detail.textSafeArea] ?? detail.textSafeArea} />
                <Row label="생성 도구" value={`${detail.provider} / ${detail.model}`} />
                {detail.elementId && <Row label="Element" value={detail.elementId} />}
                {detail.note && <Row label="메모" value={detail.note} />}
                <Lineage inputs={detail.inputImages} result={detail.imageUrl} />
                <div style={S.promptLabel}>실제 사용한 프롬프트</div>
                <pre style={S.pre}>{detail.prompt || '(기록 없음)'}</pre>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

/** 생성 과정 탭 — 실제 등록 데이터를 근거로 흐름을 설명 */
function ProcessTab({ images }: { images: GenImage[] }) {
  const sample = images[0];

  return (
    <div style={S.section}>
      <h2 style={S.h2}>레퍼런스로 이렇게 만들어집니다</h2>
      <p style={S.pDesc}>
        핵심은 두 가지입니다. <strong style={S.strong}>“풍”은 레퍼런스에서 가져오고, 제품은
        실측 데이터로 고정</strong>합니다. 그리고 텍스트는 절대 그리지 않고{' '}
        <strong style={S.strong}>자리만 비워둡니다</strong>.
      </p>

      <div style={S.steps}>
        <Step
          n="①"
          title="레퍼런스 선택 — “풍”의 출처"
          body="이전 작업자들이 만든 배너를 레퍼런스로 등록해 둡니다. 조명 방향, 벽·바닥 재질, 색온도, 소품 밀도, 카메라 높이를 그대로 가져옵니다. 이미지 자체를 생성 모델에 넣기 때문에, 말로 설명하는 것보다 훨씬 정확하게 재현됩니다."
        />
        <Step
          n="②"
          title="제품 선택 — 카테고리 단어를 쓰지 않는다"
          body='"beanbag" 이라고만 쓰면 둥근 공이나 라운저로 그려집니다. 그래서 실측으로 확립한 4종 세트를 넣습니다 — ⓐ 기하 서술(“양 끝이 둥근 긴 알약 형태, 팔걸이 없음”) ⓑ 정확한 치수(70×45×170cm) ⓒ NOT 네거티브(“공 아님, 매트리스 아님, 웨지 아님”) ⓓ 인체 대비 앵커(“성인 키만큼 길다”).'
        />
        <Step
          n="②-1"
          title="색상은 hex 로 고정 — 미지정이면 대표색"
          body="색을 정하지 않고 넘기면 모델이 매번 다른 색으로 그려서, 같은 캠페인 안에서도 배너마다 제품 색이 달라집니다. 그래서 “미지정 = 랜덤”이 아니라 “미지정 = 대표색”으로 못박습니다. 맥스는 언급이 없으면 네이비블루(#1D395D)로 제작됩니다. 다른 색이 필요하면 지시할 때 색상만 말하면 됩니다 — 맥스는 18색이 hex 와 8방향 실사까지 등록돼 있습니다."
        />
        <Step
          n="③"
          title="사이즈 → 구도·크롭 자동 계산"
          body="생성 모델은 임의 픽셀을 받지 못하고 비율 프리셋만 받습니다. 목표 사이즈에서 가장 가까운 비율을 고르고, 잘려나갈 양을 미리 계산해 프롬프트에 반영합니다. 가로형은 좌측을, 세로형(모바일)은 상단을 비우도록 구도 지시가 자동으로 바뀝니다."
        />
        <Step
          n="④"
          title="텍스트 세이프존 확보 — 빠뜨리면 못 씀"
          body='"텍스트 넣지 마" 만 지시하면 AI 가 화면을 제품과 소품으로 꽉 채워서, 정작 카피 얹을 자리가 안 남습니다. “좌측 45%는 오브젝트도 패턴도 그림자 경계도 없는 깨끗한 면으로 비워라” 라고 명시해야 배너로 쓸 수 있는 결과가 나옵니다.'
        />
        <Step
          n="⑤"
          title="크롭 → FTP 업로드 → 폴더 등록"
          body="생성물을 목표 사이즈로 크롭하고, cafe24 FTP 에 올린 뒤 이 라이브러리에 등록합니다. 파일명은 항상 ASCII 로 만듭니다 — 한글 파일명은 서버가 404 를 냅니다."
        />
        <Step
          n="⑥"
          title="배너 생성에서 텍스트 얹기"
          body="여기까지가 이미지 담당입니다. 한글 헤드라인·CTA·할인율·기간은 배너 생성 에디터에서 얹습니다. AI 한글 렌더링에 의존하지 않기 때문에 오타나 깨진 글자가 나오지 않고, 카피만 바꿔서 여러 벌을 뽑을 수도 있습니다."
        />
      </div>

      {images.length === 0 && (
        <div style={S.emptyBox}>
          아직 사례가 없습니다. 갤러리에 이미지가 등록되면
          <br />
          <span style={S.emptySub}>여기에 “무엇으로 어떻게 만들어졌는지”가 자동으로 표시됩니다.</span>
        </div>
      )}

      {/* 등록된 모든 결과물의 계보 + 실제 프롬프트 */}
      {images.map((img) => (
        <div key={img._id} style={S.sampleBox}>
          <div style={S.sampleHead}>실제 사례 — {img.title}</div>

          <Lineage inputs={img.inputImages} result={img.imageUrl} />

          <div style={S.sampleGrid}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img.imageUrl} alt={img.title} style={S.sampleImg} />
            <div style={S.sampleMeta}>
              <Row label="사이즈" value={`${img.width} × ${img.height}`} />
              <Row label="카피 자리" value={SAFE_AREA_LABEL[img.textSafeArea] ?? img.textSafeArea} />
              <Row label="생성 도구" value={`${img.provider} / ${img.model}`} />
              {img.note && <Row label="구성" value={img.note} />}
            </div>
          </div>

          <div style={S.promptLabel}>실제로 사용한 프롬프트</div>
          <pre style={S.pre}>{img.prompt || '(기록 없음)'}</pre>
        </div>
      ))}
    </div>
  );
}

function Step({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div style={S.step}>
      <div style={S.stepN}>{n}</div>
      <div>
        <div style={S.stepTitle}>{title}</div>
        <div style={S.stepBody}>{body}</div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={S.row}>
      <span style={S.rowLabel}>{label}</span>
      <span style={S.rowValue}>{value}</span>
    </div>
  );
}

const S: Record<string, CSSProperties> = {
  page: { maxWidth: 1200, margin: '0 auto', padding: '28px 28px 80px' },
  header: { marginBottom: 20 },
  crumb: { fontSize: 12, color: '#94a3b8', marginBottom: 8 },
  title: { fontSize: 26, fontWeight: 800, color: '#111827', margin: '0 0 8px' },
  desc: { fontSize: 14, color: '#6b7280', lineHeight: 1.7, margin: 0 },
  strong: { color: '#fe6326', fontWeight: 700 },

  tabs: { display: 'flex', gap: 8, borderBottom: '1px solid #e5e7eb', marginBottom: 22 },
  tab: {
    padding: '10px 18px', fontSize: 14, fontWeight: 600, color: '#6b7280',
    background: 'none', border: 'none', borderBottom: '2px solid transparent', cursor: 'pointer',
  },
  tabActive: { color: '#fe6326', borderBottom: '2px solid #fe6326' },

  section: { marginBottom: 32 },
  sectionHead: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    gap: 12, marginBottom: 12, flexWrap: 'wrap',
  },
  h2: { fontSize: 16, fontWeight: 700, color: '#111827', margin: '0 0 12px' },
  pDesc: { fontSize: 14, color: '#6b7280', lineHeight: 1.8, margin: '0 0 20px' },

  newFolder: { display: 'flex', gap: 8 },
  input: {
    padding: '8px 12px', fontSize: 13, border: '1px solid #d1d5db',
    borderRadius: 8, width: 240, outline: 'none',
  },
  btn: {
    padding: '8px 14px', fontSize: 13, fontWeight: 600, color: '#fff',
    background: '#fe6326', border: 'none', borderRadius: 8, cursor: 'pointer',
  },
  btnOff: { background: '#d1d5db', cursor: 'not-allowed' },

  folderRow: { display: 'flex', flexWrap: 'wrap', gap: 8 },
  folderChip: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '8px 14px', fontSize: 13, fontWeight: 600, color: '#374151',
    background: '#fff', border: '1px solid #e5e7eb', borderRadius: 999, cursor: 'pointer',
  },
  folderChipActive: { background: '#fff7ed', borderColor: '#fe6326', color: '#fe6326' },
  count: {
    fontSize: 11, fontWeight: 700, color: '#9ca3af',
    background: '#f3f4f6', borderRadius: 999, padding: '1px 7px',
  },

  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 },
  card: {
    background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10,
    overflow: 'hidden', position: 'relative',
  },
  cardImgBtn: { display: 'block', width: '100%', padding: 0, border: 'none', background: 'none', cursor: 'pointer' },
  cardImg: { width: '100%', aspectRatio: '16/10', objectFit: 'cover', background: '#f3f4f6', display: 'block' },
  cardBody: { padding: '10px 12px 12px' },
  cardTitle: { fontSize: 13, fontWeight: 700, color: '#111827', marginBottom: 4, lineHeight: 1.4 },
  cardMeta: { fontSize: 11, color: '#6b7280', marginBottom: 8 },
  dot: { margin: '0 6px', color: '#d1d5db' },
  tagRow: { display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 },
  tag: { fontSize: 10, color: '#6b7280', background: '#f3f4f6', borderRadius: 4, padding: '2px 6px' },
  copyBtn: {
    width: '100%', padding: '7px 0', fontSize: 12, fontWeight: 600, color: '#374151',
    background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 6, cursor: 'pointer',
  },
  cardBtnRow: { display: 'flex', gap: 6 },
  cardDetail: { marginTop: 12, paddingTop: 12, borderTop: '1px dashed #e5e7eb' },

  lineage: {
    margin: '14px 0', padding: 14,
    background: '#fafafa', border: '1px solid #e5e7eb', borderRadius: 10,
  },
  lineageTitle: { fontSize: 12, fontWeight: 700, color: '#6b7280', marginBottom: 10 },
  lineageRow: { display: 'flex', gap: 10, alignItems: 'flex-start', flexWrap: 'wrap' },
  lineageItem: { width: 150, flexShrink: 0 },
  lineageImg: {
    width: '100%', aspectRatio: '16/10', objectFit: 'cover',
    borderRadius: 6, background: '#f3f4f6', display: 'block', border: '1px solid #e5e7eb',
  },
  lineageKind: { fontSize: 10, fontWeight: 700, color: '#6b7280', marginTop: 6 },
  lineageName: { fontSize: 11, color: '#111827', lineHeight: 1.4, marginTop: 2 },
  lineageRole: { fontSize: 10, color: '#9ca3af', lineHeight: 1.5, marginTop: 3 },
  arrow: { fontSize: 20, color: '#fe6326', alignSelf: 'center', fontWeight: 700 },

  empty: { fontSize: 13, color: '#9ca3af' },
  emptyBox: {
    padding: '40px 20px', textAlign: 'center', fontSize: 14, color: '#6b7280',
    background: '#f9fafb', border: '1px dashed #d1d5db', borderRadius: 10, lineHeight: 1.8,
  },
  emptySub: { fontSize: 12, color: '#9ca3af' },

  steps: { display: 'flex', flexDirection: 'column', gap: 14 },
  step: {
    display: 'flex', gap: 14, padding: 16,
    background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10,
  },
  stepN: { fontSize: 18, fontWeight: 800, color: '#fe6326', flexShrink: 0, lineHeight: 1.4 },
  stepTitle: { fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 6 },
  stepBody: { fontSize: 13, color: '#6b7280', lineHeight: 1.8 },

  sampleBox: {
    marginTop: 28, padding: 18,
    background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10,
  },
  sampleHead: { fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 14 },
  sampleGrid: { display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16, alignItems: 'start' },
  sampleImg: { width: '100%', borderRadius: 8, display: 'block', background: '#f3f4f6' },
  sampleMeta: { display: 'flex', flexDirection: 'column', gap: 8 },

  row: { display: 'flex', gap: 10, fontSize: 12, lineHeight: 1.7 },
  rowLabel: { color: '#9ca3af', minWidth: 62, flexShrink: 0 },
  rowValue: { color: '#374151', wordBreak: 'break-all' },

  promptLabel: { fontSize: 12, fontWeight: 700, color: '#6b7280', margin: '18px 0 6px' },
  pre: {
    fontSize: 11, lineHeight: 1.7, color: '#374151', background: '#f9fafb',
    border: '1px solid #e5e7eb', borderRadius: 8, padding: 14,
    whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0, maxHeight: 320, overflowY: 'auto',
  },

  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(17,24,39,0.6)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 24,
  },
  modal: {
    background: '#fff', borderRadius: 12, maxWidth: 960, width: '100%',
    maxHeight: '90vh', overflowY: 'auto',
  },
  modalHead: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '14px 18px', borderBottom: '1px solid #e5e7eb', fontSize: 14,
  },
  close: { background: 'none', border: 'none', fontSize: 16, color: '#9ca3af', cursor: 'pointer' },
  modalImg: { width: '100%', display: 'block', background: '#f3f4f6' },
  modalBody: { padding: 18, display: 'flex', flexDirection: 'column', gap: 8 },
};

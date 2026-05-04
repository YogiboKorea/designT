'use client';
/**
 * /references/import — 레퍼런스 일괄 등록 통합 페이지
 *
 * 3가지 등록 방식을 한 화면에서 선택:
 *   ① 기존 DB 작업물 표시  → /api/references/migrate-events
 *   ② FTP 디렉토리 스캔     → /api/references/scan-ftp
 *   ③ URL 목록 붙여넣기     → /api/references/bulk-url
 */
import { useState, CSSProperties } from 'react';
import TopNav from '@/components/TopNav';

type Mode = 'migrate-db' | 'scan-ftp' | 'bulk-url';

export default function ReferenceImportPage() {
  const [mode, setMode] = useState<Mode>('migrate-db');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // mode: migrate-db
  const [recentMonths, setRecentMonths] = useState(12);

  // mode: scan-ftp
  const [ftpDir, setFtpDir] = useState('/web/img/design/');
  const [baseUrl, setBaseUrl] = useState(
    'https://yogibo.openhost.cafe24.com/web/img/design/',
  );
  const [ftpLimit, setFtpLimit] = useState(100);

  // mode: bulk-url
  const [urlList, setUrlList] = useState('');

  // 공통 옵션
  const [analyzeWithAI, setAnalyzeWithAI] = useState(false);
  const [dryRun, setDryRun] = useState(true);
  const [defaultTagsText, setDefaultTagsText] = useState('');

  const validUrlCount = urlList
    .split(/[\n,]+/)
    .filter((s) => /^https?:\/\//i.test(s.trim())).length;

  const submit = async () => {
    setLoading(true);
    setResult(null);
    try {
      const tags = defaultTagsText
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      let res: Response;

      if (mode === 'migrate-db') {
        res = await fetch('/api/references/migrate-events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filter: { recentMonths },
            autoTag: true,
            dryRun,
          }),
        });
      } else if (mode === 'scan-ftp') {
        res = await fetch('/api/references/scan-ftp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            remoteDir: ftpDir,
            baseUrl,
            limit: ftpLimit,
            analyzeWithAI,
            dryRun,
            defaultTags: tags,
          }),
        });
      } else {
        res = await fetch('/api/references/bulk-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            urls: urlList,
            analyzeWithAI,
            dryRun,
            defaultTags: tags,
          }),
        });
      }

      const json = await res.json();
      setResult(json);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '실패';
      setResult({ ok: false, message: msg });
    } finally {
      setLoading(false);
    }
  };

  const tabDefs: Array<[Mode, string, string]> = [
    ['migrate-db', '① 기존 DB 작업물 표시', '빌더로 만든 EventPage 일괄 isReference 화'],
    ['scan-ftp', '② FTP 디렉토리 스캔', '서버 이미지 폴더 자동 스캔'],
    ['bulk-url', '③ URL 목록 붙여넣기', '외부 이미지 URL 일괄 등록'],
  ];

  return (
    <>
      <TopNav active="import" />
      <div style={S.page}>
        <header style={S.hd}>
        <h1 style={S.h1}>📥 레퍼런스 일괄 등록</h1>
        <p style={S.lead}>
          작년 작업물을 한 번에 레퍼런스로 등록합니다. 등록된 레퍼런스는
          빌더의 AI 자동 디자인 기능에서 학습 자료로 사용됩니다.
        </p>
      </header>

      {/* 탭 */}
      <div style={S.tabs}>
        {tabDefs.map(([m, label, hint]) => (
          <button
            key={m}
            type="button"
            onClick={() => {
              setMode(m);
              setResult(null);
            }}
            style={{
              ...S.tab,
              ...(mode === m ? S.tabActive : {}),
            }}
          >
            <div style={S.tabLabel}>{label}</div>
            <div style={S.tabHint}>{hint}</div>
          </button>
        ))}
      </div>

      {/* 모드별 폼 */}
      <div style={S.form}>
        {mode === 'migrate-db' && (
          <>
            <h3 style={S.h3}>EventPage 일괄 레퍼런스화</h3>
            <p style={S.formDesc}>
              기존 빌더 DB 의 EventPage 컬렉션에서 조건에 맞는 항목 전체에
              isReference=true 표시. 제목 키워드 + 작성월 기반 자동 태깅 포함.
              이미 isReference 인 항목은 건너뜁니다.
            </p>

            <div>
              <label>
                최근&nbsp;
                <input
                  type="number"
                  value={recentMonths}
                  onChange={(e) => setRecentMonths(Number(e.target.value))}
                  min={1}
                  max={120}
                  style={{ ...S.input, width: 70 }}
                />
                &nbsp;개월 작업물
              </label>
            </div>
          </>
        )}

        {mode === 'scan-ftp' && (
          <>
            <h3 style={S.h3}>FTP 디렉토리 스캔</h3>
            <p style={S.formDesc}>
              FTP 서버의 이미지 파일을 자동 등록. 환경변수
              <code style={S.code}> FTP_HOST / FTP_USER / FTP_PASS </code>
              가 설정되어 있어야 합니다 (기존 /api/ftp 와 동일).
            </p>

            <label style={S.field}>
              <span style={S.label}>FTP 경로 (절대 경로)</span>
              <input
                value={ftpDir}
                onChange={(e) => setFtpDir(e.target.value)}
                placeholder="/web/img/design/2024/"
                style={S.input}
              />
            </label>
            <label style={S.field}>
              <span style={S.label}>공개 베이스 URL</span>
              <input
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="https://yogibo.openhost.cafe24.com/web/img/design/2024/"
                style={S.input}
              />
            </label>
            <label style={S.field}>
              <span style={S.label}>최대 처리 개수</span>
              <input
                type="number"
                value={ftpLimit}
                onChange={(e) => setFtpLimit(Number(e.target.value))}
                min={1}
                max={500}
                style={{ ...S.input, width: 100 }}
              />
            </label>
          </>
        )}

        {mode === 'bulk-url' && (
          <>
            <h3 style={S.h3}>URL 목록 일괄 등록</h3>
            <p style={S.formDesc}>
              한 줄에 하나씩, 또는 쉼표로 구분된 URL 을 붙여넣으세요.
              <code style={S.code}> http(s):// </code> 로 시작하지 않는 줄은 자동 무시됩니다.
            </p>

            <textarea
              value={urlList}
              onChange={(e) => setUrlList(e.target.value)}
              rows={10}
              placeholder={`https://cdn.example.com/event/2024/banner1.jpg
https://cdn.example.com/event/2024/banner2.jpg
...`}
              style={{
                ...S.input,
                fontFamily: 'SF Mono, Monaco, Consolas, monospace',
                fontSize: 12,
                lineHeight: 1.6,
                resize: 'vertical',
              }}
            />
            <div style={S.muted}>
              유효한 URL: <strong>{validUrlCount}</strong>개
            </div>
          </>
        )}

        {/* 공통 옵션 */}
        <div style={S.opts}>
          <h4 style={S.h4}>공통 옵션</h4>

          {mode !== 'migrate-db' && (
            <label style={S.field}>
              <span style={S.label}>기본 태그 (쉼표로 구분)</span>
              <input
                value={defaultTagsText}
                onChange={(e) => setDefaultTagsText(e.target.value)}
                placeholder="2024, archive, summer"
                style={S.input}
              />
            </label>
          )}

          {mode !== 'migrate-db' && (
            <label style={S.check}>
              <input
                type="checkbox"
                checked={analyzeWithAI}
                onChange={(e) => setAnalyzeWithAI(e.target.checked)}
              />
              <span>
                AI 디자인 토큰 분석 함께 실행 — Claude Haiku 4.5 사용,
                건당 약 $0.003 (이미지 1장당 1.5초 간격).
                <br />
                <small style={S.muted}>
                  비활성화 시 등록만 빠르게 하고, 분석은 야간 배치(scripts/analyze-references.mjs)로 별도 실행 권장.
                </small>
              </span>
            </label>
          )}

          <label style={S.check}>
            <input
              type="checkbox"
              checked={dryRun}
              onChange={(e) => setDryRun(e.target.checked)}
            />
            <span>시뮬레이션만 실행 (실제 DB 변경 없음, 결과만 미리보기)</span>
          </label>
        </div>

        <button
          onClick={submit}
          disabled={loading}
          style={{
            ...S.run,
            ...(loading ? S.runDisabled : {}),
          }}
        >
          {loading ? '처리 중…' : dryRun ? '🔍 미리보기' : '✅ 실행'}
        </button>
      </div>

      {/* 결과 */}
      {result && (
        <div
          style={{
            ...S.result,
            ...(result.ok ? S.resultOk : S.resultErr),
          }}
        >
          <div style={S.resultHead}>
            {result.ok ? '✅ 성공' : '❌ 실패'}
            {result.dryRun && <span style={S.badge}>시뮬레이션</span>}
          </div>
          <pre style={S.pre}>{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
const S: Record<string, CSSProperties> = {
  page: {
    padding: '24px 24px 48px',
    maxWidth: 920,
    margin: '0 auto',
    fontFamily: 'Pretendard, -apple-system, sans-serif',
    color: '#1f2937',
  },
  hd: { marginBottom: 24 },
  h1: { margin: '0 0 8px', fontSize: 24, fontWeight: 800 },
  lead: { margin: 0, color: '#6b7280', fontSize: 14, lineHeight: 1.6 },
  tabs: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 8,
    margin: '24px 0',
  },
  tab: {
    textAlign: 'left',
    padding: '14px 16px',
    border: '1px solid #e5e7eb',
    background: '#fff',
    borderRadius: 8,
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  tabActive: {
    borderColor: '#7c3aed',
    background: '#f5f3ff',
    boxShadow: '0 0 0 3px rgba(124, 58, 237, 0.1)',
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: 700,
    color: '#1f2937',
    marginBottom: 4,
  },
  tabHint: { fontSize: 11, color: '#6b7280', lineHeight: 1.4 },
  form: {
    padding: 24,
    border: '1px solid #e5e7eb',
    borderRadius: 8,
    background: '#fff',
  },
  h3: { margin: '0 0 8px', fontSize: 16, fontWeight: 700 },
  h4: { margin: '0 0 12px', fontSize: 13, fontWeight: 700, color: '#374151' },
  formDesc: {
    margin: '0 0 16px',
    color: '#6b7280',
    fontSize: 13,
    lineHeight: 1.6,
  },
  code: {
    padding: '2px 6px',
    background: '#f3f4f6',
    borderRadius: 3,
    fontSize: 12,
    color: '#6b21a8',
  },
  field: { display: 'block', marginBottom: 12 },
  label: {
    display: 'block',
    marginBottom: 4,
    fontSize: 12,
    fontWeight: 600,
    color: '#374151',
  },
  input: {
    width: '100%',
    padding: '8px 10px',
    border: '1px solid #d1d5db',
    borderRadius: 6,
    fontSize: 13,
    fontFamily: 'inherit',
    boxSizing: 'border-box',
  },
  muted: { marginTop: 4, fontSize: 12, color: '#6b7280' },
  opts: {
    marginTop: 20,
    padding: 16,
    background: '#f9fafb',
    borderRadius: 6,
  },
  check: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 10,
    fontSize: 13,
    color: '#374151',
    lineHeight: 1.5,
    cursor: 'pointer',
  },
  run: {
    marginTop: 20,
    padding: '12px 28px',
    background: '#7c3aed',
    color: 'white',
    border: 'none',
    borderRadius: 6,
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
  },
  runDisabled: { opacity: 0.5, cursor: 'not-allowed' },
  result: {
    marginTop: 24,
    borderRadius: 8,
    border: '1px solid',
    overflow: 'hidden',
  },
  resultOk: { background: '#f0fdf4', borderColor: '#bbf7d0' },
  resultErr: { background: '#fef2f2', borderColor: '#fecaca' },
  resultHead: {
    padding: '12px 16px',
    fontWeight: 700,
    fontSize: 14,
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  badge: {
    padding: '2px 8px',
    background: 'rgba(0, 0, 0, 0.08)',
    borderRadius: 12,
    fontSize: 11,
    fontWeight: 600,
  },
  pre: {
    margin: 0,
    padding: 16,
    background: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
    fontFamily: 'SF Mono, Monaco, Consolas, monospace',
    overflow: 'auto',
    maxHeight: 400,
    lineHeight: 1.5,
  },
};

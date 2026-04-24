/**
 * @imgly/background-removal 실행에 필요한 WASM/ONNX 모델/메타데이터를
 * node_modules 에서 public/bg-removal/ 로 복사한다.
 *
 * Next.js 는 node_modules 내부 파일을 정적으로 서빙하지 않기 때문에
 * 런타임에 "publicPath: '/bg-removal/'" 로 이 경로를 가리키면 WASM 로드 가능.
 *
 * npm install 후 자동 실행 (postinstall script).
 */

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const publicDest = path.join(root, 'public', 'bg-removal');

/** @type {{name: string, src: string}[]} */
const sources = [
  // 메인 패키지 dist → JS wrapper, ORT WASM 이 여기 있음
  {
    name: '@imgly/background-removal',
    src: path.join(root, 'node_modules', '@imgly', 'background-removal', 'dist'),
  },
  // 데이터 패키지 dist → ONNX 모델 (isnet, isnet_fp16 등)
  {
    name: '@imgly/background-removal-data',
    src: path.join(root, 'node_modules', '@imgly', 'background-removal-data', 'dist'),
  },
];

function copyRecursive(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src)) {
      copyRecursive(path.join(src, entry), path.join(dest, entry));
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}

function main() {
  const missing = sources.filter((s) => !fs.existsSync(s.src));
  if (missing.length > 0) {
    console.log(
      '[bg-removal] 다음 패키지가 설치되지 않아 asset 복사를 건너뜁니다:\n' +
        missing.map((m) => '  - ' + m.name).join('\n'),
    );
    return;
  }

  // 기존 내용 정리
  if (fs.existsSync(publicDest)) {
    fs.rmSync(publicDest, { recursive: true, force: true });
  }
  fs.mkdirSync(publicDest, { recursive: true });

  let fileCount = 0;
  for (const s of sources) {
    const before = fileCount;
    const walk = (p) => {
      const st = fs.statSync(p);
      if (st.isDirectory()) {
        for (const e of fs.readdirSync(p)) walk(path.join(p, e));
      } else {
        fileCount++;
      }
    };
    walk(s.src);
    copyRecursive(s.src, publicDest);
    console.log(`[bg-removal] ${s.name} → public/bg-removal/ (${fileCount - before} files)`);
  }

  console.log(
    `[bg-removal] 총 ${fileCount} 개 파일 복사 완료 → ${path.relative(root, publicDest)}`,
  );
}

try {
  main();
} catch (err) {
  console.error('[bg-removal] asset 복사 실패:', err.message);
  // postinstall 실패해도 설치 자체를 막지는 않도록 exit 0
  process.exit(0);
}

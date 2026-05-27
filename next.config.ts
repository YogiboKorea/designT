import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * Turbopack 이 @imgly/background-removal 을 올바르게 변환하도록 등록.
   * asset/WASM 은 imgly 가 공식 CDN (staticimgly.com) 에서 런타임에 가져옴.
   */
  transpilePackages: [
    '@imgly/background-removal',
  ],
  /**
   * Node 네이티브 모듈은 webpack 번들 제외 — Node 의 require 그대로 사용.
   * basic-ftp 는 net/tls 소켓 사용하므로 번들되면 dev 모드에서 모듈 로드 실패 발생.
   */
  serverExternalPackages: [
    'basic-ftp',
    'mongoose',
    'mongodb',
  ],
};

export default nextConfig;

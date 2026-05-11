import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * Turbopack 이 @imgly/background-removal 을 올바르게 변환하도록 등록.
   * asset/WASM 은 imgly 가 공식 CDN (staticimgly.com) 에서 런타임에 가져옴.
   */
  transpilePackages: [
    '@imgly/background-removal',
  ],
};

export default nextConfig;

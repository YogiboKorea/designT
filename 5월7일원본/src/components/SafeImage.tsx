'use client';

import { ImgHTMLAttributes, forwardRef } from 'react';
import { proxyImageUrl } from '@/lib/proxy-image-url';

/**
 * SafeImage — CORS 안전 이미지 컴포넌트
 * ─────────────────────────────────────────────────────────────────
 * cafe24 같은 외부 도메인 이미지를 자동으로 /api/proxy-image 로 프록시.
 * canvas / drawImage / html2canvas / 이미지 export 등에서 안전하게 사용 가능.
 *
 * 사용:
 *   import SafeImage from '@/components/SafeImage';
 *
 *   // 기존 <img> 그대로 대체
 *   <SafeImage src={url} alt="" style={{...}} />
 *
 *   // 그 외 모든 <img> props 그대로 사용 가능
 *   <SafeImage src={url} className="..." onLoad={...} draggable={false} />
 *
 * 동작:
 *   - 외부 cafe24 URL → 자동으로 /api/proxy-image 통과
 *   - 자체 도메인 URL / blob: / data: → 그대로 사용
 *   - crossOrigin="anonymous" 자동 부여 (canvas 안전)
 * ─────────────────────────────────────────────────────────────────
 */

export interface SafeImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  /**
   * 이미지 URL.
   * 외부 도메인이면 자동으로 프록시 통과 처리됨.
   */
  src?: string;
  /**
   * crossOrigin 자동 설정 비활성화하고 싶을 때 (기본 true)
   */
  disableCrossOrigin?: boolean;
}

const SafeImage = forwardRef<HTMLImageElement, SafeImageProps>(
  ({ src, disableCrossOrigin, alt = '', ...rest }, ref) => {
    const safeSrc = proxyImageUrl(src);

    return (
      <img
        ref={ref}
        src={safeSrc}
        alt={alt}
        crossOrigin={disableCrossOrigin ? undefined : 'anonymous'}
        {...rest}
      />
    );
  },
);

SafeImage.displayName = 'SafeImage';

export default SafeImage;

const createNextIntlPlugin = require('next-intl/plugin');

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

// 보안 헤더 정의
const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on'
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block'
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'Referrer-Policy',
    value: 'origin-when-cross-origin'
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()'
  }
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['calendar.google.com', 'lh3.googleusercontent.com'],
  },
  
  // 번들 최적화 설정
  swcMinify: true, // SWC를 사용한 빠른 minification
  
  // 컴파일러 최적화
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
  
  // 실험적 기능 (성능 최적화)
  experimental: {
    // optimizeCss: true, // CSS 최적화 - critters 모듈 필요하므로 비활성화
    scrollRestoration: true, // 스크롤 위치 복원
  },
  
  // Webpack 설정 (성능 최적화)
  webpack: (config, { isServer, dev }) => {
    // 프로덕션 최적화
    if (!dev && !isServer) {
      // Tree shaking 강화
      config.optimization.usedExports = true;
      config.optimization.sideEffects = false;
      
      // 청크 분할 최적화
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            priority: 10,
            chunks: 'all',
          },
          common: {
            name: 'common',
            minChunks: 2,
            priority: 5,
            chunks: 'all',
            enforce: true
          }
        }
      };
    }
    
    return config;
  },
  
  async headers() {
    return [
      {
        // 모든 라우트에 보안 헤더 적용
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
}

module.exports = withNextIntl(nextConfig)

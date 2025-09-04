const createNextIntlPlugin = require('next-intl/plugin');

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['calendar.google.com', 'lh3.googleusercontent.com'],
  },
}

module.exports = withNextIntl(nextConfig)

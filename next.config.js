/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  
  // Для custom server
  output: 'standalone',
  
  // Оптимизация
  compress: true,
  
  // Переменные окружения
  env: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    NEXT_PUBLIC_SOCKET_URL: process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3000',
  },

  // Webpack конфигурация
  webpack: (config, { isServer }) => {
    // Исключаем canvas из клиентской сборки
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        canvas: false,
        fs: false,
      };
    }
    return config;
  },
};

module.exports = nextConfig;

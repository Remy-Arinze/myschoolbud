/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  async headers() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
    const connectSources = [
      "'self'",
      'http://localhost:4000',
      // OpenObserve RUM & logs
      'https://console-observe.agora-schools.com',
      // Web Push registration (Chrome/Edge FCM, Firefox, Safari)
      'https://fcm.googleapis.com',
      'https://fcmregistrations.googleapis.com',
      'https://firebaseinstallations.googleapis.com',
      'https://updates.push.services.mozilla.com',
      'https://web.push.apple.com',
    ];
    if (apiUrl && !connectSources.includes(apiUrl)) {
      connectSources.push(apiUrl);
    }
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              `connect-src ${connectSources.join(' ')}`,
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:",
              "worker-src 'self' blob:",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: https: blob:",
              "media-src 'self' blob: https://res.cloudinary.com",
              "frame-ancestors 'self'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; '),
          },
        ],
      },
    ];
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  async redirects() {
    return [
      { source: '/dashboard/school/teachers', destination: '/dashboard/school/staff', permanent: true },
      { source: '/dashboard/school/teachers/add', destination: '/dashboard/school/staff/add', permanent: true },
      { source: '/dashboard/school/teachers/:id', destination: '/dashboard/school/staff/:id', permanent: true },
    ];
  },
};

module.exports = nextConfig;

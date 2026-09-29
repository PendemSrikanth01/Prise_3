import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'PrISE 3.0 Incubation Tracker',
    short_name: 'PrISE 3.0',
    description: 'Mentoring, milestones, tasks and program coordination for PrISE 3.0.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#f3f8fa',
    theme_color: '#397c98',
    orientation: 'any',
    icons: [
      { src: '/pwa-icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/pwa-icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/pwa-icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      { src: '/pwa-icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
    ],
  };
}

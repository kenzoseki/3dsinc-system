import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: '3D Sinc — Sistema de Gestão',
    short_name: '3D Sinc',
    description: 'ERP integrado com IA para impressão 3D por encomenda',
    start_url: '/home',
    display: 'standalone',
    background_color: '#F5F3EE',
    theme_color: '#5B47C8',
    orientation: 'portrait-primary',
    icons: [
      {
        src: '/icons/icon-192.svg',
        sizes: '192x192',
        type: 'image/svg+xml',
        purpose: 'maskable',
      },
      {
        src: '/icons/icon-512.svg',
        sizes: '512x512',
        type: 'image/svg+xml',
        purpose: 'any',
      },
    ],
  }
}

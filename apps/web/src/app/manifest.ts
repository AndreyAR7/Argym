import type { MetadataRoute } from 'next'

// Next.js file-convention route — auto-served at /manifest.webmanifest and
// auto-linked into every page's <head> (same mechanism as app/icon.png for
// the favicon). start_url points straight at /login so a home-screen
// shortcut opens exactly where the "Generar acceso directo" button promises.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'ARGYM',
    short_name: 'ARGYM',
    description: 'Plataforma de gestión profesional para gimnasios',
    start_url: '/login',
    display: 'standalone',
    background_color: '#0a0a0f',
    theme_color: '#4f46e5',
    icons: [
      { src: '/icon.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}

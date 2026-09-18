import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { ThemeProvider } from '@/components/shared/theme-provider'
import { ToastProvider } from '@/context/toast-context'
import { ConfirmProvider } from '@/context/confirm-context'
import { RegisterServiceWorker } from '@/components/shared/register-service-worker'
import './globals.css'

export const metadata: Metadata = {
  title: { default: 'ARGYM', template: '%s — ARGYM' },
  description: 'Plataforma de gestión profesional para gimnasios',
  // iOS ignores manifest.json icons for the home-screen shortcut — it only
  // reads rel="apple-touch-icon" — and only treats the shortcut as an
  // installed "app" (own window, no Safari chrome) when apple-mobile-web-app
  // meta tags are present. Android/Chrome reads all of this from manifest.ts
  // instead (see app/manifest.ts), which is auto-linked by that file convention.
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'ARGYM',
  },
  icons: {
    apple: '/icon.png',
  },
}

// Applies dark class before React hydrates to prevent flash of wrong theme
const themeScript = `(function(){try{var t=localStorage.getItem('theme');if(t==='dark'||(t!=='light'&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark')}}catch(e){}})();`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${GeistSans.variable} ${GeistMono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <RegisterServiceWorker />
        <ThemeProvider>
          <ToastProvider>
            <ConfirmProvider>
              {children}
            </ConfirmProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}

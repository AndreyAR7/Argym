'use client'

import { Sun, Moon, Monitor } from 'lucide-react'
import { useTheme } from './theme-provider'

const OPTIONS = [
  { value: 'light'  as const, Icon: Sun,     label: 'Claro'   },
  { value: 'dark'   as const, Icon: Moon,    label: 'Oscuro'  },
  { value: 'system' as const, Icon: Monitor, label: 'Sistema' },
]

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <div
      className="flex items-center gap-0.5 rounded-lg p-0.5"
      style={{ backgroundColor: 'var(--color-muted)', border: '1px solid var(--color-border)' }}
    >
      {OPTIONS.map(({ value, Icon, label }) => {
        const active = theme === value
        return (
          <button
            key={value}
            onClick={() => setTheme(value)}
            title={label}
            aria-label={label}
            className="w-7 h-7 flex items-center justify-center rounded-md transition-all"
            style={
              active
                ? {
                    backgroundColor: 'var(--color-card)',
                    color: 'var(--color-foreground)',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.12)',
                  }
                : { color: 'var(--color-muted-foreground)' }
            }
          >
            <Icon size={13} />
          </button>
        )
      })}
    </div>
  )
}

'use client'

import { useEffect, useRef, useState } from 'react'

const DURATION_MS = 1400

// Parses "100+", "98%", "50+" into a numeric target plus its trailing suffix,
// counts up from 0 once the element scrolls into view, and holds the final
// value immediately when the browser prefers reduced motion.
export function AnimatedCounter({ value }: { value: string }) {
  const match = value.match(/^(\d+)(.*)$/)
  const target = match ? parseInt(match[1], 10) : null
  const suffix = match ? match[2] : ''

  const [display, setDisplay] = useState(target === null ? value : '0')
  const ref = useRef<HTMLSpanElement>(null)
  const hasRun = useRef(false)

  useEffect(() => {
    if (target === null) return
    const el = ref.current
    if (!el) return

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplay(String(target))
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || hasRun.current) return
        hasRun.current = true

        const start = performance.now()
        function tick(now: number) {
          const elapsed = now - start
          const progress = Math.min(elapsed / DURATION_MS, 1)
          const eased = 1 - Math.pow(1 - progress, 3)
          setDisplay(String(Math.round(eased * target!)))
          if (progress < 1) requestAnimationFrame(tick)
        }
        requestAnimationFrame(tick)
      },
      { threshold: 0.5 },
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [target])

  return (
    <span ref={ref}>
      {display}
      {suffix}
    </span>
  )
}

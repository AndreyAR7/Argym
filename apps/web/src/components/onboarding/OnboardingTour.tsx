'use client'

import { useState, useEffect, useCallback } from 'react'
import { AnimatePresence, motion, type PanInfo } from 'framer-motion'
import { getOnboardingSlides, welcomeCopy, type WebRole } from './onboardingContent'

interface Props {
  role: WebRole
  userId: string
  userName: string
  accentColor: string
  accentLight: string
}

// First-run feature tour — one slide per section of that role's real sidebar
// (see onboardingContent.tsx), shown once per user per browser right after
// they land in their role's shell. Uses framer-motion (already a dependency,
// unused elsewhere in this app until now) rather than the Tailwind
// `animate-in`/`zoom-in` utility classes seen in monitor-display.tsx — this
// project has no tailwindcss-animate/tw-animate-css plugin registered, so
// those specific class names don't actually resolve to any CSS here.
const STORAGE_PREFIX = 'argym_web_onboarding_seen:'

function hasSeenOnboarding(userId: string): boolean {
  try {
    return localStorage.getItem(STORAGE_PREFIX + userId) === '1'
  } catch {
    // Fail open to "not seen" — a storage read failure must never silently
    // and permanently hide the tour with no visible error.
    return false
  }
}

function markSeen(userId: string) {
  try {
    localStorage.setItem(STORAGE_PREFIX + userId, '1')
  } catch {
    // Best-effort — worst case the tour shows again on the next visit.
  }
}

const slideVariants = {
  enter: (direction: number) => ({ x: direction > 0 ? 40 : -40, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({ x: direction > 0 ? -40 : 40, opacity: 0 }),
}

export function OnboardingTour({ role, userId, userName, accentColor, accentLight }: Props) {
  const [visible, setVisible] = useState(false)
  const [index, setIndex] = useState(0)
  const [direction, setDirection] = useState(0)

  useEffect(() => {
    if (!hasSeenOnboarding(userId)) setVisible(true)
  }, [userId])

  const slides = getOnboardingSlides(role)
  const totalSteps = slides.length + 1 // + welcome slide at index 0
  const isWelcome = index === 0
  const isLast = index === totalSteps - 1
  const slide = isWelcome ? null : slides[index - 1]

  const paginate = useCallback((dir: number) => {
    setDirection(dir)
    setIndex((i) => Math.min(totalSteps - 1, Math.max(0, i + dir)))
  }, [totalSteps])

  const finish = useCallback(() => {
    markSeen(userId)
    setVisible(false)
  }, [userId])

  const handleNext = () => {
    if (isLast) { finish(); return }
    paginate(1)
  }

  const handleDragEnd = (_e: PointerEvent | MouseEvent | TouchEvent, info: PanInfo) => {
    const swipedLeft = info.offset.x < -60 || info.velocity.x < -400
    const swipedRight = info.offset.x > 60 || info.velocity.x > 400
    if (swipedLeft && !isLast) paginate(1)
    else if (swipedRight && index > 0) paginate(-1)
  }

  const firstName = userName?.trim().split(/\s+/)[0] ?? null
  const welcome = welcomeCopy(role, firstName)

  return (
    <AnimatePresence>
      {visible && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      >
        <motion.div
          initial={{ scale: 0.92, opacity: 0, y: 12 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          className="relative w-full max-w-md rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-2xl overflow-hidden"
        >
          {!isLast && (
            <button
              onClick={finish}
              className="absolute top-4 right-4 z-10 text-sm font-medium text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors"
            >
              Omitir
            </button>
          )}

          <div className="px-8 pt-14 pb-8 min-h-[380px] flex flex-col items-center justify-center text-center overflow-hidden">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={index}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.6}
                onDragEnd={handleDragEnd}
                className="flex flex-col items-center cursor-grab active:cursor-grabbing"
              >
                <motion.div
                  initial={{ scale: 0.4, rotate: -8 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 260, damping: 14, delay: 0.05 }}
                  className="w-24 h-24 rounded-full flex items-center justify-center mb-6 border-2"
                  style={{ backgroundColor: accentLight, borderColor: accentColor }}
                >
                  {isWelcome ? (
                    <span className="text-4xl font-black" style={{ color: accentColor }}>A</span>
                  ) : (
                    slide && <slide.icon size={40} style={{ color: accentColor }} />
                  )}
                </motion.div>

                <h2 className="text-xl font-black text-[var(--color-foreground)] mb-2">
                  {isWelcome ? welcome.title : slide?.title}
                </h2>
                <p className="text-sm text-[var(--color-muted-foreground)] leading-relaxed max-w-xs">
                  {isWelcome ? welcome.description : slide?.description}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="flex items-center justify-center gap-1.5 pb-5">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <motion.div
                key={i}
                animate={{ width: i === index ? 22 : 8, opacity: i === index ? 1 : 0.35 }}
                transition={{ duration: 0.25 }}
                className="h-2 rounded-full"
                style={{ backgroundColor: accentColor }}
              />
            ))}
          </div>

          <div className="px-6 pb-6">
            <motion.button
              whileTap={{ scale: 0.94 }}
              onClick={handleNext}
              className="w-full rounded-xl py-3.5 font-bold text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: accentColor }}
            >
              {isLast ? '¡Empezar!' : 'Siguiente'}
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
      )}
    </AnimatePresence>
  )
}

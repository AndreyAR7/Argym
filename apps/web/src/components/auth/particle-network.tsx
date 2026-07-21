'use client'

import { useEffect, useRef } from 'react'

type Particle = { x: number; y: number; vx: number; vy: number }

const LINK_DISTANCE = 120
const MOUSE_DISTANCE = 150
const MOUSE_REPEL_DISTANCE = 90

export function ParticleNetwork({ color = '#818cf8' }: { color?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const parent = canvas?.parentElement
    const ctx = canvas?.getContext('2d')
    if (!canvas || !parent || !ctx) return

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    let width = 0
    let height = 0
    let particles: Particle[] = []
    let animationFrame = 0
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const mouse = { x: -9999, y: -9999, active: false }

    function resize() {
      width = parent!.clientWidth
      height = parent!.clientHeight
      canvas!.width = width * dpr
      canvas!.height = height * dpr
      canvas!.style.width = `${width}px`
      canvas!.style.height = `${height}px`
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0)

      const count = Math.min(70, Math.max(30, Math.floor((width * height) / 12000)))
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
      }))
    }

    function step() {
      ctx!.clearRect(0, 0, width, height)

      for (const p of particles) {
        p.x += p.vx
        p.y += p.vy
        if (p.x < 0 || p.x > width) p.vx *= -1
        if (p.y < 0 || p.y > height) p.vy *= -1

        if (mouse.active) {
          const dx = p.x - mouse.x
          const dy = p.y - mouse.y
          const dist = Math.hypot(dx, dy)
          if (dist < MOUSE_REPEL_DISTANCE && dist > 0.01) {
            const force = (MOUSE_REPEL_DISTANCE - dist) / MOUSE_REPEL_DISTANCE
            p.x += (dx / dist) * force * 1.2
            p.y += (dy / dist) * force * 1.2
          }
        }
      }

      ctx!.lineWidth = 1
      ctx!.strokeStyle = color
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i]
          const b = particles[j]
          const dist = Math.hypot(a.x - b.x, a.y - b.y)
          if (dist < LINK_DISTANCE) {
            ctx!.globalAlpha = (1 - dist / LINK_DISTANCE) * 0.22
            ctx!.beginPath()
            ctx!.moveTo(a.x, a.y)
            ctx!.lineTo(b.x, b.y)
            ctx!.stroke()
          }
        }

        if (mouse.active) {
          const dist = Math.hypot(particles[i].x - mouse.x, particles[i].y - mouse.y)
          if (dist < MOUSE_DISTANCE) {
            ctx!.globalAlpha = (1 - dist / MOUSE_DISTANCE) * 0.4
            ctx!.beginPath()
            ctx!.moveTo(particles[i].x, particles[i].y)
            ctx!.lineTo(mouse.x, mouse.y)
            ctx!.stroke()
          }
        }
      }

      ctx!.fillStyle = color
      ctx!.globalAlpha = 0.55
      for (const p of particles) {
        ctx!.beginPath()
        ctx!.arc(p.x, p.y, 1.6, 0, Math.PI * 2)
        ctx!.fill()
      }
      ctx!.globalAlpha = 1

      animationFrame = requestAnimationFrame(step)
    }

    function handlePointerMove(e: PointerEvent) {
      const rect = canvas!.getBoundingClientRect()
      mouse.x = e.clientX - rect.left
      mouse.y = e.clientY - rect.top
      mouse.active = true
    }

    function handlePointerLeave() {
      mouse.active = false
    }

    resize()
    animationFrame = requestAnimationFrame(step)

    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(parent)
    parent.addEventListener('pointermove', handlePointerMove)
    parent.addEventListener('pointerleave', handlePointerLeave)

    return () => {
      cancelAnimationFrame(animationFrame)
      resizeObserver.disconnect()
      parent.removeEventListener('pointermove', handlePointerMove)
      parent.removeEventListener('pointerleave', handlePointerLeave)
    }
  }, [color])

  return <canvas ref={canvasRef} className="absolute inset-0" aria-hidden="true" />
}

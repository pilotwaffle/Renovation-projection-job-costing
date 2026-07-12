'use client'

import { useEffect, useRef, useState } from 'react'

interface CountUpProps {
  value: number
  prefix?: string
  suffix?: string
  decimals?: number
  durationMs?: number
  className?: string
}

/**
 * Animates a number from 0 to its value on mount.
 * Respects prefers-reduced-motion by rendering statically.
 */
export default function CountUp({
  value,
  prefix = '',
  suffix = '',
  decimals = 0,
  durationMs = 800,
  className
}: CountUpProps) {
  const [display, setDisplay] = useState(0)
  const frameRef = useRef<number | null>(null)

  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      setDisplay(value)
      return
    }

    let start: number | null = null
    const tick = (now: number) => {
      // Anchor elapsed time to the timestamp handed to the first animation
      // frame rather than a separately-sourced performance.now() call: some
      // environments (e.g. jsdom) give requestAnimationFrame callbacks a
      // timestamp from a different clock than performance.now(), which would
      // otherwise make (now - start) negative and the animation never settle.
      if (start === null) start = now
      const progress = Math.min((now - start) / durationMs, 1)
      const eased = 1 - Math.pow(1 - progress, 3) // ease-out cubic
      setDisplay(value * eased)
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick)
      }
    }
    frameRef.current = requestAnimationFrame(tick)

    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
    }
  }, [value, durationMs])

  return (
    <span className={className}>
      {prefix}
      {display.toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
      })}
      {suffix}
    </span>
  )
}

import { describe, it, expect } from 'vitest'
import { nextUseCount } from '@/lib/utils'

// Regression test for the template use_count precedence bug: the old
// expression `use_count || 0 + 1` parsed as `use_count || 1`, so existing
// counts never incremented (1 stayed 1 forever).
describe('nextUseCount', () => {
  it('treats undefined as 0 and increments to 1', () => {
    expect(nextUseCount(undefined)).toBe(1)
  })

  it('treats null as 0 and increments to 1', () => {
    expect(nextUseCount(null)).toBe(1)
  })

  it('increments a legitimate 0 to 1', () => {
    expect(nextUseCount(0)).toBe(1)
  })

  it('increments 1 to 2 (the case the old || expression got stuck on)', () => {
    expect(nextUseCount(1)).toBe(2)
  })

  it('increments 5 to 6', () => {
    expect(nextUseCount(5)).toBe(6)
  })
})

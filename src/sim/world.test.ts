import { describe, expect, it } from 'vitest'
import { Btn, MAX_ENEMIES, World } from './world'

function run(w: World, frames: number, held: number, pressed = 0): void {
  for (let i = 0; i < frames; i++) w.step(held, i === 0 ? pressed : 0)
}

describe('World', () => {
  it('is deterministic for the same seed and inputs', () => {
    const a = new World(7)
    const b = new World(7)
    for (let i = 0; i < 600; i++) {
      const held = [Btn.Right, Btn.Down, Btn.Left, Btn.Up][(i >> 5) & 3]!
      const pressed = i % 90 === 0 ? Btn.A : 0
      a.step(held, pressed)
      b.step(held, pressed)
    }
    expect([a.px, a.py, a.hp, a.kills]).toEqual([b.px, b.py, b.hp, b.kills])
    expect(Array.from(a.ex)).toEqual(Array.from(b.ex))
  })

  it('stops at solid tiles (sea to the south)', () => {
    const w = new World(1)
    for (let i = 0; i < MAX_ENEMIES; i++) w.ealive[i] = 0
    run(w, 400, Btn.Down)
    expect(w.py).toBeLessThanOrEqual(16)
    expect(w.py).toBeGreaterThan(15)
  })

  it('sword damages an enemy in front of the player', () => {
    const w = new World(1)
    for (let i = 0; i < MAX_ENEMIES; i++) w.ealive[i] = 0
    w.ealive[0] = 1
    w.ehp[0] = 2
    w.ex[0] = w.px
    w.ey[0] = w.py + 0.9
    run(w, 20, 0, Btn.A)
    expect(w.ehp[0]).toBe(1)
  })
})

import { describe, expect, it } from 'vitest'
import { ENEMY_DEFS, ENEMY_ROSTER, parseEnemy } from './enemies'

const slime = {
  sprite: 'slime',
  health: 2,
  body: { hw: 0.3, h: 0.5 },
  contactEffect: 'ContactDamage',
  abilities: { wander: { type: 'moveBurst', frames: 24, speed: 0.028 } },
  brain: { wander: 'wander', idle: { min: 20, range: 40 } },
  animation: [{ frames: [0, 1], period: 16 }],
}

function withChange(change: (d: typeof slime & Record<string, unknown>) => void): unknown {
  const copy = structuredClone(slime) as typeof slime & Record<string, unknown>
  change(copy)
  return copy
}

describe('enemies.json', () => {
  it('loads every enemy and expands the roster', () => {
    expect(Object.keys(ENEMY_DEFS).sort()).toEqual(['jumper', 'slime'])
    expect(ENEMY_ROSTER.filter((id) => id === 'slime')).toHaveLength(4)
    expect(ENEMY_ROSTER.filter((id) => id === 'jumper')).toHaveLength(2)
  })

  it('wires the jumper ability chain from data', () => {
    const names = ENEMY_DEFS.jumper!.abilities.map((a) => `${a.name}->${a.then}`)
    expect(names).toEqual(['hop->null', 'alert->leap', 'leap->rest', 'rest->back', 'back->null'])
  })

  it('accepts a minimal valid definition', () => {
    expect(parseEnemy('slime', slime).health).toBe(2)
  })

  it('rejects unknown ability types, tags, effects and references with context', () => {
    const bad = (change: Parameters<typeof withChange>[0], message: RegExp): void =>
      expect(() => parseEnemy('x', withChange(change))).toThrow(message)
    bad((d) => ((d.abilities.wander as { type: string }).type = 'teleport'), /unknown ability type "teleport"/)
    bad((d) => ((d.abilities.wander as Record<string, unknown>).grantedTags = ['Flying']), /unknown tag "Flying"/)
    bad((d) => (d.contactEffect = 'Nope'), /unknown effect "Nope"/)
    bad((d) => (d.brain.wander = 'missing'), /unknown ability "missing"/)
    bad((d) => ((d.abilities.wander as Record<string, unknown>).then = 'ghost'), /unknown ability "ghost"/)
    bad((d) => (d.health = 'lots' as unknown as number), /health: expected a number/)
    bad((d) => (d.animation = [{ frames: [0], period: 1, tags: ['Warning'] } as never]), /last rule must be an unconditional default/)
  })
})

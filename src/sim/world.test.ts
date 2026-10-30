import { describe, expect, it } from 'vitest'
import { FX } from '../data/effects'
import type { Enemy } from './actors/enemy'
import { Tag } from './gas/tags'
import { MAP_W, T } from './map'
import { Btn, MAX_ENEMIES, World } from './world'

function run(w: World, frames: number, held: number, pressed = 0): void {
  for (let i = 0; i < frames; i++) w.step(held, i === 0 ? pressed : 0)
}

function clearEnemies(w: World): void {
  for (const e of w.enemies) e.asc.tags.add(Tag.Dead)
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
    expect([a.player.x, a.player.y, a.hp, a.kills]).toEqual([b.player.x, b.player.y, b.hp, b.kills])
    expect(a.enemies.map((e) => [e.x, e.y, e.z])).toEqual(b.enemies.map((e) => [e.x, e.y, e.z]))
  })

  it('stops at solid tiles (sea to the south)', () => {
    const w = new World(1)
    clearEnemies(w)
    run(w, 400, Btn.Down)
    expect(w.player.y).toBeLessThanOrEqual(16)
    expect(w.player.y).toBeGreaterThan(15)
  })

  it('sword damages an enemy in front of the player', () => {
    const w = new World(1)
    clearEnemies(w)
    const e = w.enemies[0]!
    e.spawn(w.player.x, w.player.y + 0.9, w)
    run(w, 20, 0, Btn.A)
    expect(e.asc.attrs.health).toBe(e.asc.attrs.maxHealth - 1)
  })

  it('a sword swing hits an enemy once and then kills it with repeated swings', () => {
    const w = new World(1)
    clearEnemies(w)
    const e = w.enemies[0]!
    e.spawn(w.player.x, w.player.y + 0.9, w)
    for (let swing = 0; swing < 3 && e.alive; swing++) {
      e.setPosition(w.player.x, w.player.y + 0.9)
      run(w, 30, 0, Btn.A)
    }
    expect(e.alive).toBe(false)
    expect(w.kills).toBe(1)
  })
})

describe('gameplay effects', () => {
  it('contact damage is blocked while invulnerable', () => {
    const w = new World(1)
    clearEnemies(w)
    const e = w.enemies[0]!
    e.spawn(w.player.x, w.player.y, w)
    w.step(0, 0)
    expect(w.hp).toBe(w.maxHp - 1)
    expect(w.player.invulnerable).toBe(true)
    w.step(0, 0)
    expect(w.hp).toBe(w.maxHp - 1)
  })

  it('death adds the Dead tag and respawn restores health', () => {
    const w = new World(1)
    clearEnemies(w)
    for (let i = 0; i < 6; i++) {
      w.player.asc.tags.clear()
      w.player.asc.applyEffect(FX.ContactDamage, null, w)
    }
    expect(w.dead).toBe(true)
    w.respawn()
    expect(w.dead).toBe(false)
    expect(w.hp).toBe(w.maxHp)
  })
})

describe('Jumper', () => {
  function setup(): { w: World; j: Enemy } {
    const w = new World(3)
    clearEnemies(w)
    const j = w.enemies.find((e) => e.def.id === 'jumper')!
    for (let y = 4; y <= 12; y++) for (let x = 12; x <= 17; x++) w.tiles[y * MAP_W + x] = T.Grass
    j.spawn(14.5, 6.5, w)
    w.player.setPosition(14.5, 10)
    return { w, j }
  }

  it('warns, leaps to the hero, rests 0.5 s, then returns home', () => {
    const { w, j } = setup()
    const seen: number[] = []
    const phases: string[] = []
    for (let i = 0; i < 400; i++) {
      w.player.asc.applyEffect(FX.Respawn, null, w) // keep the hero out of harm's way
      w.step(0, 0)
      const t = j.asc.tags
      const p = t.has(Tag.Warning) ? 'warn' : t.has(Tag.Resting) ? 'rest' : t.has(Tag.Airborne) ? 'air' : 'idle'
      if (phases[phases.length - 1] !== p) phases.push(p)
      if (p === 'rest' && phases.length === 3) seen.push(i)
      // The hero is still in sight, so on arriving home it starts a new warning.
      if (phases.length === 5) break
    }
    expect(phases).toEqual(['warn', 'air', 'rest', 'air', 'warn'])
    expect(seen.length).toBe(30)
    expect(Math.hypot(j.x - j.homeX, j.y - j.homeY)).toBeLessThan(0.5)
  })

  it('lands on the hero position after the leap', () => {
    const { w, j } = setup()
    let landed = false
    for (let i = 0; i < 200 && !landed; i++) {
      w.player.asc.applyEffect(FX.Respawn, null, w)
      w.step(0, 0)
      if (j.asc.tags.has(Tag.Resting)) {
        landed = true
        expect(Math.hypot(j.x - w.player.x, j.y - w.player.y)).toBeLessThan(0.3)
      }
    }
    expect(landed).toBe(true)
  })

  it('keeps all enemies pooled', () => {
    expect(new World(1).enemies.length).toBe(MAX_ENEMIES)
  })
})

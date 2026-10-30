import { describe, expect, it } from 'vitest'
import { FX } from '../../data/effects'
import { VFX_DEFS, parseVfx } from '../../data/vfx'
import { Attr } from '../gas/attributes'
import { defineEffect } from '../gas/effect'
import { Tag } from '../gas/tags'
import { MAP_W, T } from '../map'
import { World } from '../world'
import { VfxRef, VfxSystem } from './vfx'
import type { VfxDef } from './vfx-def'

const LETHAL = defineEffect({ attribute: Attr.Health, delta: -99 })

const base: VfxDef = {
  id: 'test',
  sprite: 'emotes',
  frames: [0, 1],
  period: 2,
  size: 1,
  anchor: 'head',
  offsetX: 0,
  offsetY: 0,
  bobAmplitude: 0,
  bobSpeed: 0,
  duration: 0,
  despawnWithOwner: true,
  alwaysOnTop: false,
}

/** A world with one jumper that already sees the hero, on cleared ground. */
function alertWorld(): { w: World; j: World['enemies'][number] } {
  const w = new World(3)
  for (const e of w.enemies) e.asc.tags.add(Tag.Dead)
  for (let y = 4; y <= 12; y++) for (let x = 12; x <= 17; x++) w.tiles[y * MAP_W + x] = T.Grass
  const j = w.enemies.find((e) => e.def.id === 'jumper')!
  j.spawn(14.5, 6.5, w)
  w.player.setPosition(14.5, 10)
  return { w, j }
}

const active = (w: World): number => w.vfx.pool.filter((v) => v.active).length

describe('vfx', () => {
  it('shows the alert effect attached to the jumper only while it is warning', () => {
    const { w, j } = alertWorld()
    let sawWarning = false
    for (let i = 0; i < 120; i++) {
      w.player.asc.applyEffect(FX.Respawn, null, w)
      w.step(0, 0)
      const warning = j.asc.tags.has(Tag.Warning)
      const fx = w.vfx.pool.find((v) => v.active)
      expect(active(w)).toBe(warning ? 1 : 0)
      if (warning) {
        sawWarning = true
        expect(fx!.owner).toBe(j)
        expect(fx!.def).toBe(VFX_DEFS.alert)
      }
    }
    expect(sawWarning).toBe(true)
  })

  it('follows its owner', () => {
    const { w, j } = alertWorld()
    const v = w.vfx.spawn({ ...base, offsetX: 0.5 }, j)!
    j.setPosition(8, 5)
    w.vfx.step()
    expect([v.x, v.y]).toEqual([8.5, 5])
  })

  it('despawns with a dead owner only when configured to', () => {
    const { w, j } = alertWorld()
    const dies = w.vfx.spawn({ ...base, despawnWithOwner: true }, j)!
    const outlives = w.vfx.spawn({ ...base, despawnWithOwner: false, duration: 30 }, j)!
    j.asc.applyEffect(LETHAL, null, w)
    expect(j.alive).toBe(false)
    w.vfx.step()
    expect(dies.active).toBe(false)
    expect(outlives.active).toBe(true)
    for (let i = 0; i < 40; i++) w.vfx.step()
    expect(outlives.active).toBe(false)
  })

  it('refs go stale when the effect ends, even if the pooled instance is reused', () => {
    const sys = new VfxSystem(1)
    const ref = new VfxRef()
    ref.bind(sys.spawn({ ...base, duration: 2 }, null))
    expect(ref.active).toBe(true)
    sys.step()
    sys.step()
    expect(ref.active).toBe(false)
    sys.spawn({ ...base }, null) // recycles the only instance
    expect(ref.active).toBe(false)
  })

  it('released refs end the effect on the next step', () => {
    const sys = new VfxSystem(2)
    const ref = new VfxRef()
    const v = sys.spawn(base, null)!
    ref.bind(v)
    ref.release()
    sys.step()
    expect(v.active).toBe(false)
  })

  it('drops spawns when the pool is full', () => {
    const sys = new VfxSystem(1)
    expect(sys.spawn(base, null)).not.toBeNull()
    expect(sys.spawn(base, null)).toBeNull()
  })

  it('animates through frames by period', () => {
    const sys = new VfxSystem(1)
    const v = sys.spawn(base, null)!
    const frames: number[] = []
    for (let i = 0; i < 6; i++) {
      sys.step()
      frames.push(v.frame)
    }
    expect(frames).toEqual([0, 1, 1, 0, 0, 1])
  })
})

describe('vfx.json', () => {
  it('defines the alert effect', () => {
    expect(VFX_DEFS.alert).toMatchObject({ sprite: 'emotes', anchor: 'head', despawnWithOwner: true, alwaysOnTop: true })
  })

  it('rejects bad definitions with context', () => {
    const ok = { sprite: 'emotes', frames: [0], size: 1 }
    expect(parseVfx('x', ok).period).toBe(1)
    expect(() => parseVfx('x', { ...ok, frames: [] })).toThrow(/vfx.json:x.frames/)
    expect(() => parseVfx('x', { ...ok, anchor: 'sky' })).toThrow(/anchor/)
    expect(() => parseVfx('x', { ...ok, size: 'big' })).toThrow(/size: expected a number/)
    expect(() => parseVfx('x', { ...ok, despawnWithOwner: 'yes' })).toThrow(/despawnWithOwner/)
  })
})

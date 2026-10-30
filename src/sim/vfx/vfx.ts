import type { Actor } from '../actors/actor'
import type { VfxDef } from './vfx-def'

/** A running visual effect. Instances are pooled and reused; hold them through a VfxRef. */
export class Vfx {
  active = false
  def: VfxDef | null = null
  /** Actor this effect follows and is tied to; null for effects placed in the world. */
  owner: Actor | null = null
  /** Changes on every spawn so stale references to a recycled instance can be detected. */
  serial = 0
  age = 0
  x = 0
  y = 0
  px = 0
  py = 0
  private released = false

  /** Asks the effect to end on the next step. */
  release(): void {
    this.released = true
  }

  start(def: VfxDef, owner: Actor | null, x: number, y: number, serial: number): void {
    this.active = true
    this.def = def
    this.owner = owner
    this.serial = serial
    this.age = 0
    this.released = false
    this.x = this.px = owner ? owner.x + def.offsetX : x
    this.y = this.py = owner ? owner.y : y
  }

  step(): void {
    const def = this.def!
    this.age++
    const owner = this.owner
    if (this.released || (def.duration > 0 && this.age >= def.duration) || (owner && def.despawnWithOwner && !owner.alive)) {
      this.active = false
      return
    }
    this.px = this.x
    this.py = this.y
    if (owner) {
      this.x = owner.x + def.offsetX
      this.y = owner.y
    }
  }

  /** Current animation frame index into the effect's `frames`. */
  get frame(): number {
    const def = this.def!
    return def.frames[Math.floor(this.age / def.period) % def.frames.length]!
  }
}

/** Fixed pool of effects, stepped once per sim frame. */
export class VfxSystem {
  readonly pool: Vfx[] = []
  private serial = 0

  constructor(capacity = 32) {
    for (let i = 0; i < capacity; i++) this.pool.push(new Vfx())
  }

  /** Starts an effect; returns null (and drops it) if the pool is full. */
  spawn(def: VfxDef, owner: Actor | null, x = 0, y = 0): Vfx | null {
    for (let i = 0; i < this.pool.length; i++) {
      const v = this.pool[i]!
      if (v.active) continue
      v.start(def, owner, x, y, ++this.serial)
      return v
    }
    return null
  }

  step(): void {
    for (let i = 0; i < this.pool.length; i++) {
      const v = this.pool[i]!
      if (v.active) v.step()
    }
  }

  clear(): void {
    for (let i = 0; i < this.pool.length; i++) this.pool[i]!.active = false
  }
}

/**
 * An actor's reference to an effect it created. Safe against recycling: once the effect ends
 * (released, expired or owner died) `active` turns false even if the pooled instance is reused.
 */
export class VfxRef {
  private vfx: Vfx | null = null
  private serial = 0

  get active(): boolean {
    return this.vfx !== null && this.vfx.active && this.vfx.serial === this.serial
  }

  bind(v: Vfx | null): void {
    this.vfx = v
    this.serial = v ? v.serial : 0
  }

  release(): void {
    if (this.active) this.vfx!.release()
    this.vfx = null
  }
}

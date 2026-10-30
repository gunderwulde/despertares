import type { TileMap } from '../collision'
import { Dir } from '../constants'
import type { SimContext } from '../context'
import type { GameplayAbility } from '../gas/ability'
import { AbilitySystem } from '../gas/ability-system'
import type { GameplayEffect } from '../gas/effect'
import { Tag } from '../gas/tags'

/**
 * Anything with a body and an ability system. Subclasses only decide *what to try* in
 * `think`; movement, damage, stun and death all flow through abilities and effects.
 * (x, y) is the feet position in tiles; (px, py) is last step's, for render interpolation.
 */
export abstract class Actor {
  x = 0
  y = 0
  px = 0
  py = 0
  /** Height above the ground (leaps and hops); purely visual, never collides. */
  z = 0
  dir: number = Dir.Down
  readonly asc: AbilitySystem
  private kbx = 0
  private kby = 0

  constructor(
    readonly hw: number,
    readonly h: number,
    maxHealth: number,
  ) {
    this.asc = new AbilitySystem(this, maxHealth)
  }

  get alive(): boolean {
    return !this.asc.tags.has(Tag.Dead)
  }

  setPosition(x: number, y: number): void {
    this.x = this.px = x
    this.y = this.py = y
  }

  step(ctx: SimContext): void {
    this.px = this.x
    this.py = this.y
    if (!this.alive) return
    this.asc.tick(ctx)
    if (this.asc.tags.has(Tag.Stunned)) this.moveBy(ctx.map, this.kbx, this.kby)
    else if (this.alive) this.think(ctx)
  }

  moveBy(map: TileMap, dx: number, dy: number): void {
    this.x = map.moveX(this.x, this.y, dx, this.hw, this.h)
    this.y = map.moveY(this.x, this.y, dy, this.hw, this.h)
  }

  /** Called for every applied effect; knockback is pushed away from the source. */
  onEffectApplied(def: GameplayEffect, source: Actor | null): void {
    if (def.knockback <= 0 || !source) return
    const dx = this.x - source.x
    const dy = this.y - source.y
    const len = Math.hypot(dx, dy) || 1
    this.kbx = (dx / len) * def.knockback
    this.kby = (dy / len) * def.knockback
  }

  onAbilityEnded(_ability: GameplayAbility, _cancelled: boolean, _ctx: SimContext): void {}
  onDeath(_ctx: SimContext): void {}

  protected abstract think(ctx: SimContext): void
}

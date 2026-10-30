import type { Actor } from '../actors/actor'
import { Dir } from '../constants'
import { Ev } from '../constants'
import type { SimContext } from '../context'
import { FX } from '../../data/effects'
import { GameplayAbility } from '../gas/ability'
import { Tag } from '../gas/tags'

const HIT_FROM = 5
const HIT_TO = 13
export const SWORD_VISIBLE_FRAMES = 16

export class SwordAbility extends GameplayAbility {
  override duration = 18
  override readonly blockedTags = Tag.Attacking | Tag.Stunned | Tag.Dead
  override readonly grantedTags = Tag.Attacking
  override readonly cancelOnTags = Tag.Stunned | Tag.Dead

  override onActivate(_owner: Actor, ctx: SimContext): void {
    ctx.evt |= Ev.Sword
  }

  override onTick(o: Actor, ctx: SimContext): void {
    if (this.age < HIT_FROM || this.age > HIT_TO) return
    const { x, y } = o
    let l = 0
    let t = 0
    let r = 0
    let b = 0
    switch (o.dir) {
      case Dir.Down: l = x - 0.5; r = x + 0.5; t = y; b = y + 0.95; break
      case Dir.Up: l = x - 0.5; r = x + 0.5; t = y - 1.3; b = y - 0.2; break
      case Dir.Left: l = x - 1.0; r = x - 0.1; t = y - 0.7; b = y + 0.1; break
      default: l = x + 0.1; r = x + 1.0; t = y - 0.7; b = y + 0.1
    }
    ctx.damageEnemiesInBox(l, t, r, b, o, FX.SwordHit)
  }
}

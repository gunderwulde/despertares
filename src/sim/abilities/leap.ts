import type { Actor } from '../actors/actor'
import type { SimContext } from '../context'
import { GameplayAbility } from '../gas/ability'
import { Tag } from '../gas/tags'

export type LeapTarget = 'player' | 'home'

export interface LeapParams {
  /** Where the leap lands when started through a chain. */
  target: LeapTarget
  /** Tiles per frame; together with the distance this sets the duration. */
  speed: number
  arc: number
  minFrames: number
  maxFrames: number
  /** Longest distance covered; farther targets are clipped to this range. */
  maxRange: number
}

/** Ballistic jump to (targetX, targetY), set by the brain before activation. */
export class LeapAbility extends GameplayAbility {
  targetX = 0
  targetY = 0
  private vx = 0
  private vy = 0
  override readonly cancelOnTags = Tag.Stunned | Tag.Dead
  override readonly grantedTags = Tag.Airborne

  constructor(private readonly p: LeapParams) {
    super()
  }

  get targetKind(): LeapTarget {
    return this.p.target
  }

  override onActivate(o: Actor): void {
    const { speed, maxRange, minFrames, maxFrames } = this.p
    let dx = this.targetX - o.x
    let dy = this.targetY - o.y
    const dist = Math.hypot(dx, dy)
    if (dist > maxRange) {
      dx *= maxRange / dist
      dy *= maxRange / dist
    }
    const frames = Math.min(Math.max(Math.ceil(Math.min(dist, maxRange) / speed), minFrames), maxFrames)
    this.duration = frames
    this.vx = dx / frames
    this.vy = dy / frames
  }

  override onTick(o: Actor, ctx: SimContext): void {
    o.moveBy(ctx.map, this.vx, this.vy)
    o.z = this.p.arc * Math.sin((Math.PI * this.age) / this.duration)
  }

  override onEnd(o: Actor): void {
    o.z = 0
  }
}

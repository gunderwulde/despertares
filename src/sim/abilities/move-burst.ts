import type { Actor } from '../actors/actor'
import type { SimContext } from '../context'
import { GameplayAbility } from '../gas/ability'
import { Tag } from '../gas/tags'

export interface MoveBurstParams {
  frames: number
  /** Tiles per frame along the chosen direction. */
  speed: number
  /** Peak visual hop height; 0 keeps the owner on the ground. */
  arc: number
  grantedTags: number
}

/** Moves the owner along a direction for a fixed time, optionally along a hop arc. */
export class MoveBurstAbility extends GameplayAbility {
  private vx = 0
  private vy = 0
  override readonly cancelOnTags = Tag.Stunned | Tag.Dead
  override readonly grantedTags: number

  constructor(private readonly p: MoveBurstParams) {
    super()
    this.duration = p.frames
    this.grantedTags = p.grantedTags
  }

  /** Unit direction (or zero); scaled by the ability's speed. */
  setDirection(dx: number, dy: number): void {
    this.vx = dx * this.p.speed
    this.vy = dy * this.p.speed
  }

  override onTick(o: Actor, ctx: SimContext): void {
    o.moveBy(ctx.map, this.vx, this.vy)
    o.z = this.p.arc * Math.sin((Math.PI * this.age) / this.duration)
  }

  override onEnd(o: Actor): void {
    o.z = 0
  }
}

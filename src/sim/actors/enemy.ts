import { createAbility } from '../abilities/factory'
import { LeapAbility } from '../abilities/leap'
import { MoveBurstAbility } from '../abilities/move-burst'
import type { SimContext } from '../context'
import type { GameplayAbility } from '../gas/ability'
import type { GameplayEffect } from '../gas/effect'
import { Tag } from '../gas/tags'
import { VfxRef } from '../vfx/vfx'
import { Actor } from './actor'
import type { EnemyDef, IdleRange } from './enemy-def'

const DX = [0, 0, -1, 1]
const DY = [1, -1, 0, 0]

/**
 * A data-driven enemy: health, body, abilities, brain, animation and visual effects all come from its
 * EnemyDef (data/enemies.json). The brain is generic:
 *  - with `sight`, spotting the hero starts that ability, and abilities chain through `then`;
 *  - otherwise it waits out an idle timer and wanders with the `wander` ability, optionally
 *    biased toward the hero (`chase`) or back home (`home`).
 * Subclass only for behaviour the data cannot express.
 */
export class Enemy extends Actor {
  frame = 0
  homeX = 0
  homeY = 0
  private idleT = 0
  private dvx = 0
  private dvy = 0
  private readonly wander: MoveBurstAbility
  private readonly sight: GameplayAbility | null
  private readonly byName = new Map<string, GameplayAbility>()
  /** One reference per `def.vfx` rule to the effect this enemy currently has running. */
  private readonly vfxRefs: VfxRef[]

  constructor(
    readonly id: number,
    readonly def: EnemyDef,
  ) {
    super(def.hw, def.h, def.health)
    for (const a of def.abilities) this.byName.set(a.name, this.asc.grant(createAbility(a.def)))
    for (const a of def.abilities) a.then && (this.byName.get(a.name)!.next = this.byName.get(a.then)!)
    const wander = this.byName.get(def.brain.wander)
    if (!(wander instanceof MoveBurstAbility)) throw new Error(`${def.id}: brain.wander must be a moveBurst ability`)
    this.wander = wander
    this.sight = def.brain.sight ? this.byName.get(def.brain.sight.ability)! : null
    this.vfxRefs = def.vfx.map(() => new VfxRef())
    // Pooled enemies start dead until spawn() brings them in.
    this.asc.tags.add(Tag.Dead)
  }

  get contactEffect(): GameplayEffect {
    return this.def.contactEffect
  }

  get flashing(): boolean {
    return this.asc.tags.has(Tag.Invulnerable)
  }

  spawn(x: number, y: number, ctx: SimContext): void {
    this.asc.reset()
    for (const r of this.vfxRefs) r.release()
    this.setPosition(x, y)
    this.homeX = x
    this.homeY = y
    this.z = 0
    this.idleT = 1 + ctx.rng.int(40)
  }

  override step(ctx: SimContext): void {
    super.step(ctx)
    if (!this.alive) return
    this.frame = this.animFrame(ctx.tick)
    this.updateVfx(ctx)
  }

  override onAbilityEnded(a: GameplayAbility, cancelled: boolean, ctx: SimContext): void {
    if (cancelled) return
    const next = a.next
    if (next) {
      if (next instanceof LeapAbility) {
        const toHome = next.targetKind === 'home'
        next.targetX = toHome ? this.homeX : ctx.player.x
        next.targetY = toHome ? this.homeY : ctx.player.y
      }
      this.asc.tryActivate(next, ctx)
    } else if (a !== this.wander && this.def.brain.chainIdle) {
      this.idleT = this.roll(ctx, this.def.brain.chainIdle)
    }
  }

  protected override think(ctx: SimContext): void {
    if (this.asc.busy) return
    const b = this.def.brain
    const p = ctx.player
    const hx = p.x - this.x
    const hy = p.y - this.y
    const heroDist = Math.hypot(hx, hy)
    if (this.sight && b.sight && p.alive && heroDist < b.sight.range && ctx.map.lineClear(this.x, this.y, p.x, p.y)) {
      this.asc.tryActivate(this.sight, ctx)
      return
    }
    if (--this.idleT > 0) return

    let tx = 0
    let ty = 0
    let chance = 0
    if (b.chase && p.alive && heroDist < b.chase.range) {
      tx = p.x
      ty = p.y
      chance = b.chase.chance
    } else if (b.home && Math.hypot(this.homeX - this.x, this.homeY - this.y) > b.home.leash) {
      tx = this.homeX
      ty = this.homeY
      chance = b.home.chance
    }
    this.pickDir(ctx, tx, ty, chance)
    this.idleT = this.roll(ctx, b.idle)
    if (this.dvx === 0 && this.dvy === 0) return
    this.wander.setDirection(this.dvx, this.dvy)
    this.asc.tryActivate(this.wander, ctx)
  }

  private roll(ctx: SimContext, r: IdleRange): number {
    return r.min + ctx.rng.int(r.range)
  }

  /** Random cardinal unit direction (or standing still), biased toward (tx, ty) with `chance`. */
  private pickDir(ctx: SimContext, tx: number, ty: number, chance: number): void {
    const r = ctx.rng.int(5)
    this.dvx = r < 4 ? DX[r]! : 0
    this.dvy = r < 4 ? DY[r]! : 0
    if (chance <= 0 || ctx.rng.next() >= chance) return
    const dx = tx - this.x
    const dy = ty - this.y
    if (Math.abs(dx) > Math.abs(dy)) {
      this.dvx = Math.sign(dx)
      this.dvy = 0
    } else {
      this.dvx = 0
      this.dvy = Math.sign(dy)
    }
  }

  private animFrame(tick: number): number {
    const { animation, brain } = this.def
    const windup = !this.asc.busy && this.idleT > 0 && this.idleT < brain.windup
    for (let i = 0; i < animation.length; i++) {
      const r = animation[i]!
      if (!this.asc.tags.has(r.tags) || (r.windup && !windup)) continue
      return r.frames[Math.floor((tick + this.id * r.phase) / r.period) % r.frames.length]!
    }
    return 0
  }

  /** Spawns and releases the effects whose tag conditions started or stopped holding. */
  private updateVfx(ctx: SimContext): void {
    const { vfx } = this.def
    for (let i = 0; i < vfx.length; i++) {
      const rule = vfx[i]!
      const ref = this.vfxRefs[i]!
      const wanted = this.asc.tags.has(rule.tags)
      if (wanted && !ref.active) ref.bind(ctx.vfx.spawn(rule.vfx, this))
      else if (!wanted && ref.active) ref.release()
    }
  }
}

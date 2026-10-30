import { FX } from '../../data/effects'
import { SWORD_VISIBLE_FRAMES, SwordAbility } from '../abilities/sword'
import { Btn, Dir } from '../constants'
import type { SimContext } from '../context'
import { Tag } from '../gas/tags'
import { SPAWN_X, SPAWN_Y } from '../map'
import { Actor } from './actor'

const SPEED = 0.055

export class Player extends Actor {
  walkPhase = 0
  moving = false
  readonly sword = this.asc.grant(new SwordAbility())
  private held = 0
  private pressed = 0

  constructor() {
    super(0.26, 0.3, 6)
    this.setPosition(SPAWN_X, SPAWN_Y)
  }

  get hp(): number {
    return this.asc.attrs.health
  }

  get maxHp(): number {
    return this.asc.attrs.maxHealth
  }

  get swordVisible(): boolean {
    return this.sword.active && this.sword.age < SWORD_VISIBLE_FRAMES
  }

  get invulnerable(): boolean {
    return this.asc.tags.has(Tag.Invulnerable)
  }

  setInput(held: number, pressed: number): void {
    this.held = held
    this.pressed = pressed
  }

  respawn(ctx: SimContext): void {
    this.asc.reset()
    this.setPosition(SPAWN_X, SPAWN_Y)
    this.z = 0
    this.asc.applyEffect(FX.Respawn, null, ctx)
  }

  protected override think(ctx: SimContext): void {
    this.moving = false
    if (this.asc.tags.has(Tag.Attacking)) return
    if (this.pressed & Btn.A && this.asc.tryActivate(this.sword, ctx)) return

    const { held } = this
    let mx = 0
    let my = 0
    if (held & Btn.Left) mx = -1
    else if (held & Btn.Right) mx = 1
    if (held & Btn.Up) my = -1
    else if (held & Btn.Down) my = 1
    if (mx === 0 && my === 0) return
    const horizontal = this.dir === Dir.Left || this.dir === Dir.Right
    // On a diagonal, keep facing along an axis that is still held so the sprite doesn't flicker.
    if (mx !== 0 && (my === 0 || horizontal)) this.dir = mx < 0 ? Dir.Left : Dir.Right
    else this.dir = my < 0 ? Dir.Up : Dir.Down
    const speed = mx !== 0 && my !== 0 ? SPEED * Math.SQRT1_2 : SPEED
    this.moveBy(ctx.map, mx * speed, my * speed)
    this.walkPhase++
    this.moving = true
  }
}

import type { Rng } from '../core/rng'
import type { Actor } from './actors/actor'
import type { TileMap } from './collision'
import type { GameplayEffect } from './gas/effect'
import type { VfxSystem } from './vfx/vfx'

/** What abilities and brains may see of the world; implemented by World. */
export interface SimContext {
  readonly rng: Rng
  readonly map: TileMap
  readonly player: Actor
  readonly tick: number
  readonly vfx: VfxSystem
  /** Event bits (Ev) raised this frame, drained by the game layer. */
  evt: number
  /** Applies `fx` to every living enemy overlapping the box (feet-plane coordinates). */
  damageEnemiesInBox(l: number, t: number, r: number, b: number, source: Actor, fx: GameplayEffect): void
}

import type { AbilityDef } from '../abilities/factory'
import type { GameplayEffect } from '../gas/effect'
import type { VfxDef } from '../vfx/vfx-def'

/** Inclusive-exclusive random frame count: `min + rng.int(range)`. */
export interface IdleRange {
  min: number
  range: number
}

export interface BrainDef {
  /** Ability used to move around while nothing else is going on. */
  wander: string
  idle: IdleRange
  /** Bias the wander direction toward the hero when closer than `range`. */
  chase: { range: number; chance: number } | null
  /** Bias the wander direction back home when farther than `leash`. */
  home: { leash: number; chance: number } | null
  /** Frames before a wander during which the `windup` animation rule applies. */
  windup: number
  /** Starts `ability` (and its `then` chain) when the hero is within `range` and in line of sight. */
  sight: { range: number; ability: string } | null
  /** Idle time after a `then` chain finishes; falls back to `idle`. */
  chainIdle: IdleRange | null
}

/** First matching rule wins; a rule with no conditions is the default. */
export interface AnimRule {
  /** All of these tags must be present. */
  tags: number
  /** Only matches during the brain's windup frames. */
  windup: boolean
  frames: number[]
  /** Ticks per frame step. */
  period: number
  /** Per-enemy offset (id * phase) so a group does not animate in lockstep. */
  phase: number
}

/** While all `tags` are present on the enemy, an instance of `vfx` exists, attached to it. */
export interface VfxRule {
  tags: number
  vfx: VfxDef
}

export interface NamedAbilityDef {
  name: string
  def: AbilityDef
  /** Name of the ability to chain into when this one ends normally. */
  then: string | null
}

export interface EnemyDef {
  id: string
  /** Spritesheet name in assets/sprites (frames are cells of the sheet). */
  sprite: string
  health: number
  hw: number
  h: number
  contactEffect: GameplayEffect
  abilities: NamedAbilityDef[]
  brain: BrainDef
  animation: AnimRule[]
  vfx: VfxRule[]
}

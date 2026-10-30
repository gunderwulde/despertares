import type { Actor } from '../actors/actor'
import type { SimContext } from '../context'

/**
 * Base gameplay ability. The AbilitySystem owns the lifecycle: it checks tag requirements and
 * cooldown on activation, grants `grantedTags` while active, cancels on `cancelOnTags`, and
 * ends the ability once `age` reaches `duration`.
 */
export abstract class GameplayAbility {
  active = false
  /** Frames since activation; 1 on the first tick. */
  age = 0
  cooldown = 0
  /** Ability the owner chains into when this one ends normally (set from data). */
  next: GameplayAbility | null = null
  /** Activated during the current tick; skipped until the next one. */
  fresh = false
  /** Mutable so abilities like a leap can size themselves on activation. */
  duration = 1
  readonly cooldownFrames: number = 0
  readonly requiredTags: number = 0
  readonly blockedTags: number = 0
  readonly grantedTags: number = 0
  readonly cancelOnTags: number = 0

  onActivate(_owner: Actor, _ctx: SimContext): void {}
  onTick(_owner: Actor, _ctx: SimContext): void {}
  onEnd(_owner: Actor, _ctx: SimContext, _cancelled: boolean): void {}
}

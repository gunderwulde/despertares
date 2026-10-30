import type { Actor } from '../actors/actor'
import type { SimContext } from '../context'
import type { GameplayAbility } from './ability'
import { Attr, AttributeSet } from './attributes'
import type { GameplayEffect } from './effect'
import { Tag, TagSet } from './tags'

const MAX_EFFECTS = 8

interface ActiveEffect {
  def: GameplayEffect | null
  remaining: number
}

/** Per-actor ability system component: tags, attributes, granted abilities and active effects. */
export class AbilitySystem {
  readonly tags = new TagSet()
  readonly attrs = new AttributeSet()
  private readonly abilities: GameplayAbility[] = []
  private readonly slots: ActiveEffect[] = []
  private activeCount = 0
  private ticking = false

  constructor(
    private readonly owner: Actor,
    maxHealth: number,
  ) {
    this.attrs.set(Attr.MaxHealth, maxHealth)
    this.attrs.set(Attr.Health, maxHealth)
    for (let i = 0; i < MAX_EFFECTS; i++) this.slots.push({ def: null, remaining: 0 })
  }

  /** True while any ability is running; brains use it to avoid stacking behaviours. */
  get busy(): boolean {
    return this.activeCount > 0
  }

  grant<T extends GameplayAbility>(ability: T): T {
    this.abilities.push(ability)
    return ability
  }

  tryActivate(a: GameplayAbility, ctx: SimContext): boolean {
    if (a.active || a.cooldown > 0) return false
    if (!this.tags.has(a.requiredTags) || this.tags.hasAny(a.blockedTags)) return false
    a.active = true
    a.age = 0
    // Chained activations made mid-tick must not also run in that same tick.
    a.fresh = this.ticking
    this.activeCount++
    this.tags.add(a.grantedTags)
    a.onActivate(this.owner, ctx)
    return true
  }

  cancel(a: GameplayAbility, ctx: SimContext): void {
    if (a.active) this.finish(a, true, ctx)
  }

  /** Applies an effect; returns false if a blocking tag stopped it. */
  applyEffect(def: GameplayEffect, source: Actor | null, ctx: SimContext): boolean {
    if (this.tags.hasAny(def.blockedByTags)) return false
    if (def.attribute >= 0) this.attrs.add(def.attribute, def.delta)
    if (def.duration > 0) this.addTimed(def)
    this.owner.onEffectApplied(def, source)
    for (let i = 0; i < def.linked.length; i++) this.applyEffect(def.linked[i]!, source, ctx)
    if (this.attrs.health <= 0 && !this.tags.has(Tag.Dead)) {
      this.tags.add(Tag.Dead)
      for (let i = 0; i < this.abilities.length; i++) this.cancel(this.abilities[i]!, ctx)
      this.owner.onDeath(ctx)
    }
    return true
  }

  tick(ctx: SimContext): void {
    this.ticking = true
    for (let i = 0; i < MAX_EFFECTS; i++) {
      const s = this.slots[i]!
      if (!s.def) continue
      if (s.remaining <= 0) {
        this.tags.remove(s.def.grantedTags)
        s.def = null
      } else {
        s.remaining--
      }
    }
    for (let i = 0; i < this.abilities.length; i++) {
      const a = this.abilities[i]!
      if (a.cooldown > 0) a.cooldown--
      if (!a.active) continue
      if (a.fresh) continue
      if (this.tags.hasAny(a.cancelOnTags)) {
        this.finish(a, true, ctx)
        continue
      }
      a.age++
      a.onTick(this.owner, ctx)
      if (a.active && a.age >= a.duration) this.finish(a, false, ctx)
    }
    this.ticking = false
    for (let i = 0; i < this.abilities.length; i++) this.abilities[i]!.fresh = false
  }

  /** Back to a clean slate with full health; no end callbacks fire. */
  reset(): void {
    for (let i = 0; i < MAX_EFFECTS; i++) this.slots[i]!.def = null
    for (let i = 0; i < this.abilities.length; i++) {
      const a = this.abilities[i]!
      a.active = false
      a.cooldown = 0
    }
    this.activeCount = 0
    this.tags.clear()
    this.attrs.set(Attr.Health, this.attrs.maxHealth)
  }

  private finish(a: GameplayAbility, cancelled: boolean, ctx: SimContext): void {
    a.active = false
    this.activeCount--
    this.tags.remove(a.grantedTags)
    a.cooldown = a.cooldownFrames
    a.onEnd(this.owner, ctx, cancelled)
    this.owner.onAbilityEnded(a, cancelled, ctx)
  }

  /** Re-applying an active effect refreshes its timer instead of stacking. */
  private addTimed(def: GameplayEffect): void {
    let free: ActiveEffect | null = null
    for (let i = 0; i < MAX_EFFECTS; i++) {
      const s = this.slots[i]!
      if (s.def === def) {
        s.remaining = def.duration
        return
      }
      if (!s.def && !free) free = s
    }
    if (!free) return
    free.def = def
    free.remaining = def.duration
    this.tags.add(def.grantedTags)
  }
}

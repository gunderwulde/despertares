import type { GameplayAbility } from '../gas/ability'
import { LeapAbility, type LeapParams } from './leap'
import { MoveBurstAbility, type MoveBurstParams } from './move-burst'
import { TimedAbility } from './timed'

/** Ability configuration as parsed from data/enemies.json (tags already resolved to masks). */
export type AbilityDef =
  | ({ type: 'moveBurst' } & MoveBurstParams)
  | ({ type: 'leap' } & LeapParams)
  | { type: 'timed'; frames: number; grantedTags: number }

export function createAbility(def: AbilityDef): GameplayAbility {
  switch (def.type) {
    case 'moveBurst': return new MoveBurstAbility(def)
    case 'leap': return new LeapAbility(def)
    case 'timed': return new TimedAbility(def.frames, def.grantedTags)
  }
}

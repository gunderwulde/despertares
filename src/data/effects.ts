import { ATTRIBUTE_BY_NAME } from '../sim/gas/attributes'
import { type GameplayEffect, defineEffect } from '../sim/gas/effect'
import { tagMask } from '../sim/gas/tags'
import raw from './effects.json'

/**
 * Effect assets are defined in effects.json (frames at the fixed 60 Hz step):
 *   attribute / delta   one-shot attribute change applied on application
 *   duration            frames that `grantedTags` stay on the target (0 = none)
 *   blockedByTags       the effect is rejected while the target has any of these
 *   knockback           tiles per frame pushed away from the source
 *   linked              extra effects applied together with this one
 */
interface RawEffect {
  attribute?: string
  delta?: number
  duration?: number
  grantedTags?: string[]
  blockedByTags?: string[]
  knockback?: number
  linked?: RawEffect[]
}

function build(def: RawEffect, where: string): GameplayEffect {
  let attribute = -1
  if (def.attribute !== undefined) {
    const a = ATTRIBUTE_BY_NAME[def.attribute]
    if (a === undefined) throw new Error(`${where}: unknown attribute "${def.attribute}"`)
    attribute = a
  }
  return defineEffect({
    attribute,
    delta: def.delta ?? 0,
    duration: def.duration ?? 0,
    grantedTags: tagMask(def.grantedTags ?? [], where),
    blockedByTags: tagMask(def.blockedByTags ?? [], where),
    knockback: def.knockback ?? 0,
    linked: (def.linked ?? []).map((l, i) => build(l, `${where}.linked[${i}]`)),
  })
}

export type EffectName = keyof typeof raw

export const FX = Object.fromEntries(
  Object.entries(raw as Record<string, RawEffect>).map(([name, def]) => [name, build(def, `effects.json:${name}`)]),
) as Record<EffectName, GameplayEffect>

/** Looks an effect up by name for data files that reference one; throws with context if missing. */
export function effectByName(name: string, where: string): GameplayEffect {
  const fx = (FX as Record<string, GameplayEffect | undefined>)[name]
  if (!fx) throw new Error(`${where}: unknown effect "${name}"`)
  return fx
}

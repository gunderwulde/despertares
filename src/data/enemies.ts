import type { AbilityDef } from '../sim/abilities/factory'
import type { LeapTarget } from '../sim/abilities/leap'
import type { AnimRule, BrainDef, EnemyDef, IdleRange, NamedAbilityDef, VfxRule } from '../sim/actors/enemy-def'
import { tagMask } from '../sim/gas/tags'
import { effectByName } from './effects'
import raw from './enemies.json'
import { vfxByName } from './vfx'

type Obj = Record<string, unknown>

function obj(v: unknown, where: string): Obj {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) throw new Error(`${where}: expected an object`)
  return v as Obj
}

function num(o: Obj, key: string, where: string, fallback?: number): number {
  const v = o[key]
  if (v === undefined && fallback !== undefined) return fallback
  if (typeof v !== 'number' || !Number.isFinite(v)) throw new Error(`${where}.${key}: expected a number`)
  return v
}

function str(o: Obj, key: string, where: string): string {
  const v = o[key]
  if (typeof v !== 'string') throw new Error(`${where}.${key}: expected a string`)
  return v
}

function strings(o: Obj, key: string, where: string): string[] {
  const v = o[key] ?? []
  if (!Array.isArray(v) || v.some((x) => typeof x !== 'string')) throw new Error(`${where}.${key}: expected a list of strings`)
  return v as string[]
}

function idle(v: unknown, where: string): IdleRange {
  const o = obj(v, where)
  return { min: num(o, 'min', where), range: Math.max(1, num(o, 'range', where)) }
}

function parseAbility(name: string, v: unknown, where: string): NamedAbilityDef {
  const o = obj(v, where)
  const type = str(o, 'type', where)
  const grantedTags = tagMask(strings(o, 'grantedTags', where), where)
  let def: AbilityDef
  switch (type) {
    case 'moveBurst':
      def = { type, frames: num(o, 'frames', where), speed: num(o, 'speed', where), arc: num(o, 'arc', where, 0), grantedTags }
      break
    case 'leap': {
      const target = str(o, 'target', where)
      if (target !== 'player' && target !== 'home') throw new Error(`${where}.target: expected "player" or "home"`)
      def = {
        type,
        target: target as LeapTarget,
        speed: num(o, 'speed', where),
        arc: num(o, 'arc', where, 0),
        minFrames: num(o, 'minFrames', where),
        maxFrames: num(o, 'maxFrames', where),
        maxRange: num(o, 'maxRange', where),
      }
      break
    }
    case 'timed':
      def = { type, frames: num(o, 'frames', where), grantedTags }
      break
    default:
      throw new Error(`${where}.type: unknown ability type "${type}"`)
  }
  return { name, def, then: typeof o.then === 'string' ? o.then : null }
}

function parseBrain(v: unknown, abilityNames: ReadonlySet<string>, where: string): BrainDef {
  const o = obj(v, where)
  const wander = str(o, 'wander', where)
  if (!abilityNames.has(wander)) throw new Error(`${where}.wander: unknown ability "${wander}"`)
  let sight: BrainDef['sight'] = null
  if (o.sight !== undefined) {
    const s = obj(o.sight, `${where}.sight`)
    const ability = str(s, 'ability', `${where}.sight`)
    if (!abilityNames.has(ability)) throw new Error(`${where}.sight.ability: unknown ability "${ability}"`)
    sight = { range: num(s, 'range', `${where}.sight`), ability }
  }
  const chase = o.chase === undefined ? null : obj(o.chase, `${where}.chase`)
  const home = o.home === undefined ? null : obj(o.home, `${where}.home`)
  return {
    wander,
    idle: idle(o.idle, `${where}.idle`),
    chase: chase && { range: num(chase, 'range', `${where}.chase`), chance: num(chase, 'chance', `${where}.chase`) },
    home: home && { leash: num(home, 'leash', `${where}.home`), chance: num(home, 'chance', `${where}.home`) },
    windup: num(o, 'windup', where, 0),
    sight,
    chainIdle: o.chainIdle === undefined ? null : idle(o.chainIdle, `${where}.chainIdle`),
  }
}

function parseAnimation(v: unknown, sheetFrames: number, where: string): AnimRule[] {
  if (!Array.isArray(v) || v.length === 0) throw new Error(`${where}: expected a non-empty list of rules`)
  const rules = v.map((r, i): AnimRule => {
    const w = `${where}[${i}]`
    const o = obj(r, w)
    const frames = o.frames
    if (!Array.isArray(frames) || frames.length === 0 || frames.some((f) => typeof f !== 'number' || f < 0 || f >= sheetFrames)) {
      throw new Error(`${w}.frames: expected frame indices 0..${sheetFrames - 1}`)
    }
    return {
      tags: tagMask(strings(o, 'tags', w), w),
      windup: o.when === 'windup',
      frames: frames as number[],
      period: Math.max(1, num(o, 'period', w, 1)),
      phase: num(o, 'phase', w, 0),
    }
  })
  const last = rules[rules.length - 1]!
  if (last.tags !== 0 || last.windup) throw new Error(`${where}: the last rule must be an unconditional default`)
  return rules
}

function parseVfxRules(v: unknown, where: string): VfxRule[] {
  if (v === undefined) return []
  if (!Array.isArray(v)) throw new Error(`${where}: expected a list`)
  return v.map((r, i) => {
    const w = `${where}[${i}]`
    const o = obj(r, w)
    return { tags: tagMask(strings(o, 'tags', w), w), vfx: vfxByName(str(o, 'effect', w), `${w}.effect`) }
  })
}

/** Upper bound for animation frame indices; the art loader checks the real sheet width. */
export const MAX_ENEMY_FRAMES = 16

export function parseEnemy(id: string, v: unknown): EnemyDef {
  const where = `enemies.json:${id}`
  const o = obj(v, where)
  const abilitiesRaw = obj(o.abilities, `${where}.abilities`)
  const abilities = Object.entries(abilitiesRaw).map(([n, a]) => parseAbility(n, a, `${where}.abilities.${n}`))
  const names = new Set(abilities.map((a) => a.name))
  for (const a of abilities) {
    if (a.then !== null && !names.has(a.then)) throw new Error(`${where}.abilities.${a.name}.then: unknown ability "${a.then}"`)
  }
  const body = obj(o.body, `${where}.body`)
  return {
    id,
    sprite: str(o, 'sprite', where),
    health: num(o, 'health', where),
    hw: num(body, 'hw', `${where}.body`),
    h: num(body, 'h', `${where}.body`),
    contactEffect: effectByName(str(o, 'contactEffect', where), `${where}.contactEffect`),
    abilities,
    brain: parseBrain(o.brain, names, `${where}.brain`),
    animation: parseAnimation(o.animation, MAX_ENEMY_FRAMES, `${where}.animation`),
    vfx: parseVfxRules(o.vfx, `${where}.vfx`),
  }
}

export function parseEnemies(data: unknown): { defs: Record<string, EnemyDef>; roster: string[] } {
  const root = obj(data, 'enemies.json')
  const defs: Record<string, EnemyDef> = {}
  for (const [id, v] of Object.entries(obj(root.enemies, 'enemies.json:enemies'))) defs[id] = parseEnemy(id, v)
  const roster: string[] = []
  const list = root.roster
  if (!Array.isArray(list)) throw new Error('enemies.json:roster: expected a list')
  list.forEach((entry, i) => {
    const w = `enemies.json:roster[${i}]`
    const e = obj(entry, w)
    const id = str(e, 'enemy', w)
    if (!defs[id]) throw new Error(`${w}.enemy: unknown enemy "${id}"`)
    for (let n = num(e, 'count', w); n > 0; n--) roster.push(id)
  })
  return { defs, roster }
}

const parsed = parseEnemies(raw)

export const ENEMY_DEFS: Readonly<Record<string, EnemyDef>> = parsed.defs
/** One entry per pooled enemy, expanded from the roster counts. */
export const ENEMY_ROSTER: readonly string[] = parsed.roster

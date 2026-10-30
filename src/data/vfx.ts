import type { VfxDef } from '../sim/vfx/vfx-def'
import raw from './vfx.json'

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

function bool(o: Obj, key: string, where: string, fallback: boolean): boolean {
  const v = o[key]
  if (v === undefined) return fallback
  if (typeof v !== 'boolean') throw new Error(`${where}.${key}: expected true or false`)
  return v
}

export function parseVfx(id: string, v: unknown): VfxDef {
  const where = `vfx.json:${id}`
  const o = obj(v, where)
  if (typeof o.sprite !== 'string') throw new Error(`${where}.sprite: expected a string`)
  const frames = o.frames
  if (!Array.isArray(frames) || frames.length === 0 || frames.some((f) => !Number.isInteger(f) || f < 0)) {
    throw new Error(`${where}.frames: expected a non-empty list of frame indices`)
  }
  const anchor = o.anchor ?? 'head'
  if (anchor !== 'head' && anchor !== 'feet') throw new Error(`${where}.anchor: expected "head" or "feet"`)
  const offset = o.offset === undefined ? {} : obj(o.offset, `${where}.offset`)
  const bob = o.bob === undefined ? {} : obj(o.bob, `${where}.bob`)
  const duration = num(o, 'duration', where, 0)
  if (duration < 0) throw new Error(`${where}.duration: must not be negative`)
  return {
    id,
    sprite: o.sprite,
    frames: frames as number[],
    period: Math.max(1, num(o, 'period', where, 1)),
    size: num(o, 'size', where),
    anchor,
    offsetX: num(offset, 'x', `${where}.offset`, 0),
    offsetY: num(offset, 'y', `${where}.offset`, 0),
    bobAmplitude: num(bob, 'amplitude', `${where}.bob`, 0),
    bobSpeed: num(bob, 'speed', `${where}.bob`, 0),
    duration,
    despawnWithOwner: bool(o, 'despawnWithOwner', where, true),
    alwaysOnTop: bool(o, 'alwaysOnTop', where, false),
  }
}

export const VFX_DEFS: Readonly<Record<string, VfxDef>> = Object.fromEntries(
  Object.entries(obj(raw, 'vfx.json')).map(([id, v]) => [id, parseVfx(id, v)]),
)

/** Looks an effect up by id for data files that reference one; throws with context if missing. */
export function vfxByName(id: string, where: string): VfxDef {
  const def = VFX_DEFS[id]
  if (!def) throw new Error(`${where}: unknown vfx "${id}"`)
  return def
}

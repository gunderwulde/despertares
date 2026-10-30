import { Rng } from '../core/rng'

export const T = { Grass: 0, Flower: 1, Sand: 2, Water: 3, Tree: 4, Rock: 5, House: 6 } as const

export const MAP_W = 30
export const MAP_H = 18
export const ROOM_W = 10
export const ROOM_H = 9
export const SPAWN_X = 5.5
export const SPAWN_Y = 13.5
const MAP_SEED = 1987

export function isSolid(t: number): boolean {
  return t >= T.Water
}

/** 3x2 rooms of 10x9 tiles. Rooms are separated by tree/rock lines with 2-tile gaps. */
export function buildMap(): Uint8Array {
  const rng = new Rng(MAP_SEED)
  const m = new Uint8Array(MAP_W * MAP_H)
  const at = (x: number, y: number): number => y * MAP_W + x
  const set = (x: number, y: number, t: number): void => {
    if (x >= 0 && y >= 0 && x < MAP_W && y < MAP_H) m[at(x, y)] = t
  }

  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      let t: number = T.Grass
      if (y >= 16) t = T.Water
      else if (y === 15) t = T.Sand
      else if (x === 0 || x === MAP_W - 1 || y === 0) t = T.Tree
      m[at(x, y)] = t
    }
  }
  for (let x = 1; x < MAP_W - 1; x++) if (rng.next() < 0.35) set(x, 14, T.Sand)

  const gapsX = [4, 5, 14, 15, 24, 25]
  for (let x = 1; x < MAP_W - 1; x++) if (!gapsX.includes(x)) set(x, 9, T.Tree)
  const gapsY = [3, 4, 12, 13]
  for (let y = 1; y < 15; y++) {
    if (gapsY.includes(y)) continue
    set(10, y, T.Rock)
    set(20, y, T.Rock)
  }

  for (let y = 1; y < 15; y++) {
    for (let x = 1; x < MAP_W - 1; x++) {
      if (m[at(x, y)] !== T.Grass) continue
      if (Math.abs(x - 10) <= 1 || Math.abs(x - 20) <= 1 || Math.abs(y - 9) <= 1) continue
      if (Math.hypot(x - SPAWN_X, y - SPAWN_Y) < 3) continue
      const r = rng.next()
      if (r < 0.06) set(x, y, T.Tree)
      else if (r < 0.09) set(x, y, T.Rock)
      else if (r < 0.2) set(x, y, T.Flower)
    }
  }

  const house = (x0: number, y0: number, w: number, h: number): void => {
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) set(x, y, T.House)
  }
  house(3, 3, 3, 2)
  house(13, 2, 3, 2)
  house(22, 11, 3, 2)
  return m
}

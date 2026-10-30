import { MAP_H, MAP_W, isSolid } from './map'

export function overlap(al: number, at: number, ar: number, ab: number, bl: number, bt: number, br: number, bb: number): boolean {
  return al < br && ar > bl && at < bb && ab > bt
}

/** Axis-separated AABB movement against the tile grid. Boxes are (x ± hw, y - h .. y). */
export class TileMap {
  constructor(readonly tiles: Uint8Array) {}

  blocked(l: number, t: number, r: number, b: number): boolean {
    const x0 = Math.floor(l)
    const x1 = Math.floor(r - 1e-6)
    const y0 = Math.floor(t)
    const y1 = Math.floor(b - 1e-6)
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        if (x < 0 || y < 0 || x >= MAP_W || y >= MAP_H || isSolid(this.tiles[y * MAP_W + x]!)) return true
      }
    }
    return false
  }

  moveX(x: number, y: number, dx: number, hw: number, h: number): number {
    if (dx === 0) return x
    const nx = x + dx
    if (!this.blocked(nx - hw, y - h, nx + hw, y)) return nx
    return dx > 0 ? Math.floor(nx + hw) - hw - 1e-4 : Math.floor(nx - hw) + 1 + hw + 1e-4
  }

  moveY(x: number, y: number, dy: number, hw: number, h: number): number {
    if (dy === 0) return y
    const ny = y + dy
    if (!this.blocked(x - hw, ny - h, x + hw, ny)) return ny
    return dy > 0 ? Math.floor(ny - 1e-6) - 1e-4 : Math.floor(ny - h) + 1 + h + 1e-4
  }

  /** Sampled line of sight between two floor points. */
  lineClear(x0: number, y0: number, x1: number, y1: number): boolean {
    const steps = Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 0.4)
    for (let i = 1; i < steps; i++) {
      const t = i / steps
      const x = Math.floor(x0 + (x1 - x0) * t)
      const y = Math.floor(y0 + (y1 - y0) * t)
      if (x < 0 || y < 0 || x >= MAP_W || y >= MAP_H || isSolid(this.tiles[y * MAP_W + x]!)) return false
    }
    return true
  }
}

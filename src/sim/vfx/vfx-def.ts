/** Visual effect configuration, loaded from data/vfx.json. Lengths are world units (tiles). */
export interface VfxDef {
  id: string
  /** Spritesheet name in assets/sprites; cells are square, as tall as the sheet. */
  sprite: string
  frames: number[]
  /** Sim frames per animation step. */
  period: number
  /** Width and height of the quad. */
  size: number
  /** `head` floats above the owner's sprite, `feet` sits on the ground at its position. */
  anchor: 'head' | 'feet'
  offsetX: number
  offsetY: number
  bobAmplitude: number
  /** Radians of bob phase per sim frame. */
  bobSpeed: number
  /** Lifetime in sim frames; 0 lasts until the owner releases it. */
  duration: number
  /** Disappears as soon as the owner dies; otherwise it outlives the owner. */
  despawnWithOwner: boolean
  /** Drawn over everything, ignoring depth (walls and trees do not hide it). */
  alwaysOnTop: boolean
}

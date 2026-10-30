import * as THREE from 'three'

export const VIEW_W = 320
export const VIEW_H = 288

/** World units of screen height at the focus point, in both camera modes. */
export const VIEW_UNITS = 8
export const VIEW_HALF_W = (VIEW_UNITS * (VIEW_W / VIEW_H)) / 2
export const PERSP_FOV = 45
export const PERSP_DIST = VIEW_UNITS / (2 * Math.tan(((PERSP_FOV / 2) * Math.PI) / 180))
/** Camera pitch above the ground plane; lower is less top-down. */
export const ELEVATION = (40 * Math.PI) / 180
export const SIN = Math.sin(ELEVATION)
export const COS = Math.cos(ELEVATION)
/** Upright sprites are stretched so a 1-tile sprite covers one screen unit under the tilted camera. */
export const SPRITE_H = 1 / COS

export function spriteGeometry(): THREE.PlaneGeometry {
  return new THREE.PlaneGeometry(1, SPRITE_H).translate(0, SPRITE_H / 2, 0)
}

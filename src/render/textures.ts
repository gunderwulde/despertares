import * as THREE from 'three'
import { Rng } from '../core/rng'

/** Procedural placeholder art (all original). Swap for atlas art via docs/ASSET_PIPELINE.md. */

function canvas(w = 16, h = 16): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return [c, c.getContext('2d', { willReadFrequently: true })!]
}

function rect(ctx: CanvasRenderingContext2D, color: string, x: number, y: number, w: number, h: number): void {
  ctx.fillStyle = color
  ctx.fillRect(x, y, w, h)
}

function speckle(ctx: CanvasRenderingContext2D, rng: Rng, color: string, n: number): void {
  ctx.fillStyle = color
  for (let i = 0; i < n; i++) ctx.fillRect(rng.int(16), rng.int(16), 1, 1)
}

function outline(c: HTMLCanvasElement, ctx: CanvasRenderingContext2D, color: string): void {
  const w = c.width
  const h = c.height
  const src = ctx.getImageData(0, 0, w, h)
  const a = (x: number, y: number): number => (x < 0 || y < 0 || x >= w || y >= h ? 0 : src.data[(y * w + x) * 4 + 3]!)
  ctx.fillStyle = color
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (a(x, y) > 0) continue
      if (a(x - 1, y) || a(x + 1, y) || a(x, y - 1) || a(x, y + 1)) ctx.fillRect(x, y, 1, 1)
    }
  }
}

function toTexture(c: HTMLCanvasElement, repeat = false): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.magFilter = THREE.NearestFilter
  t.minFilter = THREE.NearestFilter
  t.generateMipmaps = false
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping
  return t
}

export function makeTileTextures(): THREE.CanvasTexture[] {
  const rng = new Rng(42)
  const out: THREE.CanvasTexture[] = []

  // 0 grass
  let [c, g] = canvas()
  rect(g, '#58b858', 0, 0, 16, 16)
  speckle(g, rng, '#3f9a47', 16)
  speckle(g, rng, '#7bd06a', 10)
  out.push(toTexture(c))

  // 1 flower
  ;[c, g] = canvas()
  rect(g, '#58b858', 0, 0, 16, 16)
  speckle(g, rng, '#3f9a47', 12)
  for (const [x, y, col] of [[3, 4, '#ffffff'], [11, 9, '#ffd84a'], [6, 12, '#ff8fb0'], [13, 2, '#ffffff']] as const) {
    rect(g, col, x, y, 2, 2)
    rect(g, '#e8a020', x, y, 1, 1)
  }
  out.push(toTexture(c))

  // 2 sand
  ;[c, g] = canvas()
  rect(g, '#e8d29a', 0, 0, 16, 16)
  speckle(g, rng, '#d4bb7c', 20)
  speckle(g, rng, '#f6e8bb', 8)
  out.push(toTexture(c))

  // 3 water (repeats, scrolled by the renderer)
  ;[c, g] = canvas()
  rect(g, '#2c6fd0', 0, 0, 16, 16)
  rect(g, '#5b95e6', 2, 3, 5, 1)
  rect(g, '#5b95e6', 9, 8, 5, 1)
  rect(g, '#1f55a8', 1, 12, 4, 1)
  rect(g, '#1f55a8', 10, 14, 4, 1)
  out.push(toTexture(c, true))

  // 4 tree
  ;[c, g] = canvas()
  rect(g, '#14572b', 0, 0, 16, 16)
  for (const [x, y] of [[4, 4], [11, 5], [8, 10], [3, 11], [12, 12]] as const) {
    g.fillStyle = '#2f9e44'
    g.beginPath()
    g.arc(x, y, 4, 0, Math.PI * 2)
    g.fill()
  }
  speckle(g, rng, '#57c26a', 14)
  speckle(g, rng, '#0e3f1f', 10)
  out.push(toTexture(c))

  // 5 rock
  ;[c, g] = canvas()
  rect(g, '#8d8d9a', 0, 0, 16, 16)
  rect(g, '#b8b8c8', 0, 0, 16, 2)
  rect(g, '#5d5d6b', 0, 14, 16, 2)
  rect(g, '#5d5d6b', 7, 3, 1, 5)
  rect(g, '#5d5d6b', 4, 8, 6, 1)
  rect(g, '#5d5d6b', 11, 9, 1, 5)
  speckle(g, rng, '#a4a4b3', 12)
  out.push(toTexture(c))

  // 6 house (roof tiles)
  ;[c, g] = canvas()
  rect(g, '#c0492f', 0, 0, 16, 16)
  for (let y = 0; y < 16; y += 4) {
    rect(g, '#8f3320', 0, y + 3, 16, 1)
    for (let x = (y / 4) % 2 ? 4 : 0; x < 16; x += 8) rect(g, '#8f3320', x, y, 1, 3)
    rect(g, '#e0674a', 0, y, 16, 1)
  }
  out.push(toTexture(c))
  return out
}

const SKIN = '#f2c79c'
const GREEN = '#2f9e44'
const GREEN_D = '#1b6b2d'
const GOLD = '#e0a030'
const BROWN = '#7a4a22'
const EYE = '#1a1a2e'

function drawHeroDown(g: CanvasRenderingContext2D, f: number): void {
  rect(g, GREEN, 4, 1, 8, 4)
  rect(g, GREEN_D, 3, 3, 1, 3)
  rect(g, GREEN_D, 12, 3, 1, 3)
  rect(g, GOLD, 4, 4, 8, 1)
  rect(g, SKIN, 5, 5, 6, 4)
  rect(g, EYE, 6, 6, 1, 2)
  rect(g, EYE, 9, 6, 1, 2)
  rect(g, GREEN, 4, 9, 8, 4)
  rect(g, BROWN, 4, 11, 8, 1)
  rect(g, SKIN, 3, 9, 1, 2)
  rect(g, '#4a6fd6', 11, 9, 3, 4)
  rect(g, '#9bb4f0', 12, 10, 1, 2)
  rect(g, BROWN, 5, f ? 12 : 13, 2, f ? 3 : 2)
  rect(g, BROWN, 9, f ? 13 : 12, 2, f ? 2 : 3)
}

function drawHeroUp(g: CanvasRenderingContext2D, f: number): void {
  rect(g, GREEN, 4, 1, 8, 5)
  rect(g, GREEN_D, 3, 3, 1, 3)
  rect(g, GREEN_D, 12, 3, 1, 3)
  rect(g, GOLD, 4, 5, 8, 3)
  rect(g, GREEN, 4, 8, 8, 5)
  rect(g, BROWN, 4, 11, 8, 1)
  rect(g, SKIN, 3, 9, 1, 2)
  rect(g, SKIN, 12, 9, 1, 2)
  rect(g, '#4a6fd6', 5, 8, 6, 4)
  rect(g, BROWN, 5, f ? 12 : 13, 2, f ? 3 : 2)
  rect(g, BROWN, 9, f ? 13 : 12, 2, f ? 2 : 3)
}

function drawHeroLeft(g: CanvasRenderingContext2D, f: number): void {
  rect(g, GREEN, 4, 1, 8, 4)
  rect(g, GREEN_D, 11, 3, 3, 3)
  rect(g, GOLD, 8, 4, 4, 4)
  rect(g, SKIN, 4, 5, 5, 4)
  rect(g, EYE, 5, 6, 1, 2)
  rect(g, GREEN, 5, 9, 7, 4)
  rect(g, BROWN, 5, 11, 7, 1)
  rect(g, '#4a6fd6', 3, 9, 3, 4)
  rect(g, '#9bb4f0', 4, 10, 1, 2)
  rect(g, BROWN, f ? 5 : 6, 13, 3, 2)
  rect(g, BROWN, f ? 9 : 8, 13, 3, 2)
}

function drawSlime(g: CanvasRenderingContext2D, f: number): void {
  const y = f ? 9 : 7
  rect(g, '#4cc24c', 3, y + 1, 10, 14 - y - 1)
  rect(g, '#4cc24c', 5, y, 6, 1)
  rect(g, '#8be88b', 5, y + 1, 3, 1)
  rect(g, '#2f8f2f', 3, 13, 10, 1)
  rect(g, '#ffffff', 5, y + 3, 2, 2)
  rect(g, '#ffffff', 9, y + 3, 2, 2)
  rect(g, EYE, 6, y + 4, 1, 1)
  rect(g, EYE, 10, y + 4, 1, 1)
}

function drawSwordDown(g: CanvasRenderingContext2D): void {
  rect(g, BROWN, 7, 1, 2, 2)
  rect(g, '#d8b030', 5, 3, 6, 1)
  rect(g, '#e8f0ff', 7, 4, 2, 9)
  rect(g, '#9fb0d0', 8, 4, 1, 9)
  rect(g, '#e8f0ff', 7, 13, 1, 1)
}

function drawSwordLeft(g: CanvasRenderingContext2D): void {
  rect(g, BROWN, 13, 7, 2, 2)
  rect(g, '#d8b030', 12, 5, 1, 6)
  rect(g, '#e8f0ff', 3, 7, 9, 2)
  rect(g, '#9fb0d0', 3, 8, 9, 1)
  rect(g, '#e8f0ff', 2, 7, 1, 1)
}

function flip(src: HTMLCanvasElement, h: boolean, v: boolean): HTMLCanvasElement {
  const [c, g] = canvas(src.width, src.height)
  g.translate(h ? src.width : 0, v ? src.height : 0)
  g.scale(h ? -1 : 1, v ? -1 : 1)
  g.drawImage(src, 0, 0)
  return c
}

function sprite(draw: (g: CanvasRenderingContext2D) => void): HTMLCanvasElement {
  const [c, g] = canvas()
  draw(g)
  outline(c, g, '#1a1a2e')
  return c
}

/** Hero frames indexed `dir * 2 + frame` with dir order Down, Up, Left, Right. */
export function makeHeroTextures(): THREE.CanvasTexture[] {
  const out: THREE.CanvasTexture[] = []
  for (const draw of [drawHeroDown, drawHeroUp, drawHeroLeft]) {
    for (let f = 0; f < 2; f++) out.push(toTexture(sprite((g) => draw(g, f))))
  }
  for (let f = 0; f < 2; f++) out.push(toTexture(flip(sprite((g) => drawHeroLeft(g, f)), true, false)))
  return out
}

export function makeSlimeTextures(): THREE.CanvasTexture[] {
  return [0, 1].map((f) => toTexture(sprite((g) => drawSlime(g, f))))
}

/** Sword sprites indexed by dir: Down, Up, Left, Right. */
export function makeSwordTextures(): THREE.CanvasTexture[] {
  const down = sprite(drawSwordDown)
  const left = sprite(drawSwordLeft)
  return [down, flip(down, false, true), left, flip(left, true, false)].map((c) => toTexture(c))
}

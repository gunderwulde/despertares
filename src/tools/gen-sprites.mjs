// Generates the PNG spritesheets in assets/sprites/ (original art, drawn in code).
// Run with `pnpm gen:sprites`; the PNGs are committed and are what the game loads.
// Shapes are authored on a 16-unit grid (`r`) and refined with details on a 32-unit grid
// (`px32`); both scale to the cell size. Terrain uses raw pixels (`px`).
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import { fileURLToPath } from 'node:url'

/** Sprite and terrain cell sizes in pixels. Sprites are authored on a 32-pixel grid and scaled. */
const CELL = 128
const TILE = 128
const EMOTE = 64
const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../assets/sprites')

// --- PNG encoding (RGBA8, no filtering) -------------------------------------------------
const CRC = new Uint32Array(256).map((_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})
function crc32(buf) {
  let c = 0xffffffff
  for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}
function encodePng(w, h, rgba) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(w, 0)
  ihdr.writeUInt32BE(h, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  const raw = Buffer.alloc((w * 4 + 1) * h)
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0
    rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4)
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

// --- Drawing ----------------------------------------------------------------------------
function rgb(hex) {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

class Sheet {
  constructor(name, cells, size = CELL) {
    this.name = name
    this.size = size
    this.w = cells * size
    this.buf = Buffer.alloc(this.w * size * 4)
  }

  cell(i) {
    return new Cell(this, i * this.size)
  }

  save() {
    fs.mkdirSync(OUT, { recursive: true })
    const file = path.join(OUT, `${this.name}.png`)
    fs.writeFileSync(file, encodePng(this.w, this.size, this.buf))
    console.log(`${path.relative(process.cwd(), file)}  ${this.w}x${this.size}`)
  }
}

class Cell {
  constructor(sheet, x0) {
    this.s = sheet
    this.x0 = x0
    this.n = sheet.size
    /** Pixels per 16-grid unit. */
    this.k = sheet.size / 16
  }

  set(x, y, hex) {
    if (x < 0 || y < 0 || x >= this.n || y >= this.n) return
    const [r, g, b] = rgb(hex)
    const o = (y * this.s.w + this.x0 + x) * 4
    this.s.buf[o] = r
    this.s.buf[o + 1] = g
    this.s.buf[o + 2] = b
    this.s.buf[o + 3] = 255
  }

  alpha(x, y) {
    if (x < 0 || y < 0 || x >= this.n || y >= this.n) return 0
    return this.s.buf[(y * this.s.w + this.x0 + x) * 4 + 3]
  }

  /** Raw 32-grid rectangle. */
  px(hex, x, y, w = 1, h = 1) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, hex)
  }

  /** Rectangle on the 32-unit grid, scaled to the cell size. */
  px32(hex, x, y, w = 1, h = 1) {
    const f = this.n / 32
    this.px(hex, x * f, y * f, w * f, h * f)
  }

  /** 16-grid rectangle (each unit is `k` pixels). */
  r(hex, x, y, w, h) {
    this.px(hex, x * this.k, y * this.k, w * this.k, h * this.k)
  }

  disc(hex, cx, cy, rad) {
    for (let y = -rad; y <= rad; y++) for (let x = -rad; x <= rad; x++) if (x * x + y * y <= rad * rad) this.set(cx + x, cy + y, hex)
  }

  /** Draws an outline 1/32 of the cell thick. */
  outline(hex) {
    for (let i = 0; i < this.n / 32; i++) this.outlinePass(hex)
  }

  outlinePass(hex) {
    const mark = []
    for (let y = 0; y < this.n; y++) {
      for (let x = 0; x < this.n; x++) {
        if (this.alpha(x, y)) continue
        if (this.alpha(x - 1, y) || this.alpha(x + 1, y) || this.alpha(x, y - 1) || this.alpha(x, y + 1)) mark.push([x, y])
      }
    }
    for (const [x, y] of mark) this.set(x, y, hex)
  }

  /** Copies `src` into this cell, optionally mirrored. */
  copyFrom(src, flipH, flipV) {
    for (let y = 0; y < this.n; y++) {
      for (let x = 0; x < this.n; x++) {
        const sx = flipH ? this.n - 1 - x : x
        const sy = flipV ? this.n - 1 - y : y
        const so = (sy * src.s.w + src.x0 + sx) * 4
        const o = (y * this.s.w + this.x0 + x) * 4
        src.s.buf.copy(this.s.buf, o, so, so + 4)
      }
    }
  }
}

const INK = '#1a1a2e'
const SKIN = '#f2c79c'
const GREEN = '#2f9e44'
const GREEN_L = '#4cbf5b'
const GREEN_D = '#1b6b2d'
const GOLD = '#e0a030'
const BROWN = '#7a4a22'

// --- Hero -------------------------------------------------------------------------------
function heroDown(c, f) {
  c.r(GREEN, 4, 1, 8, 4)
  c.r(GREEN_D, 3, 3, 1, 3)
  c.r(GREEN_D, 12, 3, 1, 3)
  c.px32(GREEN_L, 10, 3, 8, 1)
  c.r(GOLD, 4, 4, 8, 1)
  c.r(SKIN, 5, 5, 6, 4)
  c.px32(INK, 12, 12, 2, 4)
  c.px32(INK, 18, 12, 2, 4)
  c.px32('#d9a574', 10, 17, 12, 1)
  c.r(GREEN, 4, 9, 8, 4)
  c.px32(GREEN_L, 9, 19, 14, 1)
  c.r(BROWN, 4, 11, 8, 1)
  c.px32(GOLD, 14, 22, 4, 2)
  c.r(SKIN, 3, 9, 1, 2)
  c.r('#4a6fd6', 11, 9, 3, 4)
  c.r('#9bb4f0', 12, 10, 1, 2)
  c.r(BROWN, 5, f ? 12 : 13, 2, f ? 3 : 2)
  c.r(BROWN, 9, f ? 13 : 12, 2, f ? 2 : 3)
}

function heroUp(c, f) {
  c.r(GREEN, 4, 1, 8, 5)
  c.r(GREEN_D, 3, 3, 1, 3)
  c.r(GREEN_D, 12, 3, 1, 3)
  c.px32(GREEN_L, 10, 3, 8, 1)
  c.r(GOLD, 4, 5, 8, 3)
  c.r(GREEN, 4, 8, 8, 5)
  c.r(BROWN, 4, 11, 8, 1)
  c.r(SKIN, 3, 9, 1, 2)
  c.r(SKIN, 12, 9, 1, 2)
  c.r('#4a6fd6', 5, 8, 6, 4)
  c.px32('#6f93f0', 12, 17, 8, 1)
  c.r(BROWN, 5, f ? 12 : 13, 2, f ? 3 : 2)
  c.r(BROWN, 9, f ? 13 : 12, 2, f ? 2 : 3)
}

function heroLeft(c, f) {
  c.r(GREEN, 4, 1, 8, 4)
  c.r(GREEN_D, 11, 3, 3, 3)
  c.px32(GREEN_L, 10, 3, 8, 1)
  c.r(GOLD, 8, 4, 4, 4)
  c.r(SKIN, 4, 5, 5, 4)
  c.px32(INK, 10, 12, 2, 4)
  c.r(GREEN, 5, 9, 7, 4)
  c.px32(GREEN_L, 11, 19, 10, 1)
  c.r(BROWN, 5, 11, 7, 1)
  c.r('#4a6fd6', 3, 9, 3, 4)
  c.r('#9bb4f0', 4, 10, 1, 2)
  c.r(BROWN, f ? 5 : 6, 13, 3, 2)
  c.r(BROWN, f ? 9 : 8, 13, 3, 2)
}

function buildHero() {
  const s = new Sheet('hero', 8)
  // Cells: down0 down1 up0 up1 left0 left1 right0 right1.
  const draws = [heroDown, heroDown, heroUp, heroUp, heroLeft, heroLeft]
  draws.forEach((d, i) => {
    const c = s.cell(i)
    d(c, i & 1)
    c.outline(INK)
  })
  s.cell(6).copyFrom(s.cell(4), true, false)
  s.cell(7).copyFrom(s.cell(5), true, false)
  s.save()
}

// --- Sword (cells: down up left right) -----------------------------------------------
function buildSword() {
  const s = new Sheet('sword', 4)
  const down = s.cell(0)
  down.r(BROWN, 7, 1, 2, 2)
  down.r('#d8b030', 5, 3, 6, 1)
  down.r('#e8f0ff', 7, 4, 2, 9)
  down.r('#9fb0d0', 8, 4, 1, 9)
  down.r('#e8f0ff', 7, 13, 1, 1)
  down.px32('#ffffff', 14, 10, 1, 14)
  down.outline(INK)
  s.cell(1).copyFrom(down, false, true)
  const left = s.cell(2)
  left.r(BROWN, 13, 7, 2, 2)
  left.r('#d8b030', 12, 5, 1, 6)
  left.r('#e8f0ff', 3, 7, 9, 2)
  left.r('#9fb0d0', 3, 8, 9, 1)
  left.r('#e8f0ff', 2, 7, 1, 1)
  left.px32('#ffffff', 8, 14, 14, 1)
  left.outline(INK)
  s.cell(3).copyFrom(left, true, false)
  s.save()
}

// --- Enemies ----------------------------------------------------------------------------
function buildSlime() {
  const s = new Sheet('slime', 2)
  for (let f = 0; f < 2; f++) {
    const c = s.cell(f)
    const y = f ? 9 : 7
    c.r('#4cc24c', 3, y + 1, 10, 14 - y - 1)
    c.r('#4cc24c', 5, y, 6, 1)
    c.r('#8be88b', 5, y + 1, 3, 1)
    c.px32('#b9f5b9', 12, y * 2 + 4, 2, 1)
    c.r('#2f8f2f', 3, 13, 10, 1)
    c.r('#ffffff', 5, y + 3, 2, 2)
    c.r('#ffffff', 9, y + 3, 2, 2)
    c.r(INK, 6, y + 4, 1, 1)
    c.r(INK, 10, y + 4, 1, 1)
    c.outline(INK)
  }
  s.save()
}

const BODY = '#8a4fd0'
const LIGHT = '#b58ae8'
const DARK = '#5a2f94'

/** Cells: 0 idle, 1 crouch, 2 arms up, 3 arms wide, 4 airborne. */
function buildJumper() {
  const s = new Sheet('jumper', 5)
  for (let f = 0; f < 5; f++) {
    const c = s.cell(f)
    if (f === 4) {
      c.r(BODY, 5, 3, 6, 9)
      c.r(LIGHT, 6, 4, 2, 2)
      c.r(DARK, 5, 11, 6, 2)
      c.r('#ffffff', 6, 6, 2, 2)
      c.r('#ffffff', 9, 6, 2, 2)
      c.r(INK, 7, 7, 1, 1)
      c.r(INK, 10, 7, 1, 1)
      c.outline(INK)
      continue
    }
    const top = f === 1 ? 10 : 8
    c.r(BODY, 3, top + 1, 10, 14 - top - 1)
    c.r(BODY, 5, top, 6, 1)
    c.r(LIGHT, 5, top + 1, 3, 1)
    c.px32('#d3b8f5', 12, top * 2 + 4, 2, 1)
    c.r(DARK, 3, 13, 10, 1)
    c.r('#ffffff', 5, top + 2, 2, 2)
    c.r('#ffffff', 9, top + 2, 2, 2)
    c.r(INK, 6, top + 3, 1, 1)
    c.r(INK, 10, top + 3, 1, 1)
    if (f === 2) {
      c.r(BODY, 1, top - 3, 2, 5)
      c.r(BODY, 13, top - 3, 2, 5)
    } else if (f === 3) {
      c.r(BODY, 1, top + 1, 2, 2)
      c.r(BODY, 13, top + 1, 2, 2)
    }
    c.outline(INK)
  }
  s.save()
}

// --- Emotes (cells: 0 and 1 are two beats of an exclamation mark) -------------------------
function buildEmotes() {
  const s = new Sheet('emotes', 2, EMOTE)
  ;['#ff3030', '#ffd030'].forEach((color, i) => {
    const c = s.cell(i)
    c.px32(color, 13, 5, 6, 14)
    c.px32(color, 14, 19, 4, 2)
    c.px32(color, 13, 23, 6, 5)
    c.px32('#ffffff', 14, 6, 1, 10)
    c.outline(INK)
  })
  s.save()
}

// --- Tiles (cells: grass flower sand tree rock house) and the scrolling water tile ---------
function buildTiles() {
  const s = new Sheet('tiles', 6, TILE)
  const grass = (c) => c.px('#58b858', 0, 0, TILE, TILE)

  let c = s.cell(0)
  grass(c)

  c = s.cell(1)
  grass(c)
  for (const [x, y, col] of [[3, 4, '#ffffff'], [11, 9, '#ffd84a'], [6, 12, '#ff8fb0'], [13, 2, '#ffffff']]) {
    c.r(col, x, y, 2, 2)
    c.r('#e8a020', x, y, 1, 1)
  }

  c = s.cell(2)
  c.px('#e8d29a', 0, 0, TILE, TILE)

  c = s.cell(3)
  c.px('#14572b', 0, 0, TILE, TILE)
  for (const [x, y] of [[8, 8], [22, 10], [16, 20], [6, 22], [25, 25]]) c.disc('#2f9e44', x * 4, y * 4, 32)

  c = s.cell(4)
  c.px('#8d8d9a', 0, 0, TILE, TILE)
  c.r('#b8b8c8', 0, 0, 16, 2)
  c.r('#5d5d6b', 0, 14, 16, 2)
  c.r('#5d5d6b', 7, 3, 1, 5)
  c.r('#5d5d6b', 4, 8, 6, 1)
  c.r('#5d5d6b', 11, 9, 1, 5)

  c = s.cell(5)
  c.px('#c0492f', 0, 0, TILE, TILE)
  for (let y = 0; y < 16; y += 4) {
    c.r('#8f3320', 0, y + 3, 16, 1)
    for (let x = (y / 4) % 2 ? 4 : 0; x < 16; x += 8) c.r('#8f3320', x, y, 1, 3)
    c.r('#e0674a', 0, y, 16, 1)
  }
  s.save()

  // Water repeats seamlessly; the renderer scrolls its UVs one texel at a time.
  const w = new Sheet('water', 1, TILE)
  const wc = w.cell(0)
  wc.px('#2c6fd0', 0, 0, TILE, TILE)
  wc.r('#5b95e6', 2, 3, 5, 1)
  wc.r('#5b95e6', 9, 8, 5, 1)
  wc.r('#1f55a8', 1, 12, 4, 1)
  wc.r('#1f55a8', 10, 14, 4, 1)
  w.save()
}

buildHero()
buildSword()
buildSlime()
buildJumper()
buildEmotes()
buildTiles()

import { Rng } from '../core/rng'
import type { SaveData } from '../game/save'
import { SLOTS } from '../game/save'
import { drawLogo, drawText, drawTextCentered } from './font'

export const W = 160
export const H = 144

const rng = new Rng(2024)
const STARS = Array.from({ length: 46 }, () => ({ x: rng.int(W), y: rng.int(84), p: rng.int(100) }))
const SKY = ['#080b24', '#0d1233', '#131a47', '#1b235a', '#262b6b', '#3a3478', '#59417f', '#7d4a82', '#a05a82', '#c8738a']
const ISLAND: [number, number][] = [
  [0, 100], [14, 97], [30, 93], [44, 90], [52, 85], [58, 78], [62, 68], [66, 58], [70, 48], [74, 40],
  [78, 35], [82, 35], [86, 40], [90, 50], [94, 60], [99, 72], [106, 82], [116, 88], [132, 91], [148, 95], [160, 98], [160, 104], [0, 104],
]

const ease = (t: number): number => 1 - Math.pow(1 - Math.min(Math.max(t, 0), 1), 3)

function drawHeart(ctx: CanvasRenderingContext2D, x: number, y: number, fill: 0 | 1 | 2): void {
  const rows = ['.XX.XX.', 'XXXXXXX', 'XXXXXXX', '.XXXXX.', '..XXX..', '...X...']
  rows.forEach((row, ry) => {
    for (let rx = 0; rx < 7; rx++) {
      if (row[rx] !== 'X') continue
      const lit = fill === 2 || (fill === 1 && rx < 4)
      ctx.fillStyle = lit ? (rx === 1 && ry === 1 ? '#ffd0d0' : '#e0243c') : '#4a1426'
      ctx.fillRect(x + rx, y + ry, 1, 1)
    }
  })
}

function drawHearts(ctx: CanvasRenderingContext2D, x: number, y: number, hp: number, maxHp: number): void {
  for (let i = 0; i < maxHp / 2; i++) {
    drawHeart(ctx, x + i * 8, y, hp >= (i + 1) * 2 ? 2 : hp === i * 2 + 1 ? 1 : 0)
  }
}

export function drawTitle(ctx: CanvasRenderingContext2D, t: number): void {
  // Night sky in dithered-free bands, down to the horizon at y=100.
  for (let i = 0; i < SKY.length; i++) {
    ctx.fillStyle = SKY[i]!
    ctx.fillRect(0, Math.floor((i * 100) / SKY.length), W, Math.ceil(100 / SKY.length) + 1)
  }
  for (const s of STARS) {
    const tw = (Math.sin((t + s.p * 7) * 0.05) + 1) / 2
    ctx.fillStyle = tw > 0.6 ? '#ffffff' : '#8a93c8'
    ctx.fillRect(s.x, s.y, 1, 1)
  }
  // Moon
  ctx.fillStyle = '#f6efc8'
  ctx.beginPath()
  ctx.arc(128, 38, 10, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#d8cf9c'
  ctx.fillRect(124, 35, 3, 2)
  ctx.fillRect(130, 41, 2, 2)
  // Drifting cloud bars
  ctx.fillStyle = '#1c2250'
  for (let i = 0; i < 3; i++) {
    const cx = ((t * (0.1 + i * 0.05) + i * 70) % (W + 60)) - 40
    ctx.fillRect(cx, 60 + i * 9, 36 + i * 8, 2)
  }
  // Island silhouette with village lights
  ctx.fillStyle = '#0a0e22'
  ctx.beginPath()
  ISLAND.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)))
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = '#2a3366'
  for (let y = 36; y < 96; y += 6) ctx.fillRect(80 - Math.floor((y - 36) / 7), y, 1, 1)
  if (Math.floor(t / 20) % 5 !== 0) {
    ctx.fillStyle = '#ffd866'
    ctx.fillRect(50, 90, 1, 1)
    ctx.fillRect(56, 87, 1, 1)
  }
  // Mist bands over the island
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = `rgba(190,200,230,${0.1 + 0.05 * Math.sin(t * 0.02 + i * 2)})`
    ctx.fillRect(0, 70 + i * 10, W, 4)
  }
  // Sea
  for (let y = 100; y < H; y++) {
    const k = (y - 100) / (H - 100)
    ctx.fillStyle = k < 0.35 ? '#1c3a7a' : k < 0.7 ? '#152e66' : '#0e2252'
    ctx.fillRect(0, y, W, 1)
    if (y % 4 === 0) {
      for (let x = 0; x < W; x += 8) {
        if (Math.sin((x + t * 0.4 + y * 3) * 0.45) > 0.55) {
          ctx.fillStyle = '#4a7ad0'
          ctx.fillRect(x, y, 4, 1)
        }
      }
    }
    if (y % 3 === 0 && y < 130) {
      ctx.fillStyle = '#e9dfa0'
      ctx.fillRect(122 + Math.floor(Math.sin(y + t * 0.1) * 3), y, 8 - Math.floor(k * 6), 1)
    }
  }

  // Logo drops in, then the prompt blinks.
  const ly = -20 + ease(t / 60) * 34
  drawLogo(ctx, 'ISLA NIEBLA', 80, ly, '#f2d060', '#3a1a08', 2)
  drawTextCentered(ctx, 'UNA AVENTURA ONIRICA', 80, ly + 18, '#cdd6ff')
  if (t > 70 && Math.floor(t / 30) % 2 === 0) drawTextCentered(ctx, 'PULSA START', 80, 118, '#ffffff')
  drawTextCentered(ctx, 'PROTOTIPO V0.1', 80, 135, '#6b78b8')
}

export interface FilesView {
  cursor: number
  deleting: boolean
  saves: (SaveData | null)[]
}

export function drawFiles(ctx: CanvasRenderingContext2D, t: number, v: FilesView): void {
  ctx.fillStyle = '#10204a'
  ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = '#18306a'
  for (let y = 0; y < H; y += 8) ctx.fillRect(0, y, W, 1)
  drawLogo(ctx, v.deleting ? 'BORRAR PARTIDA' : 'ELIGE PARTIDA', 80, 7, '#f2d060', '#3a1a08', 1)

  for (let i = 0; i < SLOTS; i++) {
    const y = 22 + i * 28
    const sel = v.cursor === i
    ctx.fillStyle = sel ? (v.deleting ? '#7a1c2c' : '#2c4c9c') : '#1a2c66'
    ctx.fillRect(16, y, 128, 24)
    ctx.fillStyle = sel ? '#f2d060' : '#4a62b0'
    ctx.fillRect(16, y, 128, 1)
    ctx.fillRect(16, y + 23, 128, 1)
    ctx.fillRect(16, y, 1, 24)
    ctx.fillRect(143, y, 1, 24)
    const s = v.saves[i]
    drawText(ctx, `${i + 1}`, 22, y + 4, '#ffffff')
    if (s) {
      drawText(ctx, 'HEROE', 34, y + 4, '#ffffff')
      drawHearts(ctx, 34, y + 14, s.hp, s.maxHp)
      drawText(ctx, `KO ${s.kills}`, 108, y + 15, '#cdd6ff')
    } else {
      drawText(ctx, 'VACIO', 34, y + 9, '#7f8fd0')
    }
    if (sel && Math.floor(t / 15) % 2 === 0) drawText(ctx, '>', 6, y + 9, '#f2d060')
  }
  const by = 106
  const sel = v.cursor === SLOTS
  ctx.fillStyle = sel ? '#2c4c9c' : '#1a2c66'
  ctx.fillRect(48, by, 64, 14)
  drawTextCentered(ctx, v.deleting ? 'CANCELAR' : 'BORRAR', 80, by + 4, sel ? '#f2d060' : '#cdd6ff')
  if (sel && Math.floor(t / 15) % 2 === 0) drawText(ctx, '>', 38, by + 4, '#f2d060')
  drawTextCentered(ctx, 'ENTER ACEPTAR  ESC VOLVER', 80, 130, '#7f8fd0')
}

export function drawHud(ctx: CanvasRenderingContext2D, hp: number, maxHp: number): void {
  ctx.fillStyle = 'rgba(8,10,30,0.7)'
  ctx.fillRect(0, 0, W, 13)
  drawHearts(ctx, 4, 3, hp, maxHp)
  drawText(ctx, 'Z:ESPADA', 102, 3, '#cdd6ff')
}

export function drawPause(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = 'rgba(8,10,30,0.7)'
  ctx.fillRect(0, 0, W, H)
  drawLogo(ctx, 'PAUSA', 80, 56, '#f2d060', '#3a1a08', 2)
  drawTextCentered(ctx, 'ENTER SEGUIR', 80, 80, '#ffffff')
  drawTextCentered(ctx, 'ESC GUARDAR Y SALIR', 80, 92, '#cdd6ff')
}

export function drawFade(ctx: CanvasRenderingContext2D, a: number): void {
  if (a <= 0) return
  ctx.fillStyle = `rgba(0,0,0,${Math.min(a, 1)})`
  ctx.fillRect(0, 0, W, H)
}

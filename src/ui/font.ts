/** 5x7 bitmap font. Each glyph is 7 base-32 digits, one per row, 5 bits per row. */
const GLYPHS: Record<string, string> = {
  A: 'ehhvhhh', B: 'uhhuhhu', C: 'ehggghe', D: 'uhhhhhu', E: 'vgguggv', F: 'vgguggg',
  G: 'ehgnhhf', H: 'hhhvhhh', I: 'e44444e', J: '72222ic', K: 'hikokih', L: 'ggggggv',
  M: 'hrllhhh', N: 'hpljhhh', O: 'ehhhhhe', P: 'uhhuggg', Q: 'ehhhlid', R: 'uhhukih',
  S: 'fgge11u', T: 'v444444', U: 'hhhhhhe', V: 'hhhhha4', W: 'hhhllrh', X: 'hha4ahh',
  Y: 'hha4444', Z: 'v1248gv',
  '0': 'ehjlphe', '1': '4c4444e', '2': 'eh1248v', '3': 'u11e11u', '4': '26aiv22',
  '5': 'vgu11he', '6': '68guhhe', '7': 'v124888', '8': 'ehhehhe', '9': 'ehhf12c',
  ' ': '0000000', '.': '00000cc', ',': '0000c48', '!': '4444404', '?': 'eh12404',
  '-': '000v000', ':': '0cc0cc0', '/': '11248gg', '>': '8421248', '<': '248g842', "'": '4480000',
  '(': '2488842', ')': '8422248',
}

const CHARS = Object.keys(GLYPHS)
const atlases = new Map<string, HTMLCanvasElement>()

function atlas(color: string): HTMLCanvasElement {
  let c = atlases.get(color)
  if (c) return c
  c = document.createElement('canvas')
  c.width = CHARS.length * 6
  c.height = 7
  const g = c.getContext('2d')!
  g.fillStyle = color
  CHARS.forEach((ch, i) => {
    const rows = GLYPHS[ch]!
    for (let y = 0; y < 7; y++) {
      const bits = parseInt(rows[y]!, 32)
      for (let x = 0; x < 5; x++) if (bits & (16 >> x)) g.fillRect(i * 6 + x, y, 1, 1)
    }
  })
  atlases.set(color, c)
  return c
}

function norm(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase()
}

export function textWidth(text: string, scale = 1): number {
  return text.length * 6 * scale - scale
}

export function drawText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, color: string, scale = 1): void {
  const a = atlas(color)
  ctx.imageSmoothingEnabled = false
  let cx = Math.round(x)
  for (const ch of norm(text)) {
    const i = CHARS.indexOf(ch)
    if (i >= 0 && ch !== ' ') ctx.drawImage(a, i * 6, 0, 5, 7, cx, Math.round(y), 5 * scale, 7 * scale)
    cx += 6 * scale
  }
}

export function drawTextCentered(ctx: CanvasRenderingContext2D, text: string, cx: number, y: number, color: string, scale = 1): void {
  drawText(ctx, text, cx - textWidth(text, scale) / 2, y, color, scale)
}

/** Text with a 1px*scale dark shadow/outline, for logos. */
export function drawLogo(ctx: CanvasRenderingContext2D, text: string, cx: number, y: number, color: string, shadow: string, scale: number): void {
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [1, 1]] as const) {
    drawTextCentered(ctx, text, cx + dx * scale * 0.5, y + dy * scale * 0.5, shadow, scale)
  }
  drawTextCentered(ctx, text, cx, y, color, scale)
}

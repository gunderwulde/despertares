import { runLoop } from './core/loop'
import { Game } from './game/game'
import { Input } from './input/input'
import { loadArt } from './render/art'
import { VIEW_H, VIEW_W } from './render/view'

/** Finds the canvas in index.html, or creates it if the page arrived without it. */
function canvasById(id: string): HTMLCanvasElement {
  let c = document.getElementById(id) as HTMLCanvasElement | null
  if (!c) {
    c = document.createElement('canvas')
    c.id = id
    c.width = VIEW_W
    c.height = VIEW_H
    document.body.appendChild(c)
  }
  Object.assign(c.style, {
    position: 'absolute',
    left: '50%',
    top: '50%',
    transform: 'translate(-50%, -50%)',
    imageRendering: 'pixelated',
  })
  return c
}

const gl = canvasById('gl')
const ui = canvasById('ui')
const ctx = ui.getContext('2d')!

/** Integer scale only, so pixels stay square and crisp. */
function resize(): void {
  const k = Math.max(1, Math.floor(Math.min(window.innerWidth / VIEW_W, window.innerHeight / VIEW_H)))
  for (const c of [gl, ui]) {
    c.style.width = `${VIEW_W * k}px`
    c.style.height = `${VIEW_H * k}px`
  }
}
window.addEventListener('resize', resize)
resize()

const input = new Input()

// Spritesheets must be decoded before the first frame.
void loadArt().then((art) => {
  const game = new Game(input, gl, ctx, art)
  runLoop(
    () => game.update(),
    (alpha) => game.render(alpha),
  )
})

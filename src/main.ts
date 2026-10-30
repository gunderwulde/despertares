import { runLoop } from './core/loop'
import { Game } from './game/game'
import { Input } from './input/input'

/** Finds the canvas in index.html, or creates it if the page arrived without it. */
function canvasById(id: string): HTMLCanvasElement {
  let c = document.getElementById(id) as HTMLCanvasElement | null
  if (!c) {
    c = document.createElement('canvas')
    c.id = id
    c.width = 160
    c.height = 144
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
  const k = Math.max(1, Math.floor(Math.min(window.innerWidth / 160, window.innerHeight / 144)))
  for (const c of [gl, ui]) {
    c.style.width = `${160 * k}px`
    c.style.height = `${144 * k}px`
  }
}
window.addEventListener('resize', resize)
resize()

const input = new Input()
const game = new Game(input, gl, ctx)

runLoop(
  () => game.update(),
  (alpha) => game.render(alpha),
)

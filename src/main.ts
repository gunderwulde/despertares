import { runLoop } from './core/loop'
import { Game } from './game/game'
import { Input } from './input/input'

const gl = document.getElementById('gl') as HTMLCanvasElement
const ui = document.getElementById('ui') as HTMLCanvasElement
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

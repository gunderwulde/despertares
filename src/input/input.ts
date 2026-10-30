import { Btn } from '../sim/world'

const KEYS: Record<string, number> = {
  ArrowUp: Btn.Up, KeyW: Btn.Up,
  ArrowDown: Btn.Down, KeyS: Btn.Down,
  ArrowLeft: Btn.Left, KeyA: Btn.Left,
  ArrowRight: Btn.Right, KeyD: Btn.Right,
  KeyZ: Btn.A, KeyJ: Btn.A, Space: Btn.A,
  KeyX: Btn.B, KeyK: Btn.B,
  Enter: Btn.Start,
  Escape: Btn.Back,
}

/** Keyboard + first gamepad. `held` is level state, `consumeEdges()` returns buttons pressed since the last call. */
export class Input {
  held = 0
  private kbHeld = 0
  private edges = 0
  private padPrev = 0

  constructor() {
    window.addEventListener('keydown', (e) => {
      const b = KEYS[e.code]
      if (b === undefined) return
      e.preventDefault()
      if (!(this.kbHeld & b)) this.edges |= b
      this.kbHeld |= b
    })
    window.addEventListener('keyup', (e) => {
      const b = KEYS[e.code]
      if (b === undefined) return
      this.kbHeld &= ~b
    })
    window.addEventListener('blur', () => {
      this.kbHeld = 0
    })
  }

  /** Call once per render frame, before the simulation steps. */
  poll(): void {
    let pad = 0
    const p = navigator.getGamepads?.()[0]
    if (p) {
      const ax = p.axes[0] ?? 0
      const ay = p.axes[1] ?? 0
      if (ay < -0.5 || p.buttons[12]?.pressed) pad |= Btn.Up
      if (ay > 0.5 || p.buttons[13]?.pressed) pad |= Btn.Down
      if (ax < -0.5 || p.buttons[14]?.pressed) pad |= Btn.Left
      if (ax > 0.5 || p.buttons[15]?.pressed) pad |= Btn.Right
      if (p.buttons[0]?.pressed) pad |= Btn.A
      if (p.buttons[1]?.pressed) pad |= Btn.B
      if (p.buttons[9]?.pressed) pad |= Btn.Start
      if (p.buttons[8]?.pressed) pad |= Btn.Back
    }
    this.edges |= pad & ~this.padPrev
    this.padPrev = pad
    this.held = this.kbHeld | pad
  }

  consumeEdges(): number {
    const e = this.edges
    this.edges = 0
    return e
  }
}

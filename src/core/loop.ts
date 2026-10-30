export const STEP_MS = 1000 / 60

/** Fixed 60 Hz simulation step, variable-rate render with interpolation alpha. */
export function runLoop(update: () => void, render: (alpha: number, dtMs: number) => void): void {
  let last = performance.now()
  let acc = 0
  const frame = (now: number): void => {
    const dt = Math.min(now - last, 100)
    last = now
    acc += dt
    while (acc >= STEP_MS) {
      update()
      acc -= STEP_MS
    }
    render(acc / STEP_MS, dt)
    requestAnimationFrame(frame)
  }
  requestAnimationFrame(frame)
}

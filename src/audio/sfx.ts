let ctx: AudioContext | null = null

function tone(freq: number, dur: number, type: OscillatorType, vol: number, slideTo?: number): void {
  try {
    ctx ??= new AudioContext()
    if (ctx.state === 'suspended') void ctx.resume()
    const t = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(freq, t)
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur)
    gain.gain.setValueAtTime(vol, t)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    osc.connect(gain).connect(ctx.destination)
    osc.start(t)
    osc.stop(t + dur)
  } catch {
    /* audio is optional */
  }
}

export const sfx = {
  nav: () => tone(660, 0.05, 'square', 0.06),
  select: () => {
    tone(523, 0.08, 'square', 0.07)
    setTimeout(() => tone(784, 0.12, 'square', 0.07), 70)
  },
  sword: () => tone(900, 0.12, 'sawtooth', 0.05, 200),
  hit: () => tone(300, 0.1, 'square', 0.08, 120),
  hurt: () => tone(220, 0.25, 'sawtooth', 0.09, 70),
  kill: () => tone(400, 0.2, 'square', 0.08, 80),
}

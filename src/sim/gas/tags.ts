/** Gameplay tags as bit flags so tag queries are a single AND. */
export const Tag = {
  Dead: 1,
  Invulnerable: 2,
  Stunned: 4,
  Attacking: 8,
  Warning: 16,
  Airborne: 32,
  Resting: 64,
} as const

const TAG_BITS = 16

/** Resolves tag names from data files to a mask; `where` names the offending file/field. */
export function tagMask(names: readonly string[], where: string): number {
  let m = 0
  for (const n of names) {
    const bit = (Tag as Record<string, number | undefined>)[n]
    if (bit === undefined) throw new Error(`${where}: unknown tag "${n}"`)
    m |= bit
  }
  return m
}

/** Ref-counted tag container: overlapping sources (abilities, effects) can grant the same tag. */
export class TagSet {
  mask = 0
  private readonly counts = new Uint8Array(TAG_BITS)

  add(m: number): void {
    for (let b = 0; b < TAG_BITS; b++) {
      if (!(m & (1 << b))) continue
      this.counts[b]!++
      this.mask |= 1 << b
    }
  }

  remove(m: number): void {
    for (let b = 0; b < TAG_BITS; b++) {
      if (!(m & (1 << b)) || this.counts[b]! === 0) continue
      if (--this.counts[b]! === 0) this.mask &= ~(1 << b)
    }
  }

  has(m: number): boolean {
    return (this.mask & m) === m
  }

  hasAny(m: number): boolean {
    return (this.mask & m) !== 0
  }

  clear(): void {
    this.counts.fill(0)
    this.mask = 0
  }
}

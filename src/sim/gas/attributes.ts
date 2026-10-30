export const Attr = { Health: 0, MaxHealth: 1 } as const

/** Attribute names as written in data files. */
export const ATTRIBUTE_BY_NAME: Readonly<Record<string, number | undefined>> = { health: Attr.Health, maxHealth: Attr.MaxHealth }

export class AttributeSet {
  private readonly v = new Float32Array(2)

  get(a: number): number {
    return this.v[a]!
  }

  set(a: number, x: number): void {
    this.v[a] = a === Attr.Health ? Math.min(Math.max(x, 0), this.v[Attr.MaxHealth]!) : x
  }

  add(a: number, d: number): void {
    this.set(a, this.v[a]! + d)
  }

  get health(): number {
    return this.v[Attr.Health]!
  }

  get maxHealth(): number {
    return this.v[Attr.MaxHealth]!
  }
}

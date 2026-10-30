/**
 * Gameplay effect asset (pure data). `delta` is applied once to `attribute` on application;
 * `grantedTags` last for `duration` frames (0 = no timed part). `linked` effects are applied
 * together with this one, but only if this one was not blocked.
 */
export interface GameplayEffect {
  readonly id: number
  readonly attribute: number
  readonly delta: number
  readonly duration: number
  readonly grantedTags: number
  readonly blockedByTags: number
  /** Tiles per frame pushed away from the source; the stun effect decides for how long. */
  readonly knockback: number
  readonly linked: readonly GameplayEffect[]
}

let nextId = 1

export function defineEffect(def: Partial<Omit<GameplayEffect, 'id'>>): GameplayEffect {
  return {
    id: nextId++,
    attribute: -1,
    delta: 0,
    duration: 0,
    grantedTags: 0,
    blockedByTags: 0,
    knockback: 0,
    linked: [],
    ...def,
  }
}

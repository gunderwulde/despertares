import { Rng } from '../core/rng'
import { ENEMY_DEFS, ENEMY_ROSTER } from '../data/enemies'
import type { Actor } from './actors/actor'
import { Enemy } from './actors/enemy'
import { Player } from './actors/player'
import { TileMap, overlap } from './collision'
import { Ev } from './constants'
import type { SimContext } from './context'
import { Attr } from './gas/attributes'
import type { GameplayEffect } from './gas/effect'
import { VfxSystem } from './vfx/vfx'
import { MAP_H, MAP_W, ROOM_H, ROOM_W, SPAWN_X, SPAWN_Y, T, buildMap } from './map'

export { Btn, Dir, Ev } from './constants'
export const MAX_ENEMIES = ENEMY_ROSTER.length

/** Pure, deterministic simulation. Units are tiles; (x, y) is the entity's feet position. */
export class World implements SimContext {
  readonly map = new TileMap(buildMap())
  readonly rng: Rng
  readonly player = new Player()
  readonly enemies: Enemy[] = []
  readonly vfx = new VfxSystem()
  kills = 0
  tick = 0
  evt = 0

  constructor(seed: number) {
    this.rng = new Rng(seed)
    for (let i = 0; i < ENEMY_ROSTER.length; i++) this.enemies.push(new Enemy(i, ENEMY_DEFS[ENEMY_ROSTER[i]!]!))
    this.spawnEnemies()
  }

  get tiles(): Uint8Array {
    return this.map.tiles
  }

  get hp(): number {
    return this.player.hp
  }

  get maxHp(): number {
    return this.player.maxHp
  }

  get dead(): boolean {
    return !this.player.alive
  }

  get roomX(): number {
    return Math.min(Math.max(Math.floor(this.player.x / ROOM_W), 0), MAP_W / ROOM_W - 1)
  }

  get roomY(): number {
    return Math.min(Math.max(Math.floor((this.player.y - 0.2) / ROOM_H), 0), MAP_H / ROOM_H - 1)
  }

  restore(x: number, y: number, hp: number, maxHp: number, kills: number): void {
    this.player.setPosition(x, y)
    this.player.asc.attrs.set(Attr.MaxHealth, maxHp)
    this.player.asc.attrs.set(Attr.Health, hp)
    this.kills = kills
    if (hp <= 0) this.respawn()
  }

  respawn(): void {
    this.player.respawn(this)
  }

  step(held: number, pressed: number): void {
    this.tick++
    this.player.setInput(held, pressed)
    this.player.step(this)
    for (let i = 0; i < this.enemies.length; i++) this.enemies[i]!.step(this)
    this.resolveContacts()
    this.vfx.step()
  }

  damageEnemiesInBox(l: number, t: number, r: number, b: number, source: Actor, fx: GameplayEffect): void {
    for (let i = 0; i < this.enemies.length; i++) {
      const e = this.enemies[i]!
      if (!e.alive) continue
      if (!overlap(l, t, r, b, e.x - e.hw, e.y - e.h, e.x + e.hw, e.y)) continue
      if (!e.asc.applyEffect(fx, source, this)) continue
      if (e.alive) {
        this.evt |= Ev.Hit
      } else {
        this.kills++
        this.evt |= Ev.Kill
      }
    }
  }

  private spawnEnemies(): void {
    for (let i = 0; i < this.enemies.length; i++) {
      for (let tries = 0; tries < 300; tries++) {
        const x = 1 + this.rng.int(MAP_W - 2)
        const y = 1 + this.rng.int(13)
        if (this.tiles[y * MAP_W + x]! > T.Flower) continue
        if (Math.hypot(x - SPAWN_X, y - SPAWN_Y) < 6) continue
        this.enemies[i]!.spawn(x + 0.5, y + 0.8, this)
        break
      }
    }
  }

  private resolveContacts(): void {
    const p = this.player
    if (!p.alive) return
    for (let i = 0; i < this.enemies.length; i++) {
      const e = this.enemies[i]!
      if (!e.alive) continue
      if (!overlap(p.x - p.hw, p.y - p.h, p.x + p.hw, p.y, e.x - e.hw, e.y - e.h, e.x + e.hw, e.y)) continue
      if (!p.asc.applyEffect(e.contactEffect, e, this)) continue
      this.evt |= Ev.Hurt
      return
    }
  }
}

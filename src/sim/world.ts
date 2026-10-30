import { Rng } from '../core/rng'
import { MAP_H, MAP_W, ROOM_H, ROOM_W, SPAWN_X, SPAWN_Y, T, buildMap, isSolid } from './map'

export const Dir = { Down: 0, Up: 1, Left: 2, Right: 3 } as const
export const Btn = { Up: 1, Down: 2, Left: 4, Right: 8, A: 16, B: 32, Start: 64, Back: 128 } as const
export const Ev = { Sword: 1, Hit: 2, Hurt: 4, Kill: 8 } as const
export const MAX_ENEMIES = 6

const PLAYER_SPEED = 0.055
const PLAYER_HW = 0.26
const PLAYER_H = 0.3
const ENEMY_SPEED = 0.028
const ENEMY_HW = 0.3
const ENEMY_H = 0.5
const ATTACK_FRAMES = 18
const DX = [0, 0, -1, 1]
const DY = [1, -1, 0, 0]

function overlap(al: number, at: number, ar: number, ab: number, bl: number, bt: number, br: number, bb: number): boolean {
  return al < br && ar > bl && at < bb && ab > bt
}

/** Pure, deterministic simulation. Units are tiles; (x, y) is the entity's feet position. */
export class World {
  readonly tiles = buildMap()
  private readonly rng: Rng

  px = SPAWN_X
  py = SPAWN_Y
  ppx = SPAWN_X
  ppy = SPAWN_Y
  dir: number = Dir.Down
  hp = 6
  maxHp = 6
  invul = 0
  attackT = 0
  walkPhase = 0
  moving = false
  dead = false
  kills = 0
  tick = 0
  evt = 0
  private kbx = 0
  private kby = 0
  private kbT = 0

  readonly ex = new Float32Array(MAX_ENEMIES)
  readonly ey = new Float32Array(MAX_ENEMIES)
  readonly epx = new Float32Array(MAX_ENEMIES)
  readonly epy = new Float32Array(MAX_ENEMIES)
  private readonly evx = new Float32Array(MAX_ENEMIES)
  private readonly evy = new Float32Array(MAX_ENEMIES)
  private readonly ekx = new Float32Array(MAX_ENEMIES)
  private readonly eky = new Float32Array(MAX_ENEMIES)
  readonly ehp = new Int8Array(MAX_ENEMIES)
  readonly ehurt = new Int16Array(MAX_ENEMIES)
  private readonly ekT = new Int16Array(MAX_ENEMIES)
  private readonly etimer = new Int16Array(MAX_ENEMIES)
  readonly ealive = new Uint8Array(MAX_ENEMIES)

  constructor(seed: number) {
    this.rng = new Rng(seed)
    this.spawnEnemies()
  }

  get roomX(): number {
    return Math.min(Math.max(Math.floor(this.px / ROOM_W), 0), MAP_W / ROOM_W - 1)
  }

  get roomY(): number {
    return Math.min(Math.max(Math.floor((this.py - 0.2) / ROOM_H), 0), MAP_H / ROOM_H - 1)
  }

  respawn(): void {
    this.px = this.ppx = SPAWN_X
    this.py = this.ppy = SPAWN_Y
    this.hp = this.maxHp
    this.dead = false
    this.invul = 60
    this.attackT = 0
    this.kbT = 0
  }

  step(held: number, pressed: number): void {
    this.tick++
    this.ppx = this.px
    this.ppy = this.py
    for (let i = 0; i < MAX_ENEMIES; i++) {
      this.epx[i] = this.ex[i]!
      this.epy[i] = this.ey[i]!
    }
    if (this.invul > 0) this.invul--
    this.stepPlayer(held, pressed)
    this.stepEnemies()
    this.resolveContacts()
  }

  private spawnEnemies(): void {
    for (let i = 0; i < MAX_ENEMIES; i++) {
      for (let tries = 0; tries < 300; tries++) {
        const x = 1 + this.rng.int(MAP_W - 2)
        const y = 1 + this.rng.int(13)
        if (this.tiles[y * MAP_W + x]! > T.Flower) continue
        if (Math.hypot(x - SPAWN_X, y - SPAWN_Y) < 6) continue
        this.ex[i] = this.epx[i] = x + 0.5
        this.ey[i] = this.epy[i] = y + 0.8
        this.ehp[i] = 2
        this.ealive[i] = 1
        this.etimer[i] = 1 + this.rng.int(40)
        break
      }
    }
  }

  private blocked(l: number, t: number, r: number, b: number): boolean {
    const x0 = Math.floor(l)
    const x1 = Math.floor(r - 1e-6)
    const y0 = Math.floor(t)
    const y1 = Math.floor(b - 1e-6)
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        if (x < 0 || y < 0 || x >= MAP_W || y >= MAP_H || isSolid(this.tiles[y * MAP_W + x]!)) return true
      }
    }
    return false
  }

  private moveX(x: number, y: number, dx: number, hw: number, h: number): number {
    if (dx === 0) return x
    const nx = x + dx
    if (!this.blocked(nx - hw, y - h, nx + hw, y)) return nx
    return dx > 0 ? Math.floor(nx + hw) - hw - 1e-4 : Math.floor(nx - hw) + 1 + hw + 1e-4
  }

  private moveY(x: number, y: number, dy: number, hw: number, h: number): number {
    if (dy === 0) return y
    const ny = y + dy
    if (!this.blocked(x - hw, ny - h, x + hw, ny)) return ny
    return dy > 0 ? Math.floor(ny - 1e-6) - 1e-4 : Math.floor(ny - h) + 1 + h + 1e-4
  }

  private stepPlayer(held: number, pressed: number): void {
    this.moving = false
    if (this.kbT > 0) {
      this.kbT--
      this.px = this.moveX(this.px, this.py, this.kbx, PLAYER_HW, PLAYER_H)
      this.py = this.moveY(this.px, this.py, this.kby, PLAYER_HW, PLAYER_H)
      return
    }
    if (this.attackT > 0) {
      this.attackT--
      if (this.attackT <= 13 && this.attackT >= 5) this.swordHit()
      return
    }
    if (pressed & Btn.A) {
      this.attackT = ATTACK_FRAMES
      this.evt |= Ev.Sword
      return
    }
    let mx = 0
    let my = 0
    if (held & Btn.Left) mx = -1
    else if (held & Btn.Right) mx = 1
    if (held & Btn.Up) my = -1
    else if (held & Btn.Down) my = 1
    if (mx !== 0 && my !== 0) {
      if (this.dir === Dir.Left || this.dir === Dir.Right) my = 0
      else mx = 0
    }
    if (mx === 0 && my === 0) return
    this.dir = mx < 0 ? Dir.Left : mx > 0 ? Dir.Right : my < 0 ? Dir.Up : Dir.Down
    this.px = this.moveX(this.px, this.py, mx * PLAYER_SPEED, PLAYER_HW, PLAYER_H)
    this.py = this.moveY(this.px, this.py, my * PLAYER_SPEED, PLAYER_HW, PLAYER_H)
    this.walkPhase++
    this.moving = true
  }

  private swordHit(): void {
    const { px, py } = this
    let l = 0
    let t = 0
    let r = 0
    let b = 0
    switch (this.dir) {
      case Dir.Down: l = px - 0.5; r = px + 0.5; t = py; b = py + 0.95; break
      case Dir.Up: l = px - 0.5; r = px + 0.5; t = py - 1.3; b = py - 0.2; break
      case Dir.Left: l = px - 1.0; r = px - 0.1; t = py - 0.7; b = py + 0.1; break
      default: l = px + 0.1; r = px + 1.0; t = py - 0.7; b = py + 0.1
    }
    for (let i = 0; i < MAX_ENEMIES; i++) {
      if (!this.ealive[i] || this.ehurt[i]! > 0) continue
      const x = this.ex[i]!
      const y = this.ey[i]!
      if (!overlap(l, t, r, b, x - ENEMY_HW, y - ENEMY_H, x + ENEMY_HW, y)) continue
      this.ehp[i]!--
      this.ehurt[i] = 18
      const dx = x - px
      const dy = y - py
      const len = Math.hypot(dx, dy) || 1
      this.ekx[i] = (dx / len) * 0.14
      this.eky[i] = (dy / len) * 0.14
      this.ekT[i] = 6
      if (this.ehp[i]! <= 0) {
        this.ealive[i] = 0
        this.kills++
        this.evt |= Ev.Kill
      } else {
        this.evt |= Ev.Hit
      }
    }
  }

  private stepEnemies(): void {
    for (let i = 0; i < MAX_ENEMIES; i++) {
      if (!this.ealive[i]) continue
      if (this.ehurt[i]! > 0) this.ehurt[i]!--
      if (this.ekT[i]! > 0) {
        this.ekT[i]!--
        this.ex[i] = this.moveX(this.ex[i]!, this.ey[i]!, this.ekx[i]!, ENEMY_HW, ENEMY_H)
        this.ey[i] = this.moveY(this.ex[i]!, this.ey[i]!, this.eky[i]!, ENEMY_HW, ENEMY_H)
        continue
      }
      if (--this.etimer[i]! <= 0) this.chooseMove(i)
      if ((this.tick + i * 13) % 48 < 24) {
        this.ex[i] = this.moveX(this.ex[i]!, this.ey[i]!, this.evx[i]!, ENEMY_HW, ENEMY_H)
        this.ey[i] = this.moveY(this.ex[i]!, this.ey[i]!, this.evy[i]!, ENEMY_HW, ENEMY_H)
      }
    }
  }

  private chooseMove(i: number): void {
    const r = this.rng.int(5)
    this.evx[i] = r < 4 ? DX[r]! * ENEMY_SPEED : 0
    this.evy[i] = r < 4 ? DY[r]! * ENEMY_SPEED : 0
    const dx = this.px - this.ex[i]!
    const dy = this.py - this.ey[i]!
    if (Math.hypot(dx, dy) < 4 && this.rng.next() < 0.55) {
      if (Math.abs(dx) > Math.abs(dy)) {
        this.evx[i] = Math.sign(dx) * ENEMY_SPEED
        this.evy[i] = 0
      } else {
        this.evx[i] = 0
        this.evy[i] = Math.sign(dy) * ENEMY_SPEED
      }
    }
    this.etimer[i] = 30 + this.rng.int(50)
  }

  private resolveContacts(): void {
    if (this.invul > 0 || this.dead) return
    for (let i = 0; i < MAX_ENEMIES; i++) {
      if (!this.ealive[i]) continue
      const x = this.ex[i]!
      const y = this.ey[i]!
      if (!overlap(this.px - PLAYER_HW, this.py - PLAYER_H, this.px + PLAYER_HW, this.py, x - ENEMY_HW, y - ENEMY_H, x + ENEMY_HW, y)) continue
      this.hp--
      this.invul = 70
      this.attackT = 0
      const dx = this.px - x
      const dy = this.py - y
      const len = Math.hypot(dx, dy) || 1
      this.kbx = (dx / len) * 0.1
      this.kby = (dy / len) * 0.1
      this.kbT = 8
      this.evt |= Ev.Hurt
      if (this.hp <= 0) this.dead = true
      return
    }
  }
}

import { sfx } from '../audio/sfx'
import type { Input } from '../input/input'
import { SceneRenderer } from '../render/scene'
import { Btn, Ev, World } from '../sim/world'
import { H, W, drawFade, drawFiles, drawHud, drawPause, drawTitle } from '../ui/screens'
import { SLOTS, eraseSlot, loadSlot, saveSlot, type SaveData } from './save'

type Screen = 'title' | 'files' | 'play'

export class Game {
  private screen: Screen = 'title'
  private t = 0
  private cursor = 0
  private deleting = false
  private saves: (SaveData | null)[] = []
  private world: World | null = null
  private scene: SceneRenderer | null = null
  private slot = 0
  private paused = false
  private fade = 1
  private fadeDir = -1
  private pending: (() => void) | null = null
  private lastRoom = -1

  constructor(
    private readonly input: Input,
    private readonly glCanvas: HTMLCanvasElement,
    private readonly ui: CanvasRenderingContext2D,
  ) {
    this.refreshSaves()
    this.glCanvas.style.visibility = 'hidden'
  }

  private refreshSaves(): void {
    this.saves = Array.from({ length: SLOTS }, (_, i) => loadSlot(i))
  }

  private go(fn: () => void): void {
    if (this.pending) return
    this.pending = fn
    this.fadeDir = 1
  }

  /** One fixed 60 Hz simulation step. */
  update(): void {
    this.input.poll()
    const pressed = this.input.consumeEdges()
    this.t++

    if (this.fadeDir > 0) {
      this.fade += 0.08
      if (this.fade >= 1) {
        this.fade = 1
        this.pending?.()
        this.pending = null
        this.fadeDir = -1
      }
      return
    }
    if (this.fadeDir < 0) {
      this.fade -= 0.08
      if (this.fade <= 0) {
        this.fade = 0
        this.fadeDir = 0
      }
    }

    const confirm = (pressed & (Btn.Start | Btn.A)) !== 0
    switch (this.screen) {
      case 'title':
        if (confirm) {
          sfx.select()
          this.go(() => this.enter('files'))
        }
        break
      case 'files':
        this.updateFiles(pressed, confirm)
        break
      case 'play':
        this.updatePlay(pressed)
        break
    }
  }

  private enter(screen: Screen): void {
    this.screen = screen
    this.t = 0
    this.glCanvas.style.visibility = screen === 'play' ? 'visible' : 'hidden'
    if (screen === 'files') {
      this.refreshSaves()
      this.deleting = false
    }
  }

  private updateFiles(pressed: number, confirm: boolean): void {
    if (pressed & Btn.Down) {
      this.cursor = (this.cursor + 1) % (SLOTS + 1)
      sfx.nav()
    }
    if (pressed & Btn.Up) {
      this.cursor = (this.cursor + SLOTS) % (SLOTS + 1)
      sfx.nav()
    }
    if (pressed & Btn.Back) {
      if (this.deleting) this.deleting = false
      else this.go(() => this.enter('title'))
      sfx.nav()
      return
    }
    if (!confirm) return
    sfx.select()
    if (this.cursor === SLOTS) {
      this.deleting = !this.deleting
    } else if (this.deleting) {
      eraseSlot(this.cursor)
      this.refreshSaves()
      this.deleting = false
    } else {
      this.slot = this.cursor
      this.go(() => this.startGame())
    }
  }

  private startGame(): void {
    const save = this.saves[this.slot] ?? null
    const world = new World(1000 + this.slot)
    if (save) {
      world.px = world.ppx = save.x
      world.py = world.ppy = save.y
      world.hp = save.hp
      world.maxHp = save.maxHp
      world.kills = save.kills
      if (world.hp <= 0) world.respawn()
    }
    this.world = world
    // The map is static, so one renderer serves every game session.
    this.scene ??= new SceneRenderer(this.glCanvas, world)
    this.scene.snapCamera()
    this.paused = false
    this.lastRoom = -1
    this.enter('play')
  }

  private save(): void {
    const w = this.world
    if (!w) return
    saveSlot(this.slot, { hp: w.hp, maxHp: w.maxHp, x: w.px, y: w.py, kills: w.kills })
  }

  private updatePlay(pressed: number): void {
    const w = this.world!
    if (pressed & Btn.Back) {
      this.save()
      sfx.nav()
      this.go(() => this.enter('files'))
      return
    }
    if (pressed & Btn.Start) {
      this.paused = !this.paused
      sfx.nav()
    }
    if (this.paused) return

    w.step(this.input.held, pressed)

    if (w.evt & Ev.Sword) sfx.sword()
    if (w.evt & Ev.Hit) sfx.hit()
    if (w.evt & Ev.Kill) sfx.kill()
    if (w.evt & Ev.Hurt) sfx.hurt()
    w.evt = 0

    const room = w.roomY * 10 + w.roomX
    if (room !== this.lastRoom) {
      this.lastRoom = room
      this.save()
    }
    if (w.dead) {
      this.go(() => {
        w.respawn()
        this.scene?.snapCamera()
      })
    }
  }

  render(alpha: number, dtMs: number): void {
    const ui = this.ui
    ui.clearRect(0, 0, W, H)
    switch (this.screen) {
      case 'title':
        drawTitle(ui, this.t)
        break
      case 'files':
        drawFiles(ui, this.t, { cursor: this.cursor, deleting: this.deleting, saves: this.saves })
        break
      case 'play': {
        const w = this.world!
        this.scene!.update(w, this.paused ? 1 : alpha, dtMs, performance.now())
        this.scene!.render()
        drawHud(ui, w.hp, w.maxHp)
        if (this.paused) drawPause(ui)
        break
      }
    }
    drawFade(ui, this.fade)
  }
}

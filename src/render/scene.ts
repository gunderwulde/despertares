import * as THREE from 'three'
import { Dir, World } from '../sim/world'
import { MAP_H, MAP_W, T } from '../sim/map'
import { ActorSprite } from './actor-sprite'
import { type Art, TILE } from './art'
import { HOLE_RADIUS, makeHoleUniforms } from './seethrough'
import { buildTileMeshes } from './tilemap'
import { COS, PERSP_DIST, PERSP_FOV, SIN, SPRITE_H, VIEW_H, VIEW_HALF_W, VIEW_UNITS, VIEW_W, spriteGeometry } from './view'

export { VIEW_H, VIEW_W } from './view'


export class SceneRenderer {
  private readonly renderer: THREE.WebGLRenderer
  private readonly scene = new THREE.Scene()
  private readonly ortho = new THREE.OrthographicCamera(-VIEW_HALF_W, VIEW_HALF_W, VIEW_UNITS / 2, -VIEW_UNITS / 2, 0.1, 100)
  private readonly persp = new THREE.PerspectiveCamera(PERSP_FOV, VIEW_W / VIEW_H, 0.1, 100)
  /** Experiment: perspective is the default, press P to compare with the orthographic view. */
  private usePersp = true
  private readonly hero: ActorSprite
  private readonly sword: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>
  private readonly enemies: ActorSprite[] = []
  private readonly vfx: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>[] = []
  private readonly holes = makeHoleUniforms()
  private readonly tmp = new THREE.Vector3()
  private readonly tmp2 = new THREE.Vector3()

  constructor(
    canvas: HTMLCanvasElement,
    world: World,
    private readonly art: Art,
  ) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false })
    this.renderer.setPixelRatio(1)
    this.renderer.setSize(VIEW_W, VIEW_H, false)
    this.renderer.setClearColor(0x16264a)

    this.scene.add(new THREE.AmbientLight(0xffffff, 2.1))
    const sun = new THREE.DirectionalLight(0xfff2d8, 1.5)
    sun.position.set(-3, 6, 4)
    this.scene.add(sun)

    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyP') this.usePersp = !this.usePersp
    })

    buildTileMeshes(this.scene, world.tiles, art.tiles, this.holes)

    const geo = spriteGeometry()
    const shadowGeo = new THREE.CircleGeometry(0.32, 14).rotateX(-Math.PI / 2).scale(1, 1, 0.6)
    const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35, depthWrite: false })

    this.hero = new ActorSprite(this.scene, geo, shadowGeo, shadowMat, art.hero[0]!)
    this.sword = new THREE.Mesh(
      new THREE.PlaneGeometry(1, SPRITE_H),
      new THREE.MeshBasicMaterial({ map: art.sword[0]!, transparent: true, depthTest: false }),
    )
    this.sword.renderOrder = 10
    this.sword.visible = false
    this.scene.add(this.sword)

    for (const e of world.enemies) {
      this.enemies.push(new ActorSprite(this.scene, geo, shadowGeo, shadowMat, art.enemies[e.def.sprite]![0]!))
    }

    // One quad per pooled effect; sized and textured each frame from the effect's config.
    const quad = new THREE.PlaneGeometry(1, 1)
    for (let i = 0; i < world.vfx.pool.length; i++) {
      const m = new THREE.Mesh(quad, new THREE.MeshBasicMaterial({ transparent: true }))
      m.visible = false
      this.scene.add(m)
      this.vfx.push(m)
    }
  }

  update(world: World, alpha: number, timeMs: number): void {
    const lerp = (a: number, b: number): number => a + (b - a) * alpha

    // Water scroll in 1/16 steps keeps it pixel-aligned.
    this.art.tiles[T.Water]!.offset.x = Math.floor(timeMs / (4000 / TILE)) / TILE

    const player = world.player
    const px = lerp(player.px, player.x)
    const py = lerp(player.py, player.y)
    this.hero.place(px, py)
    this.hero.setFrame(this.art.hero[player.dir * 2 + (player.moving ? (player.walkPhase >> 3) & 1 : 0)]!)
    this.hero.visible = !(player.invulnerable && (world.tick >> 2) & 1)

    this.sword.visible = player.swordVisible
    if (this.sword.visible) {
      let sx = 0
      let sy = 0
      switch (player.dir) {
        case Dir.Down: sx = 0.05; sy = 0.5; break
        case Dir.Up: sx = -0.05; sy = -0.85; break
        case Dir.Left: sx = -0.75; sy = 0.1; break
        default: sx = 0.75; sy = 0.1
      }
      this.sword.material.map = this.art.sword[player.dir]!
      // Screen-space offset: moving along the camera's up vector shifts the quad by exactly that many view units.
      this.sword.position.set(px + sx, 0.1 + COS * -sy + SPRITE_H / 2, py - SIN * -sy)
    }

    for (let i = 0; i < this.enemies.length; i++) {
      const e = world.enemies[i]!
      const view = this.enemies[i]!
      view.visible = e.alive
      if (!e.alive) continue
      view.place(lerp(e.px, e.x), lerp(e.py, e.y), e.z)
      view.setFrame(this.art.enemies[e.def.sprite]![e.frame]!)
      view.tint(e.flashing ? 0xff7070 : 0xffffff)
    }

    this.updateVfx(world, lerp)

    // Camera follows the interpolated player position, clamped so the view stays on the map.
    const camX = Math.min(Math.max(px, VIEW_HALF_W), MAP_W - VIEW_HALF_W)
    const camZ = Math.min(Math.max(py - 0.5, 4), MAP_H - 4)
    const cam = this.activeCamera()
    const D = this.usePersp ? PERSP_DIST : 30
    cam.position.set(camX, SIN * D, camZ + COS * D)
    cam.lookAt(camX, 0, camZ)
    cam.updateMatrixWorld()

    // Project the player's chest to render pixels and view depth for the see-through hole.
    this.tmp.set(px, 0.1 + SPRITE_H * 0.5, py)
    const depth = -this.tmp2.copy(this.tmp).applyMatrix4(cam.matrixWorldInverse).z
    this.tmp.project(cam)
    this.holes.uHole.value.set(
      ((this.tmp.x + 1) / 2) * VIEW_W,
      ((this.tmp.y + 1) / 2) * VIEW_H,
      HOLE_RADIUS,
      depth,
    )
    this.holes.uTime.value = timeMs / 1000
  }

  /** Effects follow their owner's interpolated position; anchor, size, bob and layering come from VfxDef. */
  private updateVfx(world: World, lerp: (a: number, b: number) => number): void {
    const pool = world.vfx.pool
    for (let i = 0; i < pool.length; i++) {
      const v = pool[i]!
      const m = this.vfx[i]!
      m.visible = v.active
      if (!v.active) continue
      const def = v.def!
      const mat = m.material
      mat.map = this.art.vfx[def.sprite]![v.frame]!
      mat.depthTest = !def.alwaysOnTop
      m.renderOrder = def.alwaysOnTop ? 11 : 0
      m.scale.set(def.size, def.size, 1)
      const bob = Math.abs(Math.sin(v.age * def.bobSpeed)) * def.bobAmplitude
      const base = v.owner ? v.owner.z : 0
      const lift = def.anchor === 'head' ? SPRITE_H : 0
      m.position.set(lerp(v.px, v.x), 0.1 + base + lift + def.offsetY + def.size / 2 + bob, lerp(v.py, v.y))
    }
  }

  private activeCamera(): THREE.Camera {
    return this.usePersp ? this.persp : this.ortho
  }

  render(): void {
    this.renderer.render(this.scene, this.activeCamera())
  }
}

import * as THREE from 'three'
import { MAP_H, MAP_W, T } from '../sim/map'
import { Dir, MAX_ENEMIES, World } from '../sim/world'
import { makeHeroTextures, makeSlimeTextures, makeSwordTextures, makeTileTextures } from './textures'

export const VIEW_W = 160
export const VIEW_H = 144

/** World units of screen height at the focus point, in both camera modes. */
const VIEW_UNITS = 8
const VIEW_HALF_W = (VIEW_UNITS * (VIEW_W / VIEW_H)) / 2
const PERSP_FOV = 45
const PERSP_DIST = VIEW_UNITS / (2 * Math.tan(((PERSP_FOV / 2) * Math.PI) / 180))
/** Camera pitch above the ground plane; lower is less top-down. */
const ELEVATION = (40 * Math.PI) / 180
const SIN = Math.sin(ELEVATION)
const COS = Math.cos(ELEVATION)
/** Upright sprites are stretched so a 1-tile sprite covers one screen unit under the tilted camera. */
const SPRITE_H = 1 / COS
/** Box heights per tile type; trees and houses give the 2.5D relief. */
const TILE_HEIGHT = [0.1, 0.1, 0.1, 0.02, 1.8, 1.2, 2.2]

function spriteGeometry(): THREE.PlaneGeometry {
  return new THREE.PlaneGeometry(1, SPRITE_H).translate(0, SPRITE_H / 2, 0)
}

export class SceneRenderer {
  private readonly renderer: THREE.WebGLRenderer
  private readonly scene = new THREE.Scene()
  private readonly ortho = new THREE.OrthographicCamera(-VIEW_HALF_W, VIEW_HALF_W, VIEW_UNITS / 2, -VIEW_UNITS / 2, 0.1, 100)
  private readonly persp = new THREE.PerspectiveCamera(PERSP_FOV, VIEW_W / VIEW_H, 0.1, 100)
  /** Experiment: perspective is the default, press P to compare with the orthographic view. */
  private usePersp = true
  private readonly heroTex = makeHeroTextures()
  private readonly slimeTex = makeSlimeTextures()
  private readonly swordTex = makeSwordTextures()
  private readonly tileTex = makeTileTextures()
  private readonly hero: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>
  private readonly heroShadow: THREE.Mesh
  private readonly sword: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>
  private readonly slimes: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>[] = []
  private readonly slimeShadows: THREE.Mesh[] = []

  constructor(canvas: HTMLCanvasElement, world: World) {
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

    this.buildTiles(world)

    const geo = spriteGeometry()
    const shadowGeo = new THREE.CircleGeometry(0.32, 14).rotateX(-Math.PI / 2).scale(1, 1, 0.6)
    const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35, depthWrite: false })

    this.hero = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: this.heroTex[0]!, alphaTest: 0.5 }))
    this.heroShadow = new THREE.Mesh(shadowGeo, shadowMat)
    this.sword = new THREE.Mesh(
      new THREE.PlaneGeometry(1, SPRITE_H),
      new THREE.MeshBasicMaterial({ map: this.swordTex[0]!, transparent: true, depthTest: false }),
    )
    this.sword.renderOrder = 10
    this.sword.visible = false
    this.scene.add(this.hero, this.heroShadow, this.sword)

    for (let i = 0; i < MAX_ENEMIES; i++) {
      const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: this.slimeTex[0]!, alphaTest: 0.5 }))
      const s = new THREE.Mesh(shadowGeo, shadowMat)
      this.slimes.push(m)
      this.slimeShadows.push(s)
      this.scene.add(m, s)
    }
  }

  private buildTiles(world: World): void {
    const counts = new Array<number>(this.tileTex.length).fill(0)
    for (let i = 0; i < world.tiles.length; i++) counts[world.tiles[i]!]!++
    const box = new THREE.BoxGeometry(1, 1, 1)
    const m = new THREE.Matrix4()
    const idx = new Array<number>(this.tileTex.length).fill(0)
    const meshes = this.tileTex.map((tex, t) => {
      const mesh = new THREE.InstancedMesh(box, new THREE.MeshLambertMaterial({ map: tex }), Math.max(counts[t]!, 1))
      mesh.count = counts[t]!
      this.scene.add(mesh)
      return mesh
    })
    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        const t = world.tiles[y * MAP_W + x]!
        const h = TILE_HEIGHT[t]!
        m.makeScale(1, h, 1).setPosition(x + 0.5, h / 2, y + 0.5)
        meshes[t]!.setMatrixAt(idx[t]!++, m)
      }
    }
  }

  private place(mesh: THREE.Object3D, x: number, y: number, z: number): void {
    mesh.position.set(x, y, z)
  }

  update(world: World, alpha: number, timeMs: number): void {
    const lerp = (a: number, b: number): number => a + (b - a) * alpha

    // Water scroll in 1/16 steps keeps it pixel-aligned.
    this.tileTex[T.Water]!.offset.x = Math.floor(timeMs / 250) / 16

    const px = lerp(world.ppx, world.px)
    const py = lerp(world.ppy, world.py)
    this.place(this.hero, px, 0.1, py)
    this.place(this.heroShadow, px, 0.115, py)
    const frame = world.moving ? (world.walkPhase >> 3) & 1 : 0
    this.hero.material.map = this.heroTex[world.dir * 2 + frame]!
    this.hero.visible = !(world.invul > 0 && (world.tick >> 2) & 1)

    this.sword.visible = world.attackT > 2
    if (this.sword.visible) {
      let sx = 0
      let sy = 0
      switch (world.dir) {
        case Dir.Down: sx = 0.05; sy = 0.5; break
        case Dir.Up: sx = -0.05; sy = -0.85; break
        case Dir.Left: sx = -0.75; sy = 0.1; break
        default: sx = 0.75; sy = 0.1
      }
      this.sword.material.map = this.swordTex[world.dir]!
      // Screen-space offset: moving along the camera's up vector shifts the quad by exactly that many view units.
      this.place(this.sword, px + sx, 0.1 + COS * -sy + SPRITE_H / 2, py - SIN * -sy)
    }

    for (let i = 0; i < MAX_ENEMIES; i++) {
      const alive = world.ealive[i] === 1
      this.slimes[i]!.visible = alive
      this.slimeShadows[i]!.visible = alive
      if (!alive) continue
      const x = lerp(world.epx[i]!, world.ex[i]!)
      const y = lerp(world.epy[i]!, world.ey[i]!)
      this.place(this.slimes[i]!, x, 0.1, y)
      this.place(this.slimeShadows[i]!, x, 0.115, y)
      const mat = this.slimes[i]!.material
      mat.map = this.slimeTex[((world.tick + i * 7) >> 4) & 1]!
      mat.color.setHex(world.ehurt[i]! > 0 ? 0xff7070 : 0xffffff)
    }

    // Camera follows the interpolated player position, clamped so the view stays on the map.
    const camX = Math.min(Math.max(px, VIEW_HALF_W), MAP_W - VIEW_HALF_W)
    const camZ = Math.min(Math.max(py - 0.5, 4), MAP_H - 4)
    const cam = this.activeCamera()
    const D = this.usePersp ? PERSP_DIST : 30
    cam.position.set(camX, SIN * D, camZ + COS * D)
    cam.lookAt(camX, 0, camZ)
    cam.updateMatrixWorld()
  }

  private activeCamera(): THREE.Camera {
    return this.usePersp ? this.persp : this.ortho
  }

  render(): void {
    this.renderer.render(this.scene, this.activeCamera())
  }
}

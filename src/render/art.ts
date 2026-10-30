import * as THREE from 'three'
import { ENEMY_DEFS } from '../data/enemies'
import { VFX_DEFS } from '../data/vfx'
import { T } from '../sim/map'

/** Pixel size of one sprite cell and of one terrain tile (see src/tools/gen-sprites.mjs). */
export const CELL = 128
export const TILE = 128

/** Every PNG in assets/sprites, keyed by file name without extension. */
const SHEET_URLS: Record<string, string> = Object.fromEntries(
  Object.entries(import.meta.glob('../../assets/sprites/*.png', { eager: true, query: '?url', import: 'default' })).map(
    ([path, url]) => [path.slice(path.lastIndexOf('/') + 1, -'.png'.length), url as string],
  ),
)

/** Textures sliced from the PNG spritesheets. Frame orders are documented in gen-sprites.mjs. */
export interface Art {
  /** Index `dir * 2 + frame`, dir order Down, Up, Left, Right. */
  hero: THREE.Texture[]
  /** Index by dir. */
  sword: THREE.Texture[]
  /** Enemy frames by sprite name (EnemyDef.sprite), then by the enemy's `frame`. */
  enemies: Record<string, THREE.Texture[]>
  /** Visual effect frames by sprite name (VfxDef.sprite); cells are as tall as their sheet. */
  vfx: Record<string, THREE.Texture[]>
  /** Index by tile type (T). Water repeats and is scrolled by the renderer. */
  tiles: THREE.Texture[]
}

function loadSheet(name: string): Promise<HTMLImageElement> {
  const url = SHEET_URLS[name]
  if (!url) return Promise.reject(new Error(`Missing spritesheet assets/sprites/${name}.png`))
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`Failed to load ${url}`))
    img.src = url
  })
}

function texture(img: HTMLImageElement, cell: number, cells: number): THREE.Texture {
  const t = new THREE.Texture(img)
  t.colorSpace = THREE.SRGBColorSpace
  t.magFilter = THREE.NearestFilter
  t.minFilter = THREE.NearestFilter
  t.generateMipmaps = false
  // One texture per cell sharing the sheet image: the cell is picked by UV transform.
  t.repeat.set(1 / cells, 1)
  t.offset.set(cell / cells, 0)
  t.needsUpdate = true
  return t
}

function cells(img: HTMLImageElement, size = CELL): THREE.Texture[] {
  const n = img.width / size
  return Array.from({ length: n }, (_, i) => texture(img, i, n))
}

// Tile sheet cell for each tile type; Water (3) has its own repeating image.
const TILE_CELL = [0, 1, 2, -1, 3, 4, 5]

export async function loadArt(): Promise<Art> {
  const spriteNames = [...new Set(Object.values(ENEMY_DEFS).map((d) => d.sprite))]
  const vfxNames = [...new Set(Object.values(VFX_DEFS).map((d) => d.sprite))]
  const [hero, sword, tiles, water, ...rest] = await Promise.all(
    ['hero', 'sword', 'tiles', 'water', ...spriteNames, ...vfxNames].map(loadSheet),
  )
  const enemySheets = rest.slice(0, spriteNames.length)
  const vfxSheets = rest.slice(spriteNames.length)
  const tileCells = cells(tiles!, TILE)
  const waterTex = new THREE.Texture(water!)
  waterTex.colorSpace = THREE.SRGBColorSpace
  waterTex.magFilter = THREE.NearestFilter
  waterTex.minFilter = THREE.NearestFilter
  waterTex.generateMipmaps = false
  waterTex.wrapS = waterTex.wrapT = THREE.RepeatWrapping
  waterTex.needsUpdate = true

  const enemies: Record<string, THREE.Texture[]> = {}
  spriteNames.forEach((name, i) => {
    enemies[name] = cells(enemySheets[i]!)
  })
  const vfx: Record<string, THREE.Texture[]> = {}
  vfxNames.forEach((name, i) => {
    vfx[name] = cells(vfxSheets[i]!, vfxSheets[i]!.height)
  })
  for (const def of Object.values(VFX_DEFS)) {
    const n = vfx[def.sprite]!.length
    for (const f of def.frames) if (f >= n) throw new Error(`vfx ${def.id}: frame ${f} but ${def.sprite}.png has ${n}`)
  }
  // Fail at load, not mid-game, if a definition animates a frame its sheet doesn't have.
  for (const def of Object.values(ENEMY_DEFS)) {
    const n = enemies[def.sprite]!.length
    for (const rule of def.animation) {
      for (const f of rule.frames) if (f >= n) throw new Error(`${def.id}: animation uses frame ${f} but ${def.sprite}.png has ${n}`)
    }
  }
  return {
    hero: cells(hero!),
    sword: cells(sword!),
    enemies,
    vfx,
    tiles: TILE_CELL.map((c, t) => (t === T.Water ? waterTex : tileCells[c]!)),
  }
}

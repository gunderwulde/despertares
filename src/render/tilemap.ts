import * as THREE from 'three'
import { MAP_H, MAP_W, T } from '../sim/map'
import { type HoleUniforms, addSeeThrough } from './seethrough'

/** Box heights per tile type; trees and houses give the 2.5D relief. */
const TILE_HEIGHT = [0.1, 0.1, 0.1, 0.02, 1.8, 1.2, 2.2]

/** One InstancedMesh per tile type; tall types get the see-through hole. */
export function buildTileMeshes(
  scene: THREE.Scene,
  tiles: Uint8Array,
  tileTex: THREE.Texture[],
  holes: HoleUniforms,
): void {
  const counts = new Array<number>(tileTex.length).fill(0)
  for (let i = 0; i < tiles.length; i++) counts[tiles[i]!]!++
  const box = new THREE.BoxGeometry(1, 1, 1)
  const m = new THREE.Matrix4()
  const idx = new Array<number>(tileTex.length).fill(0)
  const meshes = tileTex.map((tex, t) => {
    const mat = new THREE.MeshLambertMaterial({ map: tex })
    if (t >= T.Tree) addSeeThrough(mat, holes)
    const mesh = new THREE.InstancedMesh(box, mat, Math.max(counts[t]!, 1))
    mesh.count = counts[t]!
    scene.add(mesh)
    return mesh
  })
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      const t = tiles[y * MAP_W + x]!
      const h = TILE_HEIGHT[t]!
      m.makeScale(1, h, 1).setPosition(x + 0.5, h / 2, y + 0.5)
      meshes[t]!.setMatrixAt(idx[t]!++, m)
    }
  }
}

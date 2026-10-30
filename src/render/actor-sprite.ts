import * as THREE from 'three'

type SpriteMesh = THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>

const GROUND = 0.1

/** Billboard sprite plus blob shadow for one actor. Geometry and shadow material are shared. */
export class ActorSprite {
  readonly mesh: SpriteMesh
  private readonly shadow: THREE.Mesh

  constructor(
    scene: THREE.Scene,
    geo: THREE.PlaneGeometry,
    shadowGeo: THREE.BufferGeometry,
    shadowMat: THREE.Material,
    tex: THREE.Texture,
  ) {
    this.mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: tex, alphaTest: 0.5 }))
    this.shadow = new THREE.Mesh(shadowGeo, shadowMat)
    scene.add(this.mesh, this.shadow)
  }

  set visible(v: boolean) {
    this.mesh.visible = v
    this.shadow.visible = v
  }

  /** (x, y) on the floor plane; `height` lifts the sprite but not its shadow. */
  place(x: number, y: number, height = 0): void {
    this.mesh.position.set(x, GROUND + height, y)
    this.shadow.position.set(x, GROUND + 0.015, y)
  }

  setFrame(tex: THREE.Texture): void {
    this.mesh.material.map = tex
  }

  tint(hex: number): void {
    this.mesh.material.color.setHex(hex)
  }
}

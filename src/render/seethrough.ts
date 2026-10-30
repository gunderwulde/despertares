import * as THREE from 'three'

/** See-through hole radius in render pixels (the canvas is 320x288). */
export const HOLE_RADIUS = 30
/** A fragment only gets cut if it is at least this much closer to the camera than the player. */
const HOLE_DEPTH_MARGIN = 0.25

// Tall tiles get a hole around the player's screen position: solid inside, ordered-dither
// band at the edge (pixel-art friendly) and a bright rim on the surviving pixels.
const GLSL_HEADER = /* glsl */ `
uniform vec4 uHole; // xy: player centre in pixels, z: radius, w: player view depth
uniform float uTime;
float bayer2(vec2 a) { a = floor(a); return fract(a.x / 2.0 + a.y * a.y * 0.75); }
float bayer4(vec2 a) { return bayer2(0.5 * a) * 0.25 + bayer2(a); }
`
const GLSL_HOLE = /* glsl */ `
float holeRing = 0.0;
{
  float d = length(gl_FragCoord.xy - uHole.xy);
  if (uHole.w - vViewPosition.z > ${HOLE_DEPTH_MARGIN.toFixed(2)} && d < uHole.z) {
    float inside = 1.0 - smoothstep(uHole.z * 0.55, uHole.z, d);
    if (inside > bayer4(gl_FragCoord.xy) + 0.001) discard;
    holeRing = smoothstep(uHole.z * 0.7, uHole.z, d);
  }
}
`
const GLSL_RING = /* glsl */ `
gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(0.75, 0.95, 1.0), 0.6 * holeRing * (0.75 + 0.25 * sin(uTime * 6.0)));
`

export interface HoleUniforms {
  uHole: { value: THREE.Vector4 }
  uTime: { value: number }
}

export function makeHoleUniforms(): HoleUniforms {
  return { uHole: { value: new THREE.Vector4() }, uTime: { value: 0 } }
}

export function addSeeThrough(mat: THREE.MeshLambertMaterial, uniforms: HoleUniforms): void {
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uHole = uniforms.uHole
    shader.uniforms.uTime = uniforms.uTime
    shader.fragmentShader = shader.fragmentShader
      .replace('void main() {', `${GLSL_HEADER}\nvoid main() {`)
      .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>\n${GLSL_HOLE}`)
      .replace('#include <opaque_fragment>', `#include <opaque_fragment>\n${GLSL_RING}`)
  }
}

# Arquitectura

## 1. Principios
- **Simulación pura** separada del render y del input. Se puede ejecutar en Node sin DOM ni three.js.
- Paso fijo 60 Hz, render con interpolación `alpha`.
- Datos antes que código: salas, enemigos y objetos son datos tipados.
- Orientada a datos en el bucle caliente: typed arrays, pools, sin asignaciones.

## 2. Capas

```
Input (teclado/gamepad) ──> InputFrame (bits)
                                │
                     ┌──────────▼───────────┐
                     │  Simulation (puro)   │  RNG con semilla, ECS, colisión, IA
                     └──────────┬───────────┘
                                │ snapshot (lectura)
                     ┌──────────▼───────────┐
                     │  Renderer (three.js) │  cámara 2.5D, tilemap, sprites, HUD
                     └──────────────────────┘
        Audio y UI consumen eventos de la simulación (cola de eventos)
```

Regla: dependencias solo hacia abajo. `sim/` no importa `render/`, `three` ni `dom`.

## 3. Estructura de carpetas

```
src/
  core/        loop, tiempo, rng, eventos, math (vec/aabb), pools
  sim/         ecs, colisión, jugador, enemigos, objetos, puzles, mundo, guardado
  render/      escena, cámara, tilemap, sprites, luces, shaders, hud
  input/       teclado, gamepad, mapeo
  audio/       música, sfx, mezclador
  data/        salas, enemigos, objetos, diálogos, i18n (JSON/TS tipado)
  game/        arranque, estados (título, juego, pausa), cableado
  tools/       validadores de datos, conversores de atlas
assets/        arte/audio fuente (originales)
tests/         replays, e2e
docs/  tasks/  .claude/agents/
```

## 4. Bucle principal

```ts
// pseudocódigo
accumulator += clamp(frameDelta, 0, 0.1)
while (accumulator >= STEP) { sim.step(input.sample()); accumulator -= STEP }
renderer.draw(sim.snapshot, accumulator / STEP)
```

El input se muestrea una vez por paso de simulación y se graba para replays.

## 5. ECS ligero
- Entidades = índices `u16`. Componentes en typed arrays (`Float32Array`/`Int16Array`) por campo (SoA).
- Sistemas = funciones puras sobre los arrays, orden fijo por frame.
- Entidades con máquinas de estados pequeñas (`state: u8`, `timer: u16`).
- Pools predimensionados (200 entidades máximo, ver PERF_BUDGET).

## 6. Mundo y colisión
- Rejilla de tiles 16×16 con capas: suelo, colisión, altura, interactivos.
- Colisión: AABB contra rejilla (barrido por ejes) + AABB entre entidades con broadphase por celdas.
- Altura (Z) para salto y puentes: componente `z` y `vz`, sombra proyectada en el render.
- Salas conectadas por un grafo; el scroll de pantalla es una transición de estado de la simulación.

## 7. Render 2.5D (three.js)
- `OrthographicCamera` inclinada, `WebGLRenderTarget` 160×144 con `NearestFilter`, escalado entero.
- Mapa de sala: un `InstancedMesh` por tipo de tile (suelo, muro con altura); reconstrucción solo al cambiar de sala.
- Sprites: un `InstancedMesh` de quads con atlas, billboards, ordenación por Y; atributos por instancia en buffers reutilizados.
- Iluminación: una luz direccional + ambiental, sombras "blob" baratas. Sin sombras dinámicas en tiempo real.
- Materiales y geometrías compartidos; prohibido crear materiales en el bucle.
- Debug overlay: ms de sim/render, draw calls, entidades, asignaciones.

## 8. Guardado
- `localStorage` bajo clave versionada: flags bitset, inventario, posición, corazones.
- Migraciones por versión; fallo de carga nunca bloquea (arranque limpio).

## 9. Testing
- **Unitarios**: matemáticas, colisión, RNG, máquinas de estado.
- **Replay**: secuencia de inputs + semilla → hash del estado final. Se versionan en `tests/replays/`.
- **Ruta de resolución**: cada mazmorra tiene un replay que la completa; rompe CI si un cambio la invalida.
- **Perf**: `pnpm perf` compara con `PERF_BUDGET.md`.
- **E2E**: Playwright carga el juego, avanza N frames y comprueba que no hay errores en consola.

# Roadmap del vertical slice

Cada hito pasa por las tres puertas de [ADVERSARIAL.md](ADVERSARIAL.md). Estado: `[ ]` pendiente, `[~]` en curso, `[x]` hecho.

## M0 — Cimientos
- [ ] Scaffold: pnpm, Vite, TS estricto, ESLint, Prettier, Vitest, Playwright
- [ ] `core/`: bucle de paso fijo, RNG con semilla, eventos, pools, math
- [ ] Overlay de debug (ms, draw calls, entidades)
- [ ] CI local: lint + build + test + perf
- **Salida**: ventana negra a 60 fps con overlay y tests verdes.

## M1 — Render 2.5D base
- [ ] Render target 160×144, escalado entero, letterbox
- [ ] Cámara ortográfica inclinada
- [ ] Tilemap instanciado con muros extruidos y luz direccional
- [ ] Sprites billboard instanciados con atlas y orden por Y
- **Salida**: una sala con relieve y un sprite que se mueve. Dentro de presupuesto.

## M2 — Jugador y colisión
- [ ] Input teclado + gamepad con mapeo
- [ ] Movimiento 4 direcciones, colisión AABB contra rejilla
- [ ] Transición de pantalla por scroll
- [ ] Espada y escudo, vida e invulnerabilidad
- **Salida**: recorrer varias salas con combate básico. Replay determinista.

## M3 — Sistemas de juego
- [ ] ECS y pools finales, eventos
- [ ] Enemigos (Escupidor, Gelatina, Murcielaguito) por datos + estados
- [ ] Objetos: Pluma (salto con Z), Bombas, llaves, cofres
- [ ] Diálogo, i18n, HUD, inventario/pausa, guardado versionado

## M4 — Contenido
- [ ] Pueblo Marea (12 pantallas) con NPCs y tutorial implícito
- [ ] Bosque Brumoso (16 pantallas) con niebla y puzle de bloques
- [ ] Cueva Cola (9+3 salas), puzles, mapa/brújula/llaves
- [ ] Jefe Gusano Hueco en 3 fases
- [ ] Música y SFX originales

## M5 — Pulido y verificación
- [ ] Replay de resolución completa de la mazmorra
- [ ] Optimización guiada por mediciones (Abrash)
- [ ] Revisión final de corrección (Carmack)
- [ ] Accesibilidad básica (remapeo de teclas, reducir parpadeos)
- **Salida**: criterios de éxito del GDD §11.

## Orden de arranque recomendado
M0 → M1 en paralelo con las primeras partes de M2 (`engine-dev` y `render-dev`), con `qa` montando la infraestructura de replays desde M0.

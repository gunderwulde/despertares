# GDD — "Isla Niebla" (título de trabajo)

> Adaptación 2.5D en three.js + TypeScript, inspirada en *The Legend of Zelda: Link's Awakening DX* (Game Boy Color).
> Documento vivo. Los cambios pasan por el proceso de [docs/ADVERSARIAL.md](docs/ADVERSARIAL.md).

## 1. Decisiones de proyecto (cerradas)

| Tema | Decisión |
|---|---|
| Visual | **2.5D**: mundo de rejilla 2D con relieve (muros extruidos, luz y sombras suaves), cámara ortográfica inclinada, personajes como sprites billboard |
| Alcance | **Vertical slice**: pueblo, bosque y mazmorra 1 con jefe, sobre un motor completo y reutilizable |
| Assets | **Originales propios**. Nada extraído de ROMs. Nombres, personajes y mapas propios (ver §10) |
| Plataforma | Web escritorio, teclado + mando (Gamepad API), 60 fps |
| Toolchain | TypeScript estricto, Vite, Vitest, Playwright (smoke), pnpm |
| Idioma | Docs en español; código, comentarios y commits en inglés; textos de juego localizables (es/en) |
| Proceso | Agentes Claude Code con el sistema adversarial Carmack + Abrash |

## 2. Pilares de diseño

1. **Aventura legible**: cada pantalla es un pequeño puzle o encuentro comprensible de un vistazo.
2. **Mundo interconectado**: atajos, cerraduras y objetos que reabren zonas ya visitadas.
3. **Control inmediato**: respuesta en 1 frame, movimiento de 4 direcciones, colisiones justas.
4. **Tono onírico y melancólico**: isla misteriosa, humor suave, NPCs memorables.
5. **Fidelidad de sensación, no de píxeles**: el 2.5D añade profundidad sin cambiar el ritmo de juego.

## 3. Estructura de pantalla y cámara

- Resolución lógica: **160×144** (10×9 tiles de 16×16), como la GBC.
- Render a un `WebGLRenderTarget` de baja resolución, `NearestFilter`, escalado **entero** a ventana (letterbox).
- Cámara ortográfica con inclinación fija (~35–45°), sin perspectiva. Los sprites se orientan a cámara y se ordenan por profundidad (Y).
- Transición por **pantallas**: al cruzar el borde, scroll de sala en ~0.5 s con el juego congelado salvo el jugador.
- HUD en capa 2D superpuesta (corazones, rupias, objetos A/B, minimapa de mazmorra).

## 4. Mecánicas del jugador

| Mecánica | Detalle |
|---|---|
| Movimiento | 4 direcciones, velocidad base 1 px/frame lógico (60 Hz), sin aceleración. Escaleras y hierba lenta |
| Espada (botón A) | Golpe corto, frente al jugador; ráfaga cargada giratoria al mantener |
| Escudo (botón B) | Bloquea proyectiles frontales; empuja enemigos ligeros |
| Objetos | Slots A/B asignables desde el inventario |
| Salto (Pluma) | Cruce de fosos de 1 tile; salto con arco 2.5D real (sombra en suelo, altura en Z) |
| Bombas | Abren muros frágiles, dañan enemigos; munición limitada |
| Vida | Corazones con medios; daño con invulnerabilidad 60 frames y empuje |
| Muerte | Pantalla de continuar, reaparición en la entrada de la zona |
| Guardado | Slot único en `localStorage`, versionado y con migraciones |

## 5. Contenido del vertical slice

### 5.1 Pueblo "Marea" (zona A)
- 12 pantallas. Casa del jugador, tienda, casa de NPC con misión, playa de inicio.
- Tutorial implícito: recoger la espada en la playa, hablar con 3 NPCs, cortar hierba, usar el escudo.
- Cuco/gallina, perro, objeto de intercambio (primer eslabón de una cadena de trueque).

### 5.2 Bosque Brumoso (zona B)
- 16 pantallas. Niebla volumétrica (fog en shader), caminos que se reordenan si te equivocas.
- Encuentra la **Pluma** (objeto de movimiento) y la llave de la mazmorra.
- Minijuego opcional: puzle de bloques empujables.

### 5.3 Mazmorra 1 "Cueva Cola" (nombre de trabajo)
- 9 salas principales + 3 secretas. Mapa, brújula, 2 llaves pequeñas, llave del jefe.
- Puzles: interruptor de suelo, bloques empujables, puertas de llave, foso con salto, muro explosivo.
- **Jefe**: criatura segmentada que rebota por la sala, 3 puntos débiles, 3 fases de velocidad.
- Recompensa: contenedor de corazón + instrumento (cierre del slice con cinemática breve).

## 6. Enemigos (nombres originales)

| Nombre de trabajo | Comportamiento | Inspiración |
|---|---|---|
| Escupidor | Gira y dispara rocas en línea recta | Octorok-like |
| Gelatina | Salta aleatoriamente, se divide al ser golpeada | Zol-like |
| Murcielaguito | Vuelo ondulado, ataca en picado | Keese-like |
| Escarabajo | Marcha en línea y rebota, inmune al frente | Hardhat-like |
| Seta Saltarina | Persigue cuando entras en radio | Goomba-like |
| Centinela de Piedra | Se activa al pisar un tile, arrolla | Armos-like |
| Gusano Hueco (jefe) | Cadena segmentada, rebota, 3 fases | Moldorm-like |

Cada enemigo se define por datos (JSON) + una máquina de estados pequeña en TS. Ver [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## 7. Sistemas

- **Diálogo**: caja de texto con efecto máquina, retratos opcionales, ramificaciones simples y flags.
- **Inventario y economía**: rupias (máx. 999), tienda con 3 artículos, cofres.
- **Flags de mundo**: bitset persistente (puertas abiertas, cofres, jefes, NPCs).
- **Audio**: música por zona (loop con intro), SFX con prioridad y límite de voces. WebAudio, sin librerías pesadas.
- **Localización**: tablas `es.json` / `en.json` con claves; sin cadenas en el código.
- **Pausa/inventario**: congela la simulación; no afecta al reloj de render.

## 8. Dirección artística

- Paleta limitada por zona (4–8 colores base + 1 de acento), inspirada en el aspecto GBC pero ampliada.
- Tiles 16×16 en atlas (potencia de 2), sprites 16×16 con 4 direcciones × 2 frames mínimo.
- Relieve 2.5D: muros y árboles con altura de 1–2 unidades, sombras blandas fijas (blob + ambient occlusion pintada), luz direccional única.
- Postproceso mínimo y opcional: viñeta ligera, rejilla de paleta. Todo desactivable.

## 9. Requisitos técnicos y presupuestos

Resumen; el detalle medible está en [docs/PERF_BUDGET.md](docs/PERF_BUDGET.md).

- 60 fps estables en una GPU integrada de 2020; frame lógico fijo a 60 Hz.
- ≤ 150 draw calls por frame; ≤ 200 entidades activas; **0 asignaciones** en el bucle caliente.
- Bundle inicial ≤ 1.5 MB gzip; carga de zona ≤ 1 s en red local.
- Simulación **determinista** (misma semilla + mismos inputs = mismo estado), requisito para tests de replay.

## 10. Nota de propiedad intelectual

El proyecto es una obra **inspirada** en el género y el diseño de Link's Awakening, no una copia. Nombres, personajes, mapas, textos, música y arte son originales. No se incluye ni se extrae material de ROMs. Los nombres de la tabla de §6 son de trabajo. Si se publica, evitar la marca *Zelda*/*Link* y revisar con asesoría legal.

## 11. Criterios de éxito del slice

- Jugable de inicio a fin en ~45–60 min sin errores bloqueantes.
- Todos los puzles de la mazmorra resolubles y verificados por un test de "ruta de resolución".
- Presupuestos de rendimiento cumplidos y medidos en CI.
- Cobertura de tests de la simulación ≥ 80 % y 0 fallos de replay.

## 12. Fuera de alcance (por ahora)

Mazmorras 2–8, overworld completo, minijuegos extra, modo Color/DX adicional, móvil táctil, multijugador, editor de niveles público.

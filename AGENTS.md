# AGENTS.md — Guía para agentes

Proyecto: **Isla Niebla** (título de trabajo), adaptación 2.5D inspirada en Link's Awakening DX.
Stack: TypeScript estricto + three.js + Vite + Vitest + pnpm.

Léelo todo antes de tocar código. Fuente de verdad del diseño: [GDD.md](GDD.md).

## 1. Documentos clave

| Documento | Para qué |
|---|---|
| [GDD.md](GDD.md) | Qué construimos |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Cómo está estructurado el código |
| [docs/ADVERSARIAL.md](docs/ADVERSARIAL.md) | Proceso Carmack + Abrash (obligatorio) |
| [docs/PERF_BUDGET.md](docs/PERF_BUDGET.md) | Presupuestos medibles |
| [docs/CODING_STANDARDS.md](docs/CODING_STANDARDS.md) | Estilo y reglas de código |
| [docs/ASSET_PIPELINE.md](docs/ASSET_PIPELINE.md) | Arte, mapas y audio |
| [docs/ROADMAP.md](docs/ROADMAP.md) | Hitos y tareas |
| [tasks/](tasks/) | Plantillas y tareas activas |

## 2. Roles (definidos en `.claude/agents/`)

| Agente | Responsabilidad |
|---|---|
| `lead` | Orquesta, reparte tareas, resuelve desacuerdos, mantiene ROADMAP |
| `carmack` | Diseño y revisión: corrección, simplicidad, determinismo, arquitectura |
| `abrash` | Diseño y revisión: rendimiento, presupuestos, mediciones, memoria |
| `engine-dev` | Núcleo: bucle, ECS, colisiones, input, guardado |
| `render-dev` | three.js: cámara 2.5D, tilemaps, sprites, shaders, HUD |
| `gameplay-dev` | Jugador, enemigos, objetos, puzles, jefe, diálogo |
| `content-dev` | Mapas, datos, textos, atlas y audio original |
| `qa` | Tests, replays, perf en CI, verificación de puzles |

Los agentes de implementación **no se autoaprueban**. Toda tarea pasa por las puertas del proceso adversarial.

## 3. Flujo obligatorio (resumen)

```
Diseño  -> carmack propone, abrash ataca  -> DESIGN-GATE
Impl.   -> dev implementa con tests       -> IMPL-GATE (build+tests+perf)
Review  -> carmack revisa corrección, abrash revisa rendimiento -> MERGE-GATE
```

Detalle y plantillas en [docs/ADVERSARIAL.md](docs/ADVERSARIAL.md). Ninguna tarea se da por terminada sin ambos vistos buenos escritos en el fichero de tarea.

## 4. Comandos

```bash
pnpm install
pnpm dev            # Vite
pnpm build          # tsc --noEmit + vite build
pnpm test           # vitest run
pnpm test:replay    # replays deterministas
pnpm perf           # benchmarks de presupuestos
pnpm lint
pnpm e2e            # playwright smoke
```

Antes de declarar algo hecho: `pnpm lint && pnpm build && pnpm test`. Si algo falla, repórtalo con la salida, no lo oculte.

## 5. Reglas duras

1. TypeScript `strict`, sin `any` ni `// @ts-ignore` sin justificación escrita.
2. La **simulación no importa three.js** ni el DOM. Render e input son capas separadas.
3. Paso fijo de 60 Hz; render interpola. Nada de `Date.now()` ni `Math.random()` en la simulación (usar RNG con semilla).
4. **Cero asignaciones** en el bucle caliente (update/render por frame). Pools y typed arrays.
5. Todo contenido es **dato** (JSON/TS tipado), no código ad hoc por sala.
6. Sin cadenas de texto de juego en el código; usar claves de localización.
7. Assets **originales**. Prohibido incorporar material extraído de ROMs o copiado de terceros.
8. Un cambio = una tarea = un commit lógico. Mensajes en inglés, imperativo.
9. No ampliar el alcance: lo que no está en el GDD §5 requiere cambio de GDD aprobado.
10. Si hay duda de diseño, pregunta al `lead`; si es del usuario, el `lead` la escala.

## 6. Convenciones de trabajo

- Estructura de carpetas en [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md). No crear carpetas raíz nuevas sin aprobación.
- Cada módulo con tests junto al código (`*.test.ts`).
- Cada tarea en `tasks/TASK-NNN-slug.md` a partir de `tasks/_TEMPLATE.md`.
- Los hallazgos de revisión se registran en el fichero de tarea con severidad (`blocker`, `major`, `minor`, `nit`).
- Los `blocker` y `major` deben cerrarse antes del MERGE-GATE.

## 7. Qué hacer cuando...

- **Carmack y Abrash discrepan**: el `lead` pide a cada uno una medición o prueba que apoye su postura. Gana el dato; si no hay dato, gana la opción más simple que cumpla el presupuesto.
- **El presupuesto se rompe**: la tarea no se cierra. Se optimiza o se renegocia el presupuesto con justificación en `docs/PERF_BUDGET.md`.
- **Falta un asset**: usar placeholder generado por código y abrir tarea para `content-dev`.

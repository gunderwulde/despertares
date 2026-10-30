# Presupuestos de rendimiento

Referencia: GPU integrada de 2020, navegador Chromium estable, 1080p. Objetivo 60 fps (16.6 ms/frame).

| Recurso | Presupuesto | Cómo se mide |
|---|---|---|
| Frame total (p99) | ≤ 16.6 ms | overlay de debug + `pnpm perf` |
| Simulación por paso | ≤ 2.0 ms | benchmark en Node, 200 entidades |
| Render CPU por frame | ≤ 3.0 ms | `performance.now()` alrededor de `draw` |
| Draw calls | ≤ 150 | `renderer.info.render.calls` |
| Triángulos | ≤ 60 000 | `renderer.info.render.triangles` |
| Entidades activas | ≤ 200 | contador de pool |
| Asignaciones en el bucle caliente | **0** por frame | perfilador de memoria / test de heap estable |
| GC pausas | 0 visibles en 60 s de juego | Performance panel |
| Memoria de texturas | ≤ 32 MB | `renderer.info.memory` |
| Bundle inicial | ≤ 1.5 MB gzip | `vite build` + reporte |
| Carga de zona | ≤ 1 s (local) | marcas de tiempo |
| Cambio de sala | ≤ 1 frame de pico > 8 ms | traza |

## Reglas
1. Todo cambio en ruta caliente adjunta antes/después en la tarea.
2. Se prohíbe cerrar una tarea si rompe un presupuesto sin renegociación escrita aquí (con fecha y motivo).
3. Optimizar sin medir es un `blocker` en revisión de Abrash.

## Registro de renegociaciones
_(vacío)_

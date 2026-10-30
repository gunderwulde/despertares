# Estándares de código

- **TypeScript**: `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`. Sin `any`.
- **Idioma**: identificadores, comentarios y commits en inglés.
- **Nombres**: `camelCase` funciones/variables, `PascalCase` tipos, `UPPER_SNAKE` constantes. Ficheros `kebab-case.ts`.
- **Comentarios**: solo el *porqué* no evidente. Sin comentarios redundantes.
- **Funciones** pequeñas y puras en `sim/`. Efectos laterales solo en el borde (`game/`, `render/`, `audio/`).
- **Sin estado global mutable** fuera de objetos explícitos pasados por parámetro.
- **Errores**: validar datos en `tools/` y al cargar; en el bucle caliente no se lanzan excepciones.
- **Bucle caliente**: sin `new`, sin literales de objeto/array, sin `map/filter/forEach` con closures, sin spread. Bucles `for` indexados.
- **Aleatoriedad/tiempo**: solo mediante `core/rng` y el paso fijo. Prohibidos `Math.random` y `Date.now` en `sim/`.
- **Enums**: usar `const enum` o uniones de literales; estados como `u8`.
- **Dependencias**: añadir una requiere aprobación de Carmack (¿se puede evitar?) y Abrash (¿coste en bundle/runtime?). Base: `three`.
- **Tests**: nombre descriptivo, deterministas, sin esperas reales.
- **Commits**: imperativo, ≤ 72 caracteres en el asunto, uno por tarea lógica.
- **Lint/format**: ESLint + Prettier; CI falla con cualquier warning.

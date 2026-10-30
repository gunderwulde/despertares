# Pipeline de assets (originales)

## Regla de oro
Todo asset es **creado para este proyecto**. Prohibido usar o extraer material de ROMs, sprite rips o música de terceros. Cada asset registra su origen en `assets/CREDITS.md`.

## Arte
- Tiles y sprites 16×16, atlas en potencias de 2 (256×256 o 512×512), PNG indexado, sin suavizado.
- Paleta por zona definida en `src/data/palettes.ts` (4–8 colores + acento).
- Sprites: 4 direcciones × 2 frames mínimo; sombras se generan en el render, no se pintan.
- Mapas: formato Tiled (`.tmj`) o JSON propio; `tools/` valida y convierte a datos tipados.
- Alturas de tile (0, 1, 2) en capa dedicada para el relieve 2.5D.

## Audio
- Música original en bucle (OGG), intro + loop. SFX cortos (OGG/WAV), normalizados.
- Límite de voces simultáneas: 8. Prioridad: daño > jugador > ambiente.

## Texto
- Claves en `src/data/i18n/{es,en}.json`. Sin texto literal en el código.
- Longitud máxima por caja de diálogo: 4 líneas × 18 caracteres (ajustable por fuente).

## Placeholders
Hasta tener arte final, `content-dev` genera tiles y sprites con código (rectángulos de color, patrones), marcados con el sufijo `_placeholder` para localizarlos.

## Validación (CI)
`pnpm validate:data` comprueba: salas conectadas, claves i18n presentes en ambos idiomas, sprites con dimensiones correctas, sin referencias rotas.

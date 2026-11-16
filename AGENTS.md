<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->


## Reglas de formularios

- Para campos numéricos usar `Input` de `src/components/ui/input.tsx` con `type="number"`. Un valor cero se muestra vacío con `placeholder="0"`, sin obligar a borrar un cero inicial.
- Conservar los valores existentes distintos de cero y los valores iniciales operativos (por ejemplo, cantidad 1). Permitir borrar el campo y escribir decimales; no normalizar el borrador en cada pulsación.
- Si cero es válido, un campo vacío se interpreta como cero al guardar y no debe tener `required`. Si se exige un valor positivo, conservar `min` y la validación del formulario.
- Los nombres/unidades de campos van en etiquetas visibles, no en el placeholder numérico.
- Verificar solo lo necesario para el cambio. Evitar QA exhaustivo, pruebas repetidas o navegador salvo necesidad concreta o pedido del usuario.

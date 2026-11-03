# Preferencias UX / UI — Aurix Retail

Documento vivo para agentes y humanos. Preferir estos patrones antes de inventar layouts nuevos.

## Flujo git (obligatorio)

- **Los push van a `main`.** Commit y `git push origin main` en este repo (y en el API cuando aplique).
- No abrir PRs ni ramas `cursor/…` salvo que el humano lo pida explícitamente.
- Trabajar sobre `main` actualizado (`git pull origin main` antes de empezar).
- Esta regla prevalece sobre el flujo por defecto de Cloud Agent (feature branch + PR).

## Principios del dominio

- **Comercio = local único.** No hay depósitos ni sucursales internas. La UX de sucursales está apagada (`BRANCHES_ENABLED = false`). Stock y productos viven por comercio. No hay módulo Catálogo (vitrina); la consulta/gestión es en Productos.
- **Soft delete → Papelera.** No borrar hard desde UI. Archivar (`activa = false`) y reactivar. El único comercio activo no se puede archivar.
- **Alcance global = comercio activo** del header (selector). No mezclar con “todas las sucursales”.

## Anatomía de página

1. **Eyebrow** corto en mayúsculas tracking amplio (`text-xs … uppercase tracking-[0.14em] text-muted-foreground`).
2. **Título** `font-display` grande (`text-3xl font-semibold text-charcoal`).
3. **Una frase de apoyo** (`text-sm text-muted-foreground`, `max-w-2xl`).
4. **CTA primario** alineado a la derecha en desktop (crear / nuevo).
5. **Una sección = un trabajo.** No meter stats, tablas y formularios secundarios en el primer bloque sin necesidad.

## Tabs con conteo

Para listas con activos + archivados usar el patrón de Biblioteca:

```
[ Comercios (4) | Papelera (1) ]
```

- Contenedor: `inline-flex rounded-lg bg-secondary/70 p-1 ring-1 ring-border/60`
- Tab activo: `bg-card text-charcoal shadow-sm`; conteo en `text-teal`
- Tab inactivo: `text-muted-foreground`
- Labels: `Comercios (n)` / `Papelera (m)` (o el recurso equivalente)
- En Papelera: acción **Reactivar**; en activos: **Editar** + **A papelera**

Reutilizar el mismo patrón en otros módulos (usuarios, listas, etc.) cuando agreguen papelera.

## Tablas y bloques

- Lista principal dentro de `rounded-xl bg-card/90 ring-1 ring-border/70`
- Headers: `text-xs uppercase tracking-[0.1em] text-muted-foreground`
- Códigos / IDs técnicos: `font-mono text-xs`
- Badges sutiles (`default`, estado): `text-xs text-teal`, sin pills redondeadas llenas
- Acciones de fila a la derecha: **lápiz** (editar) + menú **⋮** (`RowActionsMenu`) para el resto (ficha, sync WC/ML, etc.). Evitar filas de links de texto que ocupan dos líneas.
- En listados con pocas acciones (2): botones `outline` / `ghost` siguen OK; con 3+ preferir ⋮ + lápiz.

### Semáforo de salubridad (productos)

Estilo Vercel Ready: punto de color + label (+ detalle corto).

| Nivel | Color | Cuándo |
| --- | --- | --- |
| Listo | teal | foto, precio &gt; 0, SKU, nombre; con descripción, stock y activo |
| Atención | ámbar | faltan datos menores (sin descripción, sin stock, inactivo) |
| Crítico | rojo | sin foto, sin precio, sin SKU o sin nombre |

- Filtro por tabs con conteo + punto (`Todos` / `Listo` / `Atención` / `Crítico`)
- También: buscar nombre/SKU, categoría, orden (recientes/antiguos, más/menos vendidos)
- Helpers: `src/lib/product-health.ts`, `src/components/status-dot.tsx`

## Modales

- **Siempre** `ModalPortal` → `document.body` (nunca `fixed` dentro del main animado).
- Overlay: `fixed inset-0 z-[200] flex h-dvh w-screen items-center justify-center`
- Panel compacto: `max-h-[min(92dvh,…)] … max-w-lg` (formularios cortos, confirmaciones).
- **Ficha de producto = modal full size:** casi viewport (`h-dvh` / `sm:p-3` + panel a pantalla completa), layout 2 columnas en desktop (galería | datos), header + footer fijos, body scroll.
- Etiquetas térmicas: **barras y QR se imprimen por separado** (dos botones / dos trabajos de impresión).
- Preview de fotos: clic en la imagen abre `ImageLightbox` full-screen (`z-[210]`) con navegación si hay varias; Escape cierra solo el lightbox.
- Tras **editar** un producto vinculado a WooCommerce (API remota): al guardar, preguntar con `ConfirmModal` si también sincronizar el sitio web. Sí → `pushWooProduct`; No → solo Aurix. Alta nueva no pregunta.
- **Mercado Libre pull:** mismo patrón de modal que WC. Sin lista en el canal → crea/usa lista «Mercadolibre» y asigna precios ahí. Guía: API `docs/MELI_PULL.md`.
- **Mercado Libre notificaciones:** mostrar callback URL + log de eventos en Canales; el webhook debe ACK 200 inmediato (procesamiento en background).
- Escape y click en backdrop cierran solo si no hay operación en curso

### Feedback de operaciones largas (obligatorio)

Cargar / importar / sync de productos **siempre** comunica en un **modal**, no solo cambiando el texto del botón ni un toast detrás.

1. **Abrir el modal al iniciar** la consulta (no esperar al resultado). Título claro: p. ej. «Consultando WooCommerce…».
2. **Durante la espera:** mensaje corto + contexto (comercio destino, lista) + aviso de que puede tardar; no permitir cerrar.
3. **Preview / confirmación:** números legibles (encontrados, coinciden, nuevos, omitidos), no un párrafo denso.
4. **Durante la importación:** estado visible dentro del mismo modal («Importando N productos…»).
5. **Resultado:** éxito/error **dentro del modal**, con cifras (creados, actualizados, vinculados, fotos). Banner de página es refuerzo, no el único feedback.
6. No contar «Nuevos: 0» como fallo: los SKU simples ya existen en ese comercio.

### Anidamiento (máx. 2)

Se permiten **hasta dos modales apilados**, ambos via portal a `body`:

1. **Modal de trabajo** — detalle / edición (ej. ficha de producto, editar comercio).
2. **Modal de confirmación** — encima, corto: “¿Está seguro que quiere…?” (archivar, descartar cambios, acción irreversible).

Reglas:

- El 2º usa `z` mayor que el 1º (ej. `z-[210]` vs `z-[200]`) y su propio backdrop.
- Escape cierra solo el de arriba; el de abajo permanece.
- No un tercer nivel: si hace falta otro flujo, cerrar o reemplazar el de trabajo.
- La confirmación es compacta (título + 1–2 frases + Confirmar / Cancelar); no reutilizar el layout completo del modal de trabajo.
- Si el modal de trabajo tiene cambios sin guardar, click fuera / Escape / Cancelar abre confirmación (“¿Está seguro que quiere salir? Los cambios no serán guardados.”). Sin cambios dirty, cierra directo.
- Componente: `src/components/confirm-modal.tsx` (`z-[210]`).

## Mensajes de sistema

- Éxito: `rounded-lg bg-tealSoft/60 … text-charcoal`
- Error: `bg-destructive/10 text-destructive`
- Operaciones largas: ver **Feedback de operaciones largas** (modal primero; banner de página solo como refuerzo al cerrar).
- Tras una acción que cierra modal, dejar el mensaje visible en la página y scrollearlo a la vista si hace falta

## Formularios

- Labels + inputs del design system (`Label`, `Input`)
- Selects nativos con borde `border-border` y `rounded-md` (consistente con el resto)
- Checkbox de “activo / default” en el modal de edición; la papelera es el camino de archivo desde la lista

## Qué evitar en este producto

- Reintroducir UI de sucursales / depósitos mientras `BRANCHES_ENABLED` sea false
- Cards decorativas innecesarias en heroes o listados simples
- `position: fixed` de modales dentro del scroll/animación del main (overlay incompleto y scroll infinito). Anidar hasta 2 vía portal está OK; ver sección Modales.
- Hard delete de comercios con productos sin paso por papelera
- Contar “Nuevos: 0” en imports como fallo: significa que los SKU simples ya existen
- Asumir que «Privado» en WooCommerce excluye el pull: se importan (status publish/private/draft/pending); privados quedan inactivos en Aurix pero con imágenes. Si faltan fotos, re-confirmar el pull tras desplegar el API.

## Referencias de implementación

- Tabs + conteo: `src/components/media-library.tsx`, `src/components/comercios-panel.tsx`
- Portal modal: `src/components/modal-portal.tsx`
- Acciones de fila ⋮: `src/components/row-actions-menu.tsx`
- Feature flag sucursales: `src/lib/features.ts`

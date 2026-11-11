# template-retail

Gold **Aurix Retail** (frontend Next.js). Template GitHub para el alta Fenec (`repoTemplateFront`).

## Stack

- Next.js 16 · React 19 · Tailwind CSS 4 · TypeScript
- Datos vía API (`NEXT_PUBLIC_API_URL`) o fallback en memoria (`src/lib/memory-store.ts`)

## Desarrollo

```bash
cp .env.example .env.local
# Opcional: NEXT_PUBLIC_API_URL=http://127.0.0.1:3852
npm install
npm run dev
```

App en [http://127.0.0.1:3851](http://127.0.0.1:3851).

Sin `NEXT_PUBLIC_API_URL` corre en **modo demo** (memoria).  
Con URL apunta al gold API (`/api/*` de `template-retail-api`).

## Conexión al API (alta Fenec)

```
NEXT_PUBLIC_API_URL=http://{slug}.api.aurixerp.com
```

Cliente HTTP: `src/lib/api-client.ts` · store: `src/lib/store.ts`.

## Módulos

| Ruta | Uso |
|------|-----|
| `/` | Dashboard / KPIs |
| `/productos` | SKUs, semáforo, ficha, imágenes, sync canales |
| `/clientes` | Agenda |
| `/presupuestos` | Presupuestos |
| `/biblioteca` | Media library |
| `/pedidos` | Pedidos + historial POS |
| `/pos` | Terminal de caja |
| `/mayorista` | Pedidos B2B |
| `/reportes` | Ventas por vendedor |
| `/comercios` | Multicomercio + papelera |
| `/canales` | WooCommerce / Mercado Libre (pull, push, notificaciones) |
| `/configuracion` | Listas de precios · cuentas |
| `/sucursales` | Opcional (`BRANCHES_ENABLED`) |

UX viva: `docs/UX_UI.md`. Push de agentes: a **`main`**.

## Template GitHub

Marcado como **Template repository** para el alta (`repoTemplateFront`).
Sincronizado desde mejoras validadas en instancias (p. ej. Musicanoba).

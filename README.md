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


## Cuenta y carga de catálogo

Con `NEXT_PUBLIC_API_URL`, el sistema requiere login con una cuenta activa de la API.
El sidebar muestra nombre, rol, Mi cuenta (email) y Cerrar sesión. La sesión usa
cookie HttpOnly `aurix_session`, vence a las 8 horas y se pierde al reiniciar la API.
La tienda `/tienda` continúa pública. El login usa marca genérica Aurix Retail.

Sin API configurada se conserva el modo demo local: no solicita credenciales reales,
el sidebar indica Demo local y los productos/medios se paginan en memoria.
La demo no implementa una sesión autenticada y no muestra Cerrar sesión.

`/productos` y `/pos` solicitan páginas de 40 productos; POS prioriza SKU exacto.
La biblioteca solicita 24 medios por página, sin base64 en los listados remotos,
con miniaturas locales y descarga del original al abrirlo. Los medios remotos
conservan su URL. Muestra cantidad y peso registrado de toda la búsqueda, junto
al número de archivos sin tamaño registrado. Los contadores de salud se cargan
por separado y no bloquean la grilla ni se recalculan al cambiar de página.

Actualizar API y frontend de manera coordinada: se incorpora el rewrite autenticado
`/api/media/:path*`. La API requiere `npm ci` para instalar Sharp y Node >=20.9.
No hay migraciones nuevas. Ver README de template-retail-api para métricas
Server-Timing y logs de lecturas lentas. Estas mejoras aplican a nuevas instancias
provisionadas desde los templates; las instancias existentes requieren actualizar
su código y desplegarlo.

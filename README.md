# template-retail — venta local

Aurix Retail para **un único local**: productos, inventario, clientes, caja (POS),
pedidos locales, ventas mayoristas, presupuestos, biblioteca, reportes y cuentas.

No incluye gestión de múltiples comercios, sucursales, stock compartido, tienda
pública, pedidos web, importación desde URL ni integraciones con marketplaces.
Las rutas `/comercios`, `/sucursales`, `/canales` y `/tienda` no están disponibles.

## Desarrollo

Requiere Node >=20.9. Ejecutar `npm ci` y `npm run dev` (puerto 3851).
Configurar `NEXT_PUBLIC_API_URL` con la URL de `template-retail-api`, sin `/api`.
Sin esa variable se usa el modo demo local en memoria, sin credenciales reales.

Con API, el login usa las cuentas activas del local. El sidebar muestra nombre,
rol, email y Cerrar sesión. La cookie HttpOnly `aurix_session` dura hasta 8 horas;
reiniciar la API requiere ingresar de nuevo. El operador de caja es la cuenta
conectada: no hay selector de comercios, sucursales ni otro operador.

## Catálogo y biblioteca

- Productos y POS: páginas de 40; POS prioriza SKU exacto.
- Contadores de salud separados de la consulta de página.
- Biblioteca: páginas de 24, búsqueda en servidor, carga diferida, miniaturas
  locales y originales al abrir/descargar. Incluye cantidad, peso registrado y
  cantidad sin tamaño conocido para toda la búsqueda.
- Los originales remotos existentes conservan su URL; no se sincronizan canales.
- Las consultas esperan la inicialización del local y descartan resultados obsoletos.

El perfil del local se obtiene desde `/api/business`. Los identificadores internos
`comercio_id` y columnas históricas se conservan por compatibilidad del esquema,
pero no habilitan selección ni administración de otros locales.

Actualizar frontend y API de forma coordinada. Next transmite llamadas y cookies
por `/aurix-api` y sirve los archivos autenticados mediante `/api/media/:path*`.
La API requiere `npm ci` para Sharp; no hay migraciones nuevas de esta adaptación.
Actualizar un template no modifica automáticamente instalaciones ya provisionadas.

Ver `docs/UX_UI.md` para el alcance de la interfaz.

## Modal de productos

Alta y edición comparten un modal adaptable con datos, precios, stock y galería.
Las imágenes se pueden agregar, quitar y seleccionar como portada antes de
guardar; Escape y clic fuera siempre solicitan confirmación para salir. Las
fotos se optimizan antes de subir y los reintentos conservan las operaciones
ya confirmadas. Los campos numéricos muestran el cero como placeholder.

## Nombre en las impresiones

Configuración → Impresora permite editar el nombre del negocio que encabeza
las etiquetas de producto (barras y QR) y los tickets térmicos. Se puede tomar
el nombre del negocio registrado o escribir otro. Guardar configuración aplica
el cambio en este equipo, junto con las preferencias de papel. Cambiar el
tamaño de papel o restaurar 80 mm conserva el nombre elegido.

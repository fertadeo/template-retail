# template-retail — venta local

Aurix Retail para **un único local**: productos, inventario, clientes, caja (POS),
pedidos locales, ventas mayoristas, presupuestos, biblioteca, reportes y cuentas.

No incluye gestión de múltiples comercios, sucursales, stock compartido,
importación desde URL ni conectores de marketplaces. El catálogo público pertenece
al mismo local y recibe solicitudes por WhatsApp; no es una integración externa
ni un checkout de pagos en línea. Las rutas `/comercios`, `/sucursales` y `/canales`
no están disponibles.

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
La API requiere `npm ci` para Sharp y aplicar `018_catalog_checkout.sql` al desplegar el catálogo público.
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


## Catálogo público y pedidos por WhatsApp

La URL pública es **`https://tu-dominio/tienda`**. No requiere iniciar sesión y no
monta los proveedores privados del sistema. El menú **Catálogo público** abre
`/catalogo`, protegido por la sesión del local.

1. Entrar como administrador a Catálogo público → Configurar catálogo.
2. Elegir nombre, bienvenida, moneda y vigencia; indicar WhatsApp internacional
   (por ejemplo +54 9 …), activar Publicar catálogo y guardar.
3. Copiar el enlace público y compartirlo. Pausar la publicación bloquea nuevas
   consultas y pedidos; no elimina los pedidos guardados.

Los clientes buscan por nombre/código, filtran categorías, ordenan y cargan
páginas de 24 productos. Las fichas se comparten con `/tienda?producto=ID`.
Solo se publican productos activos, con stock y precio de la lista predeterminada.
Las imágenes usan endpoints públicos limitados a productos visibles del local:
portadas/miniaturas WebP y originales solo al abrir la ficha.

El carrito se conserva por catálogo en el navegador, sin archivos base64 ni datos
de contacto. Antes de continuar se validan precios, cantidades y disponibilidad.
Si algo cambió, se informa y se requiere volver a confirmar. El formulario de
nombre/teléfono/nota se abre en modal; cerrar descarta esos datos, no el carrito.

Preparar pedido crea una referencia y muestra el enlace a WhatsApp. El cliente
**debe abrir WhatsApp y tocar Enviar**. La web no puede comprobar el envío y no
lo marca como enviado/pagado. El local ve estas solicitudes en `/catalogo`, con
estados Por atender, Confirmado, Cancelado y Vencido. No reservan stock ni generan
ventas cobradas; cuando se concreta, se registra la venta en caja.

Un identificador de intento evita duplicados al reintentar una solicitud. El
registro guarda precios/moneda del momento y un estado de pago independiente;
los campos para futuras billeteras no habilitan cobros, SDKs ni proveedores.

Sin API, `/tienda` muestra el catálogo demo y su carrito. No permite enviar pedidos
reales; la configuración demo se guarda solo en este navegador.

Desplegar frontend y API juntos, incluyendo la migración aditiva 018. El boot de
la API la aplica junto a las demás migraciones históricas. Durante esta tarea no
se ejecutó MySQL. La mejora de latencia no se midió contra producción.

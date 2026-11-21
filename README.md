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
monta los proveedores privados del sistema. La publicación se administra en
**Configuración → Publicación de tienda**; las solicitudes en **Pedidos → Tienda online**.
La antigua URL `/catalogo` redirige a Configuración.

1. Entrar como administrador a Configuración → Publicación de tienda → Configurar publicación.
2. Elegir nombre, bienvenida, moneda y vigencia; indicar WhatsApp internacional
   (por ejemplo +54 9 …), activar Publicar tienda y guardar.
3. Copiar el enlace público y compartirlo. Pausar la publicación bloquea nuevas
   consultas y pedidos; no elimina los pedidos guardados.

Los clientes buscan por nombre/código, filtran categorías, ordenan y cargan
páginas de 24 productos. Los productos con imagen aparecen primero, antes de paginar, para todos los órdenes.
Las fichas se comparten con `/tienda?producto=ID`.
Solo se publican productos activos, con stock y precio de la lista predeterminada.
Las imágenes usan endpoints públicos limitados a productos visibles del local:
portadas/miniaturas WebP y originales solo al abrir la ficha. Las URLs públicas
se resuelven sobre el origen de la tienda y no requieren sesión.
En mobile: buscador fijo, grilla de dos columnas, carrito accesible con área segura
y formularios en panel inferior con campos de 16 px para evitar zoom.

El carrito se conserva por catálogo en el navegador, sin archivos base64 ni datos
de contacto. Antes de continuar se validan precios, cantidades y disponibilidad.
Si algo cambió, se informa y se requiere volver a confirmar. El formulario de
nombre/teléfono/nota se abre en modal; cerrar descarta esos datos, no el carrito.

Preparar pedido crea una referencia y muestra el enlace a WhatsApp. El cliente
**debe abrir WhatsApp y tocar Enviar**. La web no puede comprobar el envío y no
lo marca como enviado/pagado. El local ve estas solicitudes en `/pedidos`, con
estados Pendiente, En preparación, Listo para entrega, Entregado, Devolución y Cancelado.
La vigencia del enlace no cambia el estado del pedido. No reservan stock ni generan
ventas cobradas; cuando se concreta, se registra la venta en caja.

Un identificador de intento evita duplicados al reintentar una solicitud. El
registro guarda precios/moneda del momento y un estado de pago independiente;
los campos para futuras billeteras no habilitan cobros, SDKs ni proveedores.

Sin API, `/tienda` muestra el catálogo demo y su carrito. No permite enviar pedidos
reales; la configuración demo se guarda solo en este navegador.

Desplegar frontend y API juntos, incluyendo la migración aditiva 018. El boot de
la API la aplica junto a las demás migraciones históricas. Durante esta tarea no
se ejecutó MySQL. La mejora de latencia no se midió contra producción.


## Mi cuenta

El bloque Cuenta del sidebar abre `/mi-cuenta` para cualquier usuario conectado.
Muestra foto, nombre, rol, email de login y datos de contacto. Editar perfil abre
un modal con foto JPG/PNG/WebP (hasta 8 MB de origen, reducida a 512 px antes de
subir), nombre, teléfono y email de contacto. El email de contacto es independiente
del email de acceso. Las fotos requieren sesión y no aparecen en la tienda pública.
Cambiar contraseña abre un modal con contraseña actual, nueva y confirmación;
se mantienen este navegador y se cierran las demás sesiones de esa cuenta.
No se guardan contraseñas en localStorage ni se pide la contraseña de otro usuario.

El superadmin y el administrador tienen Ver como… en el sidebar y en Mi cuenta. El superadmin elige cualquier cuenta activa; el administrador solo vendedores. Elige una cuenta activa
y entra a una vista de solo lectura con un aviso permanente y Volver a mi cuenta.
La sesión del superadmin permanece como autoridad y la contraseña del vendedor
es independiente. Al entrar/salir se hace navegación completa para descartar
pantallas y consultas de la identidad anterior. En la vista no se permite editar
perfiles, contraseñas ni otros datos del sistema. Mi cuenta siempre está disponible
sin necesitar una función asignada adicional.

Desplegar junto con la API y migración aditiva 019. La validación no ejecutó MySQL
ni QA de navegador. Las pruebas de autenticación están en los repositorios API.

En Centro de cuentas, los administradores pueden crear vendedores, visitantes y
administradores. El formulario ofrece solo roles permitidos y se abre en modal.
Crear superadmins y editar cuentas de administración existentes queda reservado
al superadmin. La vista Ver como sigue siendo de solo lectura.


### Primer acceso y contraseñas temporales

Las cuentas nuevas y las contraseñas restablecidas desde Centro de cuentas deben
cambiar su contraseña temporal antes de usar el sistema. El login lleva a
`/cambiar-contrasena`, con contraseña temporal, nueva y confirmación; no se puede
omitir el paso y sí cerrar sesión. Proxy y API lo exigen incluso desde enlaces
privados directos. La sesión se renueva al completar el cambio y no vuelve a
pedirse en los siguientes accesos. La migración 021 conserva las cuentas existentes.

Ver como… también está disponible para administradores sobre vendedores; el
superadmin conserva acceso a las demás cuentas. El requisito del vendedor no
bloquea al administrador que lo consulta, y la vista no puede cambiar su contraseña.
El administrador debe haber completado su propio cambio obligatorio.
Requiere desplegar frontend/API con la migración aditiva 021. Sin MySQL ni QA de navegador.


## Apertura de caja y ventas por día

POS tiene una caja compartida por comercio. Para cobrar debe existir una apertura,
con monto inicial en efectivo y usuario autenticado. Solo puede haber una caja
abierta por comercio. Las ventas POS se asocian a esa apertura en la misma
transacción que registra el pedido; el operador se toma de la sesión del servidor.
El botón de cobro se bloquea durante el envío para evitar clics duplicados.

Quien abrió la caja o un administrador puede cerrarla indicando el efectivo
contado y una observación. El resumen separa ventas en efectivo y transferencias;
el esperado en efectivo es monto inicial + ventas en efectivo. El cierre guarda
contado, esperado, diferencia, usuarios y tickets. Si entran nuevas ventas durante
el conteo se exige revisar un resumen actualizado antes de confirmar. Se puede
abrir otro turno después del cierre, incluso el mismo día. No hay cierre automático.

Reportes incluye Ventas por día con fechas Desde/Hasta, efectivo, transferencias,
importes sin medio de pago (históricos), tickets, total y CSV; conserva el reporte
por vendedor. Solo cuenta ventas cobradas en POS, no fondos iniciales, pedidos
pendientes de WhatsApp, borradores ni cancelados. Las monedas se muestran por
separado y no se suman entre sí. También muestra el historial paginado de cierres.

El día comercial usa UTC−3 por defecto; RETAIL_UTC_OFFSET_MINUTES en la API permite
ajustarlo. Las nuevas operaciones se guardan en UTC. No se reescriben ventas
históricas ni se inventan aperturas para ellas. El template demo conserva ventas
en memoria pero no habilita aperturas/cierres o reportes reales sin la API.
Requiere frontend/API coordinados y migración aditiva 022. Sin MySQL ni QA de navegador.

## Inicio de la tienda por colecciones

En Configuración → Inicio de tienda, un administrador puede diseñar colecciones
independientes de las categorías de stock. Cada colección tiene título, portada,
encuadre con vista previa de escritorio/celular, orden en el inicio y selección
ordenada de productos. Se puede buscar por nombre/código, paginar de 24 en 24,
seleccionar todos los resultados (solo IDs), revisar los seleccionados, ordenar
con flechas o quitar la selección con confirmación. No se descargan todas las
fichas/fotos del inventario al abrir el editor.

Guardar borrador no cambia la tienda activa. Activar/Activar cambios publica una
copia del título, foto, encuadre, orden y productos en una transacción. Editar o
quitar una foto del borrador conserva la versión publicada hasta activar otra
versión válida. Pausar oculta la colección sin borrar el borrador. Se controla
la versión para evitar sobrescribir cambios de otra persona. Para activar debe
haber título, portada y al menos un producto activo con stock y precio público.
Los borradores pueden estar incompletos. No se publica contenido de ejemplo.

El inicio público muestra las colecciones activas con productos disponibles en
una grilla, sin carrusel. Cada imagen abre `/tienda?coleccion=ID&comercioId=...`.
La colección conserva búsqueda, orden y carrito; abrir/cerrar una ficha en modal
conserva la colección y la posición de lectura. Ver todos los productos y Volver
al inicio permanecen disponibles. Las colecciones vacías se ocultan al consultar
el inicio. Si no hay colecciones activas, se muestran los productos normalmente.

Las tarjetas conservan bordes redondeados y un área de foto uniforme 3:4, con encuadre centrado object-cover para llenar el espacio. El nombre reserva dos líneas y el botón queda alineado, con área táctil
de 44 px. Se mantiene la prioridad de productos con imagen. Dentro de una colección,
Selección del local respeta el orden configurado dentro de cada grupo con/sin foto.
Las portadas se optimizan a WebP con versiones de hasta 1600 px y 640 px para móvil;
los listados no contienen blobs/base64 y las imágenes se cargan bajo demanda.

Requiere desplegar junto con la API y migración aditiva 020. No se ejecutó MySQL
ni QA de navegador durante la implementación; las pruebas aisladas de publicación
están en el repositorio API.


## Tienda pública y configuración

- `/tienda` es pública y adaptable a móvil. Productos paginados, búsqueda y filtros en servidor, primero productos con foto; detalle con galería y carrito persistido por comercio.
- Configuración → Publicación de tienda: habilitar publicación, nombre, bienvenida, moneda y número de WhatsApp. Configuración → Inicio de tienda: crear colecciones con título, portada y encuadre, orden y selección paginada de productos; guardar borrador, activar y pausar. Los cambios en borrador no alteran la versión publicada.
- El checkout valida stock/precios, registra el pedido y prepara WhatsApp al teléfono del local. Pedidos → Tienda online permite gestionar Pendiente, En preparación, Listo para entrega, Entregado, Devolución y Cancelado. Abrir WhatsApp no confirma que el cliente haya enviado el mensaje.
- Las imágenes de productos y portadas publicadas usan rutas públicas del catálogo, sin sesión. Las portadas privadas/borradores siguen protegidas. No se incorporan datos ni fotografías de clientes particulares en la plantilla.
- Configurar `NEXT_PUBLIC_API_URL` en frontend y `NEXT_PUBLIC_SITE_URL` con su dominio público para enlaces y metadatos. Antes de desplegar frontend, desplegar API y sus migraciones; no habilitar la tienda hasta configurar WhatsApp y publicar productos.
- No hay cobro electrónico: el flujo actual coordina el pedido por WhatsApp. No se ejecutaron MySQL ni QA de navegador al trasladar estos cambios.

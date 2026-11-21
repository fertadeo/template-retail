# Retail local — interfaz

Un único local por instalación. Navegación: Inicio, Productos, Clientes,
Presupuestos, Biblioteca, Pedidos, Mayorista, POS, Reportes y Configuración.
No hay selector ni administración de comercios, sucursales o canales externos.
El catálogo público del local permite preparar pedidos por WhatsApp. No hay importación por URL ni sincronización con plataformas externas.

Cuenta al pie del sidebar: nombre y rol de la sesión, Mi cuenta con email y
Cerrar sesión. Operador de caja = usuario conectado. En demo se identifica
Demo local y no se simula una sesión real.

Productos: edición manual, precios por lista, stock del local, imágenes, etiquetas
QR/barras y semáforo de datos incompletos. Paginación de 40 y búsqueda en servidor.
POS prioriza código/SKU exacto y mantiene el ticket al cambiar de página.

Biblioteca: 24 medios por página, búsqueda, miniaturas diferidas y original al abrir.
Cantidad y peso registrado abarcan toda la búsqueda; se indica si faltan tamaños.

Configuración: impresora, listas de precios, categorías y centro de cuentas.
Las cuentas de vendedor pueden tener funciones del local, sin asignar sucursales.

## Editor de productos

Crear y editar abre un modal con foco contenido, cabecera y acciones fijas,
scroll interior y diseño adaptable. La galería permite agregar varias imágenes,
elegir portada y quitar fotos. Los cambios de imágenes se envían al guardar;
cancelar descarta el borrador. Escape, clic fuera, Cancelar y el botón de cierre
piden confirmar la salida, incluso si no hubo modificaciones.
Las fotos JPG/PNG/WebP de hasta 8 MB se optimizan a WebP, máximo 1600 px y
650 KiB. Se informa el progreso de guardado; un reintento reutiliza el ID del
producto y las imágenes cuya subida fue confirmada.

## Campos numéricos

Usar Input con type="number". El cero inicial aparece como placeholder="0".
Se permite vaciar y escribir decimales sin normalizar cada pulsación. Los
valores reales distintos de cero se conservan. Si cero es válido, no usar
required y convertir el vacío a cero al guardar. Las unidades van en etiquetas.

## Nombre del negocio al imprimir

El encabezado de tickets y etiquetas usa PrintSettings.businessName, editable
en Configuración → Impresora. La vista previa refleja el borrador; Guardar
configuración lo persiste por equipo. Presets y restauración de papel deben
conservar ese nombre. Escapar el texto al generar el HTML de impresión.


## Catálogo público

`/tienda` es público e independiente del back office: búsqueda por nombre/código,
categorías, orden, páginas de 24 y ficha compartible. Imágenes bajo demanda y sin
base64 en listados. Carrito persistente por catálogo; se conserva al cerrar, no
se guardan datos personales de contacto. Controles de cantidad con botones y campo
numérico editable, sin normalizar el borrador durante la escritura.

Carrito, datos de contacto y resultado viven en un modal nativo con foco contenido,
scroll interno, cabecera/pie fijos y acciones claras. El cierre de un formulario
con datos solicita confirmación y se bloquea mientras valida/guarda. La página
explica que solo prepara el mensaje: abrir WhatsApp y tocar Enviar es necesario.
Errores de conexión y cambios de precio/stock no vacían el carrito.

La publicación y el enlace para compartir están en Configuración; los pedidos de
la tienda están en Pedidos → Tienda online. `/catalogo` solo redirige a Configuración.
Los estados son Pendiente, En preparación, Listo para entrega, Entregado,
Devolución y Cancelado. El vencimiento del enlace no cambia el estado del pedido.
Configuración y edición de estado usan modales con confirmación de descarte.
Cambiar un estado no cobra ni reserva stock; la venta se registra en caja.
Las futuras billeteras tendrán un estado de pago separado, sin botones de cobro
ni proveedores ficticios en esta versión.

La tienda prioriza productos con imagen antes de paginar. En teléfonos el buscador
permanece visible, los controles tienen área táctil amplia y los modales se abren
como panel inferior respetando el teclado y las áreas seguras. Las imágenes usan
URLs públicas de la tienda sin requerir sesión ni credenciales de acceso.


## Perfil personal y consulta de cuentas

Mi cuenta se abre desde el pie del sidebar y está disponible para todos los roles.
Perfil, contacto y contraseña se consultan en una página; las ediciones viven en
modales adaptables con foco contenido, confirmación al descartar y bloqueo de
cierre/acciones durante guardado o preparación de foto. Se muestra el email de
login sin editar, separado del email de contacto. La foto se reduce y se sirve
mediante una URL privada autenticada.

Ver como… admite al superadmin sobre cualquier cuenta y al administrador sobre vendedores. Usa la misma cuenta original para autorizar
la consulta, sin pedir credenciales al vendedor. La vista muestra un aviso global
Solo lectura y Volver a mi cuenta; las escrituras se bloquean en la API, no solo
en los botones. El perfil del usuario consultado también permanece de solo lectura.

El primer acceso de cuentas nuevas o con contraseña restablecida usa un modal
obligatorio sin cierre ni Cancelar, con salida explícita Cerrar sesión. No monta
los proveedores privados del sistema antes de cambiar la contraseña.


## Caja compartida y reportes diarios

El POS muestra el estado de la caja del comercio antes de cobrar. Apertura y cierre
usan modales con campos monetarios compartidos, foco contenido, acciones fijas,
confirmación de descarte y bloqueo al guardar. Cero es válido y se muestra vacío
con placeholder 0; no se normaliza el borrador mientras se escribe. El cierre
compara efectivo esperado/contado, separa transferencias y muestra diferencias.
Reportes incorpora ventas por día y CSV, además del historial de cierres y las
ventas por vendedor existentes. Ver como conserva acceso de consulta y bloquea
las operaciones reales en la API.

## Colecciones del inicio público

Configuración → Inicio de tienda contiene el editor de colecciones. Son selecciones
editoriales; no reclasifican productos ni modifican stock. Altas y ediciones usan
un modal con foco contenido, header/footer fijos, scroll interno, confirmación al
descartar y bloqueo durante guardado/procesamiento de imagen. La portada tiene
vista previa en proporciones 4:3 de escritorio y 4:5 de celular, con encuadre ajustable.
Guardar borrador conserva lo publicado; Activar publica la versión completa.

El inicio prioriza imágenes de colecciones en dos columnas móviles y tres en
escritorio, títulos legibles sobre degradado y enlaces de toda la superficie.
No hay carruseles ni datos de ejemplo. Una colección vacía/inactiva no se ofrece.
Los productos tienen tarjetas redondeadas, fotos en un área uniforme 3:4 con object-cover centrado, texto/precio discretos
y botón de borde fino de 44 px. El buscador fijo y el carrito siguen accesibles.

Las tarjetas de tienda mantienen tamaño uniforme y botones alineados. Las fotos se amplían proporcionalmente hasta cubrir el área, recortando los bordes sobrantes. Se conservan los modales, navegación móvil y carrito accesible.

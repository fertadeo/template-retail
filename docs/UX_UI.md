# Retail local — interfaz

Un único local por instalación. Navegación: Inicio, Productos, Clientes,
Presupuestos, Biblioteca, Pedidos, Mayorista, POS, Reportes, Catálogo público y Configuración.
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

`/catalogo` es privado: publicación, enlace para compartir y pedidos por estado.
Configuración y edición de estado usan modales con confirmación de descarte.
Confirmar un pedido no cobra ni reserva stock; la venta se registra en caja.
Las futuras billeteras tendrán un estado de pago separado, sin botones de cobro
ni proveedores ficticios en esta versión.

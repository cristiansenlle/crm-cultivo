# Filtros y Reportes de Tablas

Esta mejora añade capacidades de búsqueda local y exportación de datos a formato CSV para las tablas del módulo Financiero y Analytics.

## Propuesta de Cambios

### Interfaz de Usuario (`analytics.html`)
Se modificarán los contenedores de las dos tablas ("Desglose de Ventas por Cliente" y "Historial de Transacciones de Cultivo") para incluir un encabezado div con controles:
1.  **Input de Búsqueda:** Un campo de texto para filtrar los resultados de la tabla en tiempo real (por nombre de cliente, ID de transacción, nombre de lote, etc.).
2.  **Botón de Exportación:** Un botón con el icono de descarga que disparará la función de exportación a CSV de los datos actualmente visibles.

### Lógica JavaScript (`analytics.js`)
Se añadirán nuevas variables de estado y funciones:
1.  **Variables de Búsqueda:** `customerSearchQuery` y `txSearchQuery` para mantener el estado del texto buscado.
2.  **Lógica Re-renderizado:** En las funciones `renderTable` (ahora con soporte de búsqueda para transacciones) y la parte de clientes, se aplicará un `.filter()` extra al array de transacciones y a la lista de clientes agrupados antes de generar el HTML de la tabla.
3.  **Generación de CSV:** Se creará una función utilitaria `exportToCsv(filename, rows)` o similar. Se implementarán `downloadCustomerReport()` y `downloadTransactionReport()` que recogerán los datos *filtrados* actuales y los formatearán en una cadena CSV (con cabeceras), creando un Blob y un enlace temporal para forzar la descarga del archivo.

## Plan de Verificación

### Pruebas Manuales / Subagente
-   Escribir texto en los nuevos campos de búsqueda y verificar que las tablas se filtren correctamente.
-   Hacer clic en los botones "Exportar CSV", verificar que se inicia la descarga del archivo y que el archivo contiene los datos mostrados en la pantalla, respetando los filtros activos.

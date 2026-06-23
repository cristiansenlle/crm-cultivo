# Plan de Implementación: Mejoras en POS y Reportes PDF

Este plan aborda tres solicitudes clave del usuario relacionadas con el Punto de Venta (POS) y la generación de reportes agronómicos.

## 1. POS: Cliente Casual y Nombre Personalizado
Actualmente, el POS asume clientes registrados. Se requiere que por defecto sea "Casual" y permita tipear el nombre.

### [MODIFY] `pos.html`
- Modificar la sección del "Client Selector" (selector de cliente).
- Agregar un `<input type="text" id="custom-client-name">` visible cuando la opción seleccionada es "Casual".

### [MODIFY] `pos.js`
- Actualizar la función que procesa la venta (`checkout` o similar) para que extraiga el valor de `custom-client-name`.
- Asegurar que el payload enviado a la base de datos (o n8n) incluya este nuevo campo `customer_name`.

## 2. Reporte de Ventas por Cliente
El usuario necesita visualizar las ventas agrupadas o detalladas por cliente.

### [MODIFY] `analytics.html` / `analytics.js`
- Integrar una nueva tabla o sección en los dashboards que agrupe las transacciones de ventas por el nombre del cliente.
- Si es necesario, añadir un modal específico "Ver Detalles por Cliente" en el historial de ventas del POS.

## 3. Reparación del Pasaporte de Lote (PDF)
La funcionalidad de "Generar Reporte Oficial (PDF) / Pasaporte de Lote" en la vista agronómica no hace nada.

### [MODIFY] `agronomy.html` / `agronomy.js`
- Identificar el botón que gatilla la acción de PDF.
- Integrar la librería `html2pdf.js` o `jspdf` (vía CDN) si no está presente.
- Escribir la función `generateLotPassportPDF()` que tome los datos vitales del lote (fechas, cepa, THCa/CBDa, historial de eventos) y los formatee en un documento estético y lo descargue como `.pdf`.

## Plan de Verificación
1. **POS**: Realizar una venta de prueba como "Casual" e ingresar el nombre "Juan Pérez". Verificar en consola o BBDD que se guardó el nombre.
2. **Reporte**: Entrar a Analytics y confirmar que "Juan Pérez" aparece en el desglose.
3. **PDF**: Ir a Timeline Agronómico, hacer clic en "Generar Reporte PDF" y verificar que el navegador inicie la descarga de un archivo válido.

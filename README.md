# Soporte 13GO — Actualización de categorías y canales

Se añadieron los siguientes cambios al sistema de soporte:

- Nueva categoría interna: `carga_de_contenido` (etiqueta Gmail: "Carga de contenido").
  - Plantilla sugerida por categoría: `solicitud_carga_contenido`.
  - Archivo: `data/plantillas.js` — nueva entrada `solicitud_carga_contenido` con instrucciones para solicitar carga/revisión de contenido.
  - Label legible añadido en: `js/app.js` (`CATEGORIA_LABELS`).
  - Filtro sugerido para Gmail añadido en `js/app.js` (`FILTROS_GMAIL_SUGERIDOS`).

- Nuevo canal de origen: `aplicacion_13go` (valor en selects: `aplicacion_13go`, mostrado como "Aplicación 13go").
  - Archivo: `index.html` — opción añadida al select de filtros.
  - Archivo: `js/reporte.js` — incluido en el arreglo de `canales` para métricas.

Cómo usar

- Al crear o editar entradas en la Base de conocimiento, selecciona la categoría "Carga de contenido" para usar la plantilla `solicitud_carga_contenido`.
- En los filtros de vista y reportes, puedes seleccionar el canal "Aplicación 13go" para filtrar tickets que provengan de la app.

Archivos modificados

- `data/plantillas.js` — nuevas plantillas y mappings.
- `js/app.js` — `CATEGORIA_LABELS`, `FILTROS_GMAIL_SUGERIDOS` y helper `opcionesCategorias` siguen gestionando la nueva categoría.
 - `js/app.js` — añadido `?demo=1` (modo demo) que muestra la app sin leer datos guardados en `localStorage` para facilitar demostraciones.
- `index.html` — select de canales actualizado.
- `js/reporte.js` — reportes incluyen `aplicacion_13go`.

Commit y push

A continuación se hizo commit y push de los cambios (si el repositorio remoto está configurado).

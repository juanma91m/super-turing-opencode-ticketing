---
description: Refresca el análisis de un ticket y limpia/actualiza tmp/<ticket>/ con evidencia vigente.
agent: planner
---
Refrescá el análisis del ticket $1.

Objetivo:
- releer el ticket o nueva información disponible,
- actualizar `tmp/$1/` si el proyecto usa ese workspace,
- eliminar o corregir hipótesis/evidencias obsoletas,
- dejar el workspace temporal consistente con el estado actual del análisis.

Reglas:
- En un proyecto que admite handoff, este comando con ticket concreto es pedido explícito. Un ID aislado o un proyecto review-only no lo habilitan; fuera del flujo, responder sin artefactos.
- no implementes código,
- si el proyecto no usa workflow con `tmp/$1/`, devolvé el refresh en la respuesta,
- si algo cambió, dejalo explícito,
- mantené el foco en información útil para llegar a un `verdict.md` sólido.
- con handoff activo, cargar `workflow-ticket-handoff` y actualizar también el borrador de `verdict.md` por cambios materiales de evidencia, hipótesis, alcance o solución, no solo notas auxiliares. Releer el archivo antes del cierre y reportar path/estado/pendientes; memoria y chat no lo reemplazan.

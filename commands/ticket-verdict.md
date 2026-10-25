---
description: Consolida el veredicto final de planning en tmp/<ticket>/verdict.md cuando el proyecto usa workflow de tickets.
agent: planner
---
Consolidá el `verdict.md` del ticket $1.

Objetivo:
- revisar `tmp/$1/` si existe,
- sintetizar el estado final del plan,
- dejar `tmp/$1/verdict.md` actualizado cuando el proyecto usa el patrón de handoff.

En un proyecto que admite handoff, este comando con ticket concreto es pedido explícito. Si el proyecto no lo habilita (por ejemplo review-only), entregar el veredicto en la respuesta sin crear `tmp/`; un ID aislado no lo activa.

Secciones del veredicto (archivo solo con handoff activo):
- Problema / Objetivo
- Alcance
- Estado actual
- Causa / Hipótesis vigente
- Solución propuesta
- Validación esperada

Secciones opcionales a criterio:
- Riesgos
- Evidencias
- Dudas abiertas

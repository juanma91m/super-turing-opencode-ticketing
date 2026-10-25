---
description: Consolida el veredicto final de planning en tmp/<ticket>/verdict.md cuando el proyecto usa workflow de tickets.
agent: planner
---
Consolidá el `verdict.md` del ticket $1.

Objetivo:
- revisar `tmp/$1/` si existe,
- sintetizar el estado final del plan,
- dejar `tmp/$1/verdict.md` actualizado cuando el proyecto usa el patrón de handoff.

Si el handoff local no está habilitado, entregá el veredicto en la respuesta sin crear `tmp/` ni habilitarlo por el identificador o este comando.

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

---
name: workflow-ticket-handoff
description: "Aplica al handoff de análisis e implementación por tickets solo cuando el proyecto y el pedido adoptan ese workflow; no a un ticket aislado ni a code review solamente."
---
# Skill: workflow-ticket-handoff

## Que hago
- Refuerzo un workflow reusable para trabajo guiado por tickets.
- Evito que planning, implementacion y validacion lean o escriban `tmp/<ticket>/` de forma caotica.
- Hago explicito el handoff canonico entre planner, implementador y validador.

## Cuando usarme
- Cuando el trabajo esta asociado a un ticket y el proyecto adopta workspace temporal en `tmp/<ticket>/`.
- Antes de implementar bajo ese workflow y leer su `tmp/<ticket>/verdict.md`.
- Cuando hay que decidir por donde leer contexto o que artefacto dejar al cerrar.

## Activación
- Requiere trabajo asociado a un ticket y un workflow de handoff adoptado por el proyecto y el pedido. Un identificador, un comando o un archivo viejo no lo habilitan por sí solos.
- Si el proyecto solo habilita code review, no crear `verdict.md` ni `result-dev.md` de implementación. La revisión formal conserva su propio contrato e informes.
- En tareas ad-hoc o handoff no habilitado, entregar el análisis o resultado en la respuesta; no inventar tickets ni forzar `tmp/`.
- Si el handoff es requerido y falta o está incompleto, explicitar el faltante antes de implementar; no rellenarlo con suposiciones.

## Reglas base (con el workflow activo)
- El planner mantiene `tmp/<ticket>/` vivo y curado mientras dura el analisis.
- El archivo canonico de handoff es `tmp/<ticket>/verdict.md`.
- `verdict.md` debe incluir al menos:
  - `Problema / Objetivo`
  - `Alcance`
  - `Estado actual`
  - `Causa / Hipótesis vigente`
  - `Solución propuesta`
  - `Validación esperada`
- si aporta claridad, también puede incluir:
  - `Criterios de aceptación`
  - `Escenarios clave`
  - `Estrategia de validación`
- esos bloques extra son opcionales: no forzar SDD/BDD formal en tickets triviales.
- El implementador debe leer primero `verdict.md` y luego solo la evidencia referenciada o estrictamente necesaria.
- Si el proyecto usa contexto auxiliar, `repo_findings.md` y `analysis.md` son apoyo; no reemplazan a `verdict.md`.
- Al terminar la implementacion, el implementador debe dejar `tmp/<ticket>/result-dev.md` con al menos:
  - `Cambio realizado`
  - `Deuda técnica detectada`
  - `Riesgos / impacto`
  - `Validaciones manuales recomendadas`
- cuando existan criterios o escenarios previos, conviene además dejar qué quedó cubierto, desviado o pendiente.
- El validador tecnico corre al final; no redefine el plan.

## Orden recomendado de lectura para implementacion
1. `tmp/<ticket>/verdict.md`
2. Archivos referenciados en `Evidencias`
3. `tmp/<ticket>/repo_findings.md` si existe
4. `tmp/<ticket>/analysis.md` si sigue faltando contexto
5. Resto del workspace solo si hace falta

## Salida esperada
- handoff claro entre agentes,
- menos ruido al retomar tickets,
- foco en evidencia vigente,
- cierre con artefactos consistentes.

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
- Requiere un ticket concreto y un proyecto que admita handoff. En ese proyecto, `/ticket-plan`, `/ticket-refresh`, `/ticket-verdict` o `/ticket-implement` cuentan como pedido explícito: no repreguntar si se activa ni decidir por mera conveniencia.
- Los comandos no son la única entrada: si la política local activa handoff para diagnóstico/planning sustantivo de un ticket en lenguaje natural, ese pedido lo activa sin una segunda autorización. Resolver la activación al iniciar y al cambiar el tipo de tarea; una consulta puede evolucionar a diagnóstico o plan. No imponer ese default a proyectos que no lo adoptan ni confundir un identificador con una solicitud de análisis.
- Un identificador aislado o un archivo viejo no activan handoff. Los comandos no cambian la política del proyecto: en review-only no crean artefactos de implementación, y `/ticket-code-review` conserva solo su flujo formal.
- Respetar pedidos expresos sin archivos dentro de las reglas del proyecto; si contradicen un requisito obligatorio, señalar el conflicto antes de actuar, no elegir silenciosamente.
- Si el proyecto solo habilita code review, no crear `verdict.md` ni `result-dev.md` de implementación. La revisión formal conserva su propio contrato e informes.
- En tareas sin ticket o sin activación de handoff según la política local, entregar el análisis o resultado en la respuesta; no inventar tickets ni forzar `tmp/`.
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
- Al activar el flujo, cargar esta skill y crear o actualizar un borrador mediante el helper aprobado, con las secciones mínimas y faltantes marcados como pendientes. No esperar a conocer toda la solución ni inventar datos para completar el archivo. Indicar en `Estado actual` si el handoff está en borrador, listo o bloqueado y por qué.
- Mantenerlo por hitos: evidencia material nueva, cambio de hipótesis, alcance o solución, y cierre. No reescribir por cada tool call ni duplicar dumps/logs sensibles. Reutilizar evidencia vigente y preservar decisiones todavía válidas.
- Antes de anunciar «listo para implementar» o derivar el desarrollo, escribir/actualizar `verdict.md` y releer el archivo real: comprobar ticket/path, secciones mínimas, alcance vigente, decisiones confirmadas, validación esperada y ausencia de bloqueos materiales sin resolver. No pedir otra autorización si el workflow ya está activo. Si falta acceso, falla la escritura o sigue incompleto, declarar el handoff bloqueado o en borrador; no anunciarlo listo ni implementar desde ese estado.
- Memoria durable, respuesta de chat, promesa de escribir o éxito de una llamada sin releer no reemplazan el handoff. Reportar path, estado y pendientes; si el usuario exceptuó archivos conforme al proyecto, explicitar esa excepción en vez de afirmar que existe un archivo.
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

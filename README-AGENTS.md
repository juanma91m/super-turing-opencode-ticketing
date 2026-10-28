# Ticketing Addon Agent Coupling

Este addon no reemplaza agentes base ni custom enteros. Agrega coupling mínimo para que el workflow de tickets sea usable apenas se instala.

## Guaranteed

- `plan`: siempre recibe el contexto de planning/handoff del addon.
- `build`: siempre recibe el contexto de implementación/templating del addon.

## Optional augment

Si existen en la instalación activa, también se augmentan:

- `planner`
- `master-dev`

## Mecanismos usados

- `agents/plan.md`
- `agents/build.md`
- `scripts/manage_agent_autonomy.py`

La idea es mantener la regla:

- `plan` / `build` como agentes guaranteed,
- `planner` / `master-dev` / `agent-design` como capas opcionales cuando existen.

## Activación y cierre del handoff

Cada proyecto define cuándo adopta handoff: comandos explícitos y, si su política
lo dispone, diagnóstico/planning sustantivo de un ticket en lenguaje natural.
Ticketing no impone esa activación a todos los repos ni a consultas puntuales,
IDs aislados, review-only o pedidos sin archivos permitidos por el proyecto.

Con el flujo activo, planner carga `workflow-ticket-handoff`, inicia un borrador
temprano con faltantes explícitos y lo mantiene por hitos materiales. Antes de
declarar listo para desarrollo escribe y relee el verdict real: ticket/path,
secciones, alcance vigente, decisiones, validación y bloqueos. Escritura fallida
o análisis incompleto se informa como borrador/bloqueado, sin segunda aprobación
ceremonial ni sustitución por Engram/chat. El implementador no pasa por alto un
handoff requerido ausente o incompleto. No se amplían permisos, modelos o tools.

Para actualizar agentes compuestos, usar recomposición desde Core conservando
Knowledge y especializaciones locales, o el ciclo remove/apply del dueño. Un
`apply` aislado sobre un marcador existente no actualiza ese bloque. No copiar un
planner base encima del compuesto ni usar el instalador completo para arrastrar
configuración MCP o trabajo ajeno. Los tests de contrato/fixtures prueban texto,
composición y escritura local, no obediencia del modelo ni calidad del diagnóstico.

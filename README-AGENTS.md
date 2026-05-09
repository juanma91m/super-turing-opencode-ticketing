# Ticketing Addon Agent Coupling

Este addon no reemplaza agentes base ni custom enteros. Agrega coupling mínimo para que el workflow de tickets y templating sea usable apenas se instala.

## Guaranteed

- `plan`: siempre recibe el contexto de planning/handoff del addon.
- `build`: siempre recibe el contexto de implementación/templating del addon.

## Optional augment

Si existen en la instalación activa, también se augmentan:

- `planner`
- `master-dev`
- `agent-design`

## Mecanismos usados

- `agents/plan.md`
- `agents/build.md`
- `plugins/ticketing-coupling.ts`
- `scripts/manage_agent_autonomy.py`

La idea es mantener la regla:

- `plan` / `build` como agentes guaranteed,
- `planner` / `master-dev` / `agent-design` como capas opcionales cuando existen.

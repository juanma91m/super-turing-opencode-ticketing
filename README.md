# super-turing-opencode-ticketing

Extensión separada del stack base `super-turing-opencode` para todo lo relativo a:

- Jira,
- workflows de tickets,
- handoffs tipo `verdict.md` / `result-dev.md`,
- templating y scaffolding de capas locales por proyecto.

## Qué concentra

- comandos `/ticket-*`
- helpers de Jira (`jira_helper.sh`, `jira_api_read.py`)
- skill `workflow-ticket-handoff`
- plugin de acoplamiento `plugins/ticketing-coupling.ts` para que `plan`/`planner` y `build`/`master-dev`/`agent-design` usen el workflow cuando el addon esté instalado
- overlays directos para `agents/plan.md` y `agents/build.md`
- patch aditivo sobre `planner`, `master-dev` y `agent-design` si existen en la instalación activa
- assets de templating/local overlays:
  - `CONTEXT7-TECH-CATALOG.md`
  - `LOCAL-OVERLAY-TEMPLATE.md`
  - `PLAYBOOK-LOCAL-OVERLAYS.md`
  - `commands/init-project-agent-layer.md`
  - `commands/check-local-overlays.md`
  - `scripts/check_local_overlays.sh`
  - `scripts/check_local_overlays.py`
  - `skills/overlays-locales-opencode/SKILL.md`

## Objetivo

Mantener el stack base más genérico y reusable, dejando fuera de él los workflows y plantillas que solo aplican cuando un proyecto adopta Jira, handoffs por ticket o scaffolding de capas locales específicas.

## Acoplamiento de agentes

El addon está pensado para funcionar sin depender de skills manuales extra:

- `plan` siempre recibe la guía base del workflow de tickets.
- Si existe `planner`, también recibe esa misma guía.
- `build` siempre recibe la guía de implementación + templating.
- Si existen `master-dev` y `agent-design`, también reciben esa misma guía.

Los comandos del addon siguen la misma política de fallback:

- planning/handoff usa `plan` como agente guaranteed,
- implementación y templating usan `build` como agente guaranteed,
- `planner`, `master-dev` y `agent-design` quedan como augment opcional cuando existen en la instalación activa.

Ese acoplamiento se inyecta desde `plugins/ticketing-coupling.ts` vía `experimental.chat.system.transform`.

Además, los scripts del addon aplican una capa de autonomía mínima:

- siempre instalan overlays para `plan` y `build`,
- y si en la instalación activa existen `planner`, `master-dev` o `agent-design`, les agregan un bloque aditivo con el contexto del workflow de tickets y templating.

## Instalación rápida

Este repo incluye un mini bundle portable. Para instalarlo sobre `~/.config/opencode`:

```bash
bash scripts/install-opencode-ticketing.sh
```

Para sync incremental:

```bash
bash scripts/sync-opencode-ticketing.sh --status
bash scripts/sync-opencode-ticketing.sh
```

Para ver el estado instalado:

```bash
bash scripts/status.sh
```

Para desinstalar:

```bash
bash scripts/uninstall.sh
```

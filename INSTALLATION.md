# Installation

Esta guía documenta el flujo soportado del addon `super-turing-opencode-ticketing`.

## Qué instala

- assets de Jira y workflow de tickets,
- comandos y helpers de workflow por tickets,
- plugin de naming automático para sesiones de `planner` y `code-reviewer`,
- overlays directos para `agents/plan.md` y `agents/build.md`,
- augment opcional sobre `planner` y `master-dev` si existen en la instalación activa,
- wiring de Atlassian Rovo con exposición read-only mínima para `planner`.

## Instalación rápida

Requisito de bootstrap: `python3`.

```bash
git clone git@github-juanma91m-v2:juanma91m/super-turing-opencode-ticketing.git
cd super-turing-opencode-ticketing
bash scripts/install.sh
```

## Sync incremental

```bash
bash scripts/sync-opencode-ticketing.sh --status
bash scripts/sync-opencode-ticketing.sh
```

## Validación

```bash
bash scripts/status.sh
```

Esperado si quedó bien instalado:

- `obsolete_ticketing_coupling_plugin_present=no`
- `ticket_session_title_plugin_present=yes`
- `plan_ticketing_guidance_present=yes`
- `build_ticketing_guidance_present=yes`
- `planner_ticketing_augmented=yes|no` según exista
- `master_dev_ticketing_augmented=yes|no` según exista
- `atlassian_rovo_globally_hidden=yes`
- `planner_rovo_read_tools_only=yes`

El scaffolding de overlays y la integración opcional con CodeGraph pertenecen
al core `opencode-stack`; este addon no instala CodeGraph ni administra sus índices.

El MCP queda registrado para OAuth, pero sus tools se ocultan globalmente.
`planner` recibe únicamente `search`, `fetch`, `getJiraIssue` y
`getConfluencePage`; las operaciones de escritura no se exponen al modelo.

## Desinstalación

```bash
bash scripts/uninstall.sh
```

Esto:

- remueve los assets administrados,
- saca los bloques de autonomía opcional en `planner` y `master-dev`,
- retira el wiring MCP/tools de Ticketing cuando sigue coincidiendo con el fragmento administrado,
- remueve el marker `.opencode-ticketing-addon.json`.

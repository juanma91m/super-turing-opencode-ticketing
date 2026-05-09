# Installation

Esta guía documenta el flujo soportado del addon `super-turing-opencode-ticketing`.

## Qué instala

- assets de Jira y workflow de tickets,
- assets de templating/scaffolding de capas locales,
- un plugin de coupling para que `plan` y `build` usen el addon siempre,
- overlays directos para `agents/plan.md` y `agents/build.md`,
- augment opcional sobre `planner`, `master-dev` y `agent-design` si existen en la instalación activa.

## Instalación rápida

```bash
git clone git@github-juanma91m-v2:juanma91m/super-turing-opencode-ticketing.git
cd super-turing-opencode-ticketing
bash scripts/install-opencode-ticketing.sh
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

- `ticketing_coupling_plugin_present=yes`
- `plan_ticketing_overlay_present=yes`
- `build_ticketing_overlay_present=yes`
- `planner_ticketing_augmented=yes|no` según exista
- `master_dev_ticketing_augmented=yes|no` según exista
- `agent_design_ticketing_augmented=yes|no` según exista

## Desinstalación

```bash
bash scripts/uninstall.sh
```

Esto:

- remueve los assets administrados,
- saca los bloques de autonomía opcional en `planner`, `master-dev` y `agent-design`,
- remueve el marker `.opencode-ticketing-addon.json`.

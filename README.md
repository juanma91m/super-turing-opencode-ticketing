# super-turing-opencode-ticketing

Portable OpenCode addon for Jira and ticket workflows, extending `super-turing-opencode` with commands, helpers and optional agent augmentation.

Extensión separada del stack base `super-turing-opencode` para todo lo relativo a:

- Jira,
- workflows de tickets,
- handoffs tipo `verdict.md` / `result-dev.md`.

## Qué concentra

- comandos `/ticket-plan|refresh|verdict|implement|validate|code-review`
- naming automático de sesiones para análisis con `planner` y reviews con `code-reviewer` (`plugins/ticket-session-title.ts`)
- helpers de Jira (`jira_helper.sh`, `jira_api_read.py`) — REST API, 100% lectura contra Jira; la escritura es local, sandboxeada a `tmp/<ticket>/`
- MCP `atlassian-rovo` (`mcp/atlassian-rovo.json`, remoto vía OAuth) — el instalador lo mergea en `~/.config/opencode/opencode.json`, oculta globalmente `atlassian-rovo_*` y habilita para `planner` solo search/fetch y las lecturas puntuales de Jira/Confluence
- skill `workflow-ticket-handoff`
- overlays directos para `agents/plan.md` y `agents/build.md`
- patch aditivo sobre `planner` y `master-dev` si existen en la instalación activa
- marker de instalación con metadatos suficientes para que el stack base pueda recomponer agentes aditivos sin absorber lógica del addon

El scaffolding y la auditoría de overlays locales pertenecen al core
`opencode-stack`. CodeGraph conserva el ownership de sus wrappers, MCP, runtime
e índices.

## Objetivo

Mantener el stack base genérico y reusable, dejando fuera de él Jira y los workflows que solo aplican cuando un proyecto adopta handoffs por ticket.

## Acoplamiento de agentes

El addon está pensado para funcionar sin depender de skills manuales extra:

- `plan` siempre recibe la guía base del workflow de tickets.
- Si existe `planner`, también recibe esa misma guía.
- `build` siempre recibe la guía de implementación.
- Si existe `master-dev`, también recibe esa misma guía.

Los comandos del addon siguen la misma política de fallback:

- planning/handoff usa `plan` como agente guaranteed,
- implementación usa `build` como agente guaranteed,
- `planner` y `master-dev` quedan como augment opcional cuando existen en la instalación activa.

Los scripts del addon aplican una capa de autonomía mínima:

- siempre instalan overlays para `plan` y `build`,
- y si en la instalación activa existen `planner` o `master-dev`, les agregan un bloque aditivo con el contexto del workflow de tickets.

El plugin runtime `ticketing-coupling.ts` fue retirado porque duplicaba esas
mismas reglas en cada turno.

## Títulos de sesión

El plugin `ticket-session-title.ts` nombra sesiones principales todavía sin
título manual:

- `planner`: `Análisis <TICKET> <breve descripción>` o `Análisis <breve descripción>`;
- `code-reviewer` con link/numero de PR: `Review PR <NUM_PR> - <TICKET>`;
- `code-reviewer` con ramas: `Review PR <DESTINO> <- <ORIGEN> - <TICKET>`.

El sufijo de ticket se omite si no fue informado o si alguna rama ya lo
contiene. El plugin no renombra sesiones hijas ni pisa títulos manuales y su
fallo nunca bloquea el prompt.

## Instalación rápida

Este repo incluye un mini bundle portable. Para instalarlo sobre `~/.config/opencode`:

```bash
bash scripts/install.sh
```

`scripts/install.sh` es el contrato estable usado por el instalador completo de
`super-turing-opencode`; delega al lifecycle interno del addon. El entrypoint
histórico `scripts/install-opencode-ticketing.sh` se conserva por compatibilidad.

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

# Changelog

## [Unreleased]

- Se agrega `ticket-session-title.ts` para nombrar automáticamente análisis de `planner` y reviews de `code-reviewer` sin pisar títulos manuales ni sesiones hijas.
- Se corrige el arranque de OpenCode: el archivo autodetectado del plugin vuelve a exponer únicamente la factory `default`; los helpers se mueven fuera de `plugins/` porque el loader interpreta cada export como un plugin.
- El addon pasa a ser el único dueño canónico de Jira, `/ticket-*`, `workflow-ticket-handoff` y los helpers asociados.
- `ticket-code-review` se incorpora al manifest del addon.
- Scaffolding y auditoría de overlays, templates, catálogo Context7 y su playbook salen del addon y vuelven al core `opencode-stack`.
- Los comandos conservan los roles custom `planner`, `master-dev`, `dev-test` y `code-reviewer` del stack del usuario.
- Se retira `ticketing-coupling.ts`: duplicaba en runtime reglas ya presentes en los overlays/augments instalados.
- Ticketing deja de augmentar `agent-design`; ese rol obtiene las reglas de scaffolding desde el core.
- El instalador pasa a ser dueño efectivo del wiring de Atlassian Rovo y aplica deny-by-default a `atlassian-rovo_*`, habilitando en `planner` solo las cuatro tools read-only observadas en uso real.

- `mcp/atlassian-rovo.json`: MCP remoto de Jira/Confluence (Atlassian Rovo, OAuth, search/fetch read-only) — se mergea en la clave `mcp` global de `~/.config/opencode/opencode.json`. Antes vivía solo en el deploy de una máquina puntual, sin versionar en ningún repo; queda acá porque es integración Atlassian/Jira, el dominio de este addon.
- `scripts/preflight.sh` valida Python antes de que la distribución modifique el target.

## [0.1.2] - 2026-08-16

### Added

- `scripts/install.sh` como contrato estable para orquestadores de distribución; delega al lifecycle interno sin duplicarlo.

## [0.1.1] - 2026-08-15

### Changed

- `init-project-agent-layer` detecta de forma opcional el addon global `super-turing-opencode-codegraph`,
- el bootstrap puede inicializar o adoptar un índice CodeGraph mediante su wrapper dueño,
- se preserva el boundary: ticketing sigue siendo dueño del generador y CodeGraph de runtime, MCP, wrappers e índices.

# Changelog

## [Unreleased]

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

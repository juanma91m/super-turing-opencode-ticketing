# Changelog

## [Unreleased]

- Punto 6, etapa A: las plantillas opcionales `plan/build` condicionan solo su referencia a `analisis-tecnico-evidencia`; no es paso rutinario ni cambia activación de handoff, helpers, permisos o bloques de autonomía. Sin despliegue ni reemplazo de agentes instalados.

- Punto 3: `/ticket-code-review` remite al procedimiento compartido y al contrato local de Jira/helper/storage; conserva entradas y routing, no amplía permisos ni introduce fallback global o handoff de implementación.

- Un comando específico con ticket concreto es pedido explícito en proyectos que admiten handoff; un ID aislado y review-only no lo activan. Se elimina la decisión por conveniencia del modelo.
- `planner-helpers/ticketing.json` declara la interfaz Jira aprobada para el ejecutor de análisis, con argumentos/sandbox metadata y sin duplicar el helper ni acceder a credenciales crudas.

- `workflow-ticket-handoff` recibe metadata y activación explícita: ticket/comando/archivo viejo no habilitan el handoff por sí solos, y code review conserva un flujo separado.
- los comandos de planning/implementación respetan el modo de cada proyecto y entregan respuesta sin artefactos cuando no hay handoff adoptado; no se cambian helpers, permisos ni el procedimiento formal de review.
- se agregan regresiones del contrato de activación y sus seis secciones mínimas.

- Se actualizan los agentes globales aditivos de `openai/gpt-5.6-sol` a `openai/gpt-6.1-sol`.
- Se migra Atlassian Rovo MCP de v1 a v2 y se reemplazan las tools de lectura
  obsoletas de `planner` por `getAccessibleAtlassianResources`, `search`,
  `getJiraIssue` y `getConfluenceContent`.
- Se incorpora el scope v2 `write:confluence:agent-interface` sin exposición
  global: solo agentes consumidores con allowlist propia pueden solicitar una
  edición remota.
- Se documenta que el consentimiento dinámico de Atlassian puede ampliar los
  scopes solicitados y que la allowlist de tools sigue siendo el guardrail
  efectivo.
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

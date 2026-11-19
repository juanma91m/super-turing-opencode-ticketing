# super-turing-opencode-ticketing

## V2 vigente — 2026-11-19

El harness gestionado 2.2.7 está activado: títulos, métricas por historial nativo,
catálogo Rovo y permisos por rol forman parte de la composición auditada. No se
activan handoffs por detectar IDs, no se publican tickets para probar instalación
y OAuth no amplía ACLs. Actualizar conserva handoffs/artefactos de los proyectos.
Los instaladores shell de esta guía son V1; V2 se actualiza coordinadamente desde
Core con `v2/general.mjs`, sin escribir configuración OAuth/credenciales por arrastre.

Portable OpenCode addon for Jira and ticket workflows, extending `super-turing-opencode` with commands, helpers and optional agent augmentation.

Extensión separada del stack base `super-turing-opencode` para todo lo relativo a:

- Jira,
- workflows de tickets,
- handoffs tipo `verdict.md` / `result-dev.md`.

## Qué concentra

- comandos `/ticket-plan|refresh|verdict|implement|validate|code-review`
- naming automático de sesiones para análisis con `planner` y reviews con `code-reviewer` (`plugins/ticket-session-title.ts`)
- helpers de Jira (`jira_helper.sh`, `jira_api_read.py`) — REST API, 100% lectura contra Jira; la escritura es local, sandboxeada a `tmp/<ticket>/`
- MCP v2 `atlassian-rovo` (`mcp/atlassian-rovo.json`, remoto vía OAuth) — el instalador lo mergea en `~/.config/opencode/opencode.json`, oculta globalmente `atlassian-rovo_*` y habilita para `planner` solo resolución de sitio, búsqueda y lecturas puntuales de Jira/Confluence; `code-reviewer` recibe resolución de sitio, búsqueda y lectura de tickets Jira en todos los proyectos
- skill `workflow-ticket-handoff`
- overlays directos para `agents/plan.md` y `agents/build.md`
- patch aditivo sobre `planner` y `master-dev` si existen en la instalación activa
- marker de instalación con metadatos suficientes para que el stack base pueda recomponer agentes aditivos sin absorber lógica del addon

### Jira read-only para code-reviewer

La lectura Jira de `code-reviewer` es global con el addon instalado: no requiere
que el repo adopte handoff ni cree `tmp/<ticket>/`. Permite contrastar descripción,
criterios y comentarios del ticket con el desarrollo, usando `getJiraIssue` con
campos acotados (incluido `comment` cuando corresponda). La conversación del PR
no sustituye la del ticket. Declarar comentarios truncados/paginación pendiente;
no prometer cobertura completa ni inventar tools. Los helpers locales aprobados
conservan sus contratos y storage. No se exponen mutaciones Jira ni Confluence
a este rol; el acceso real sigue dependiendo de OAuth y permisos del sitio.

### Handoff local sin dependencia de Jira

Con el workflow activo, `planner` crea y actualiza el archivo mediante
`python3 ~/.config/opencode/scripts/planner_shell.py helper jira verdict <ticket> --content '<contenido literal>'`.
`verdict`, `note`, `write`, `mkdir` y `delete` son operaciones de workspace local:
no cargan archivos de entorno, no exigen credenciales Jira y no acceden a la red.
Conservan los límites del broker y del sandbox `tmp/`; no habilitan Edit ni shell
general. Las consultas remotas siguen usando su autenticación aprobada habitual.
El `--help` del broker permite descubrir las operaciones registradas. Si falla,
informar el error concreto; una respuesta de chat no reemplaza escribir y releer
el handoff. No se necesita cambiar de rol para guardar un verdict.

El scaffolding y la auditoría de overlays locales pertenecen al core
`opencode-stack`. CodeGraph conserva el ownership de sus wrappers, MCP, runtime
e índices.

La configuración declara únicamente lectura Jira/Confluence, búsqueda Rovo y
escritura de contenido Confluence. Sin embargo, el consentimiento dinámico de
Atlassian MCP v2 puede mostrar un conjunto de scopes más amplio y no debe
tratarse como frontera técnica. El control efectivo es deny-by-default sobre
`atlassian-rovo_*`: cada agente consumidor debe declarar una allowlist propia y
conservar confirmación interactiva para la mutación remota.

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

### Piloto OpenCode V2

La [adaptación V2](v2/README.md) ya implementa wiring Rovo por rol, port de naming
y composición aditiva sobre Knowledge, sin ejecutar el instalador V1. Pasaron
21 casos nativos con fixtures y se contrastó metadata del wiring actual. Ticketing
ya se aplicó al workshop, pero el intento OAuth real fue rechazado. Se preparó
una [compatibilidad DCR nativa](v2/OAUTH-COMPATIBILITY.md): el operador la aplicó y
confirmó DCR, pero el rechazo real persiste. El operador autorizó agregar sólo
read:account/email: se preparó una opción opt-in con backup y pruebas, sin aplicarla
al cliente abierto ni cambiar V1. El login y las lecturas reales siguen pendientes.
La incorporación es opt-in, con el cliente cerrado, mediante el tooling de
migración del stack base. No copiar tokens, activar handoff global ni ampliar
permisos por el consentimiento OAuth.

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

# Ticketing sobre OpenCode V2 oficial

## Estado

El aporte nativo al candidato general está en `v2/general.mjs`/`general-assets.py`:
sin manipular headers de otros agentes o asumir workshop-guard, conserva ACL,
autonomía, naming y helper/skill propios. Requiere wiring Rovo explícito para no
restaurar por defecto un override OAuth distinto del aprobado. Validado en
fixtures compuestas, no nuevo despliegue o llamadas Jira reales. Ver
`opencode-stack/v2/general/COMPOSED.md`; el estado humano siguiente es del workshop.

Sonda Confluence posterior: `selected-server.mjs` expone selección metadata-only
del wiring nativo aprobado para el helper operador de Documents, con ACL/scopes
sin normalizar ni ampliar. La sonda no habilita writers y ambas capturas necesarias
ya terminaron; no repetirlas por ritual. El coordinador general usa confluenceReferences
y confluenceWrites: delegación readonly de guías/espacio más los dos mutadores nativos
originales sólo Documenter con ask, como V1. No escritor/protocolo prepare/commit
nuevo ni bloqueo por falta de outputSchema. Las referencias conservan read:allow,
sitio UUID/hostname/URL y espacio ID/key; no ask/ID-only añadidos. Los roles técnicos
conservan su ACL anterior; catálogo/actor y permisos nativos probados con MCP
simulado, sin publicación real ni nuevo despliegue/OAuth/scope. Contrato y límites
en `super-turing-opencode-documents/v2/confluence/README.md`.

Adaptación aplicada al workshop. **El operador confirmó que el MCP funcionó tras
aplicar oauth-discovery y completar una autorización nueva.** El plan local
confirma el modo resource-metadata; no consulta conexión ni tools, por lo que el
éxito real está respaldado por el operador. Una captura posterior confirma Connected
y getAccessibleAtlassianResources real OK con un recurso accesible. Una segunda
captura confirma search sin error (cero resultados) y getJiraIssue exitoso sobre
un ticket autorizado. Otra captura confirma búsqueda Confluence con resultado y
getConfluenceContent Markdown exitoso: **prueba básica real Jira/Confluence aprobada**.
El primer search Confluence falló (tabla informa DNS), el siguiente funcionó;
no equivale a validar disponibilidad continua ni imágenes/adjuntos. La búsqueda
Jira no validó recuperación por clave. El ajuste por agente
queda para después: no se ampliaron herramientas. V1 y credenciales intactas.

CIMD, DCR y luego read:account/email habían fallado después de Aceptar, en Chrome
y navegador integrado, desde una terminal Debian independiente. Ni cambiar DCR
ni sumar esos dos scopes bastó. No se cambiaron políticas de organización ni se
resolvió todavía la doble apertura del enlace; es un síntoma separado.

**Hallazgo posterior:** el SDK 1.29.0 de la fuente V1 prioriza scopes publicados
por el recurso antes del string de config; V2 pasa ese string como override. Por
eso la paridad de archivos no probaba paridad del consentimiento efectivo. Quedó
aplicado `oauth-discovery --client-closed`, que quita sólo ese override y restaura
discovery nativo, sin cambiar herramientas ni roles. Puede solicitar consentimiento
más amplio según Atlassian, como la selección del SDK V1; revisar la pantalla.
Pasaron 66 tests migración, 18 addon, 21 casos Ticketing y cinco modos OAuth locales.
El cambio resolvió el login en el reintento del operador, no demuestra una causa
interna de Atlassian ni un fix universal; ver OAUTH-COMPATIBILITY.md.

Se compone encima de Knowledge, Context7 y libnotify: **15 agentes, 19 skills y
11 comandos de addons** (cinco Knowledge y seis Ticketing). No reemplaza agentes
existentes plan/build ni sus bloques de Knowledge; sus plantillas son fallback,
como en el instalador V1. La autonomía se agrega sólo a planner/master-dev.

## Contrato y ownership

Este addon mantiene sus assets, política Rovo, naming, helper y skill. La base
coordina el perfil y actualizaciones conocidas, sin absorber Jira o dominio de
proyecto. No se ejecuta el instalador V1 sobre V2 ni se trae Background.

### Rovo: permisos por rol, no por alcance del consentimiento

| Actor | Tools permitidas |
|---|---|
| planner | getAccessibleAtlassianResources, search, getJiraIssue, getConfluenceContent |
| code-reviewer | getAccessibleAtlassianResources, search, getJiraIssue |
| documenter, sólo composición general Documents | lecturas sitio/contenido y referencias guía/espacio allow; createConfluenceContent/updateConfluenceContent ask como V1 |
| demás roles | ninguna |

Los IDs efectivos conservan el prefijo `atlassian-rovo_`. El servidor es el MCP
v2 remoto canónico; Code Mode está desactivado. Todas sus herramientas se niegan
por defecto y sólo se permiten por nombre las lecturas revisadas; la composición
general Documents agrega los dos writes nativos originales sólo Doc con ask. La
metadata de permisos y el catálogo efectivo se probaron en el host nativo.
Mutaciones y tools nuevas no reciben grants por wildcard.

La baseline OAuth conserva el fragmento vigente, que **incluye escritura
Confluence**. El consentimiento dinámico puede mostrar permisos más amplios; no
se lo trata como ACL del cliente. En el workshop histórico ningún actor puede ejecutar
mutaciones; en general sólo Doc recupera sus dos writes Confluence V1 con ask.
Jira/delete/admin siguen denegados. La allowlist y los permisos del sitio siguen
siendo necesarios aunque OAuth resulte exitoso. No ampliar scopes ni herramientas
por ensayo, ni aceptar un consentimiento inesperado sin revisarlo. El opt-in
discovery descrito arriba corrige una diferencia de selección confirmada y no
habilita más herramientas; su request se deriva del proveedor, no del string fijo.

`preflight.py` emite sólo metadata seleccionada del config actual. En esta máquina
se confirmó endpoint/request canónicos, servidor habilitado, ocultamiento global
y las allowlists 4/3. No lee almacenes OAuth ni archivos de entorno. Configuraciones
distintas requieren reconciliación explícita, no copia de valores sensibles.

### Handoff: local, opt-in y por broker

Se reutilizan `jira_helper.sh`, `jira_api_read.py`, el contrato de planner-helpers
y la skill canónicos, incluidos los cambios actuales del addon. Escribir/releer
un verdict local no inicializa autenticación, no carga envs y no requiere Jira.
Las operaciones remotas conservan su mecanismo aprobado de autenticación; no se
preparan credenciales ni env files para demostrar handoff.

Tener un ID, abrir code review o instalar el addon **no activa** implementación
ni handoff. Manda la política del proyecto y el pedido. La activación sigue siendo
contrato de instrucciones/workflow, no una ACL nueva inventada por el port.
La frontera técnica valida shell literal mediante el broker canónico y conserva
su sandbox de metadata bajo `tmp/`, sin conceder Edit ni shell general al planner.
No es un sandbox OS ni una certificación general de todos los artefactos del repo.

### Naming

`plugins/titles` usa sólo `@opencode/plugin` y el builder puro existente en
`lib/ticket-session-title.ts`, sin modificarlo. Toma el actor ejecutor del hook
context y texto original de usuarios presentes en la ventana del modelo; no el
último steer futuro ni resultados de tools/synthetic. Conserva títulos manuales,
omite hijos y falla best-effort sin bloquear prompts. V2 permite título ausente;
eso se considera inicial. Texto marcado private se omite, para no trasladarlo a
un título persistido. No se genera un modelo auxiliar para construir el naming.

El workshop conserva títulos existentes en vez de imponer su título fijo de
fixture, para no pisar el naming del addon. Se probaron casos nativos de análisis,
PR/ramas, título manual y `/ticket-plan` con override de actor. La omisión de hijos
está cubierta por tests unitarios; naming/autotitle sin la frontera del workshop
y otros lifecycle cases todavía deben comprobarse antes del corte global.

## Implementación y actualización

- `assets.py`: render puro/aditivo de bytes, sin instalaciones, auth ni red.
  Conserva reglas Rovo explícitas del caller y no duplica YAML. Incluye recursos
  completos de skills, rechazando symlinks.
- `config.mjs` / `rovo-tools.json`: wiring nativo y clasificación contrastada con
  `scripts/configure_ticketing.py`; roles distintos no se normalizan.
- `composition.mjs`: recibe la composición previa en vez de leer archivos del
  operador como una baseline nueva. Conserva Knowledge, CLI, app/índice y pins.
- `check-helper.py`: sólo valida la vía broker/jira, no ejecuta helpers ni carga
  envs para conceder permisos. Convive con el validador Knowledge.
- `inspect.mjs`: chequeo nativo inyectable usado tanto por el smoke como por el
  launcher. La ausencia de OAuth no se simula como conexión exitosa.
- El coordinador usa `.pre-ticketing.bak` además de backups Knowledge/Context7,
  compara el lote antes de escribir y rechaza drift ajeno. Los reemplazos son
  atómicos por archivo, **no una transacción FS global**.

## Validación realizada

Desde el addon:

```bash
PYTHONDONTWRITEBYTECODE=1 TMPDIR=/tmp/opencode python3 -m unittest discover -s tests -v
node --test tests/ticket-session-title.test.ts v2/test/*.test.mjs
```

Desde el stack base canónico:

```bash
node --test migrations/v2/test/*.test.mjs
node migrations/v2/smoke-ticketing.mjs
node migrations/v2/ticketing.mjs plan
```

Veintiún casos nativos pasaron con MCPs y modelo locales ficticios, sin requests
a Jira/Confluence ni uso de tokens reales: resolución/búsqueda/issue/Confluence
permitidos según rol, ausencia de permisos en otros actores, mutaciones y tools
desconocidas bloqueadas antes del backend, descubrimiento del broker por --help,
naming, handoff escrito/releído/
actualizado/releído, result-dev, Edit/traversal/symlink denegados. No se modificó
la app del fixture. Instalar y consultar un ID aislado no crearon `tmp/` en el caso
simulado; eso no prueba obediencia universal de un proveedor real.

La lectura usa el input nativo V2 `path`, no el `filePath` legacy. Se comprueba el
contenido devuelto por ambas relecturas (borrador y actualizado), no sólo el número
de tool calls o la existencia final del archivo.

Además se comprobó la ruta nativa de HTTP 401 contra un servidor sólo loopback:
el inspector informa Rovo fallido/no conectado y no bloquea la verificación de
Knowledge ni simula autenticación. Ese fixture desactiva OAuth expresamente para
no abrir navegador ni registrar clientes. El estado needs-auth también se cubre
por unidad; OAuth real sigue pendiente del operador.

La matriz Rovo convivió con Engram/Context7 y se ejecutó el inspector completo de
Knowledge con la extensión explícita. Pasó `debug config --standalone` del fixture.
La suite prueba upgrade conocido Knowledge→Ticketing, idempotencia y rechazo de
drift antes de escribir agentes/helpers. Knowledge real siguió pasando verify
después de compartir su selección de perfil, sin activar Rovo.

## Incorporación al piloto

**Cerrar primero el cliente del workshop V2**, no producción V1. No se matan
procesos ajenos. `--client-closed` es confirmación del operador, no aislamiento OS.

```bash
node "$HOME/.local/src/opencode-stack/migrations/v2/ticketing.mjs" plan
node "$HOME/.local/src/opencode-stack/migrations/v2/ticketing.mjs" apply --client-closed
node "$HOME/.local/src/opencode-stack/migrations/v2/ticketing.mjs" chat
```

Apply configura el Rovo real y comprueba su estado de conexión, **pero no ejecuta
herramientas Jira ni autentica automáticamente**. Un estado pendiente de auth no
certifica acceso. Si lo necesita, abrir el panel MCP del cliente (`/mcps`) y
autenticar `atlassian-rovo` con la cuenta/sitio correctos. Se usa OAuth nativo V2,
sin copiar tokens de V1, resolver credenciales desde tools ni pegarlas en el chat.
Revisar el consentimiento, especialmente los scopes más amplios que las tools
de lectura del perfil.

Primera prueba real: con planner pedir sólo resolución de recursos accesibles
mediante `getAccessibleAtlassianResources`, **sin leer tickets/Confluence, publicar
ni guardar resultados**. Para probar naming usar una sesión nueva sin título
manual. El tab existente se conserva. Handoff local y mutaciones denegadas ya
están cubiertos en fixtures: no inventar un ticket real ni poblar un repo de
artefactos por ensayo. Una lectura de issue posterior necesita un ID autorizado.

Después de incorporar, usar `ticketing.mjs chat|verify` para mantener todos los
addons del perfil. No volver al launcher Knowledge aislado para recomponerlo.
La instalación global, overlays, delegación nativa y corte/rollback siguen sus
puertas de migración propias; esta prueba no equivale al despliegue final.
# Métricas de fases V2

El owner incorpora `ticket-metrics` y el wrapper report compatible; ver
[METRICS.md](METRICS.md). Capture usa API pública almacenada y proyección en RAM,
no CLI export V1/SQL/dumps. Preserva latest/history/summary y no activa handoff por
rutina. El plugin se empaqueta en la composición general y se valida por metadata
versionada, sin romper revisiones archivadas previas. La instalación activa V1 no
se cambia por esta fuente; no ejecutar el instalador V1 para este incremento.

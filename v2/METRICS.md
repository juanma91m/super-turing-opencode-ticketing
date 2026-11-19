# Ticket metrics — ownership y adaptación V2

Owner V2: **Ticketing**, por ser métricas genéricas de fases de tickets. No pertenece
a Higyrus ni a Core. El helper legacy instalado se inspeccionó como referencia de
comportamiento; no se movió/modificó V1 ni se ejecutó su export/list. Esta adaptación
está en fuentes V2 y en la fundación sucesora, no en la configuración activa V1.

## Interfaz

Tool pública `ticket-metrics` con `operation: capture|report`, `ticket`, y opciones
`phase`, `session`, `summary`, `maxCount` (20 por defecto), `projectRoot`, `json`.
`capture` requiere phase. Traducción directa de opciones CLI anteriores a campos
de tool; no hay prepare/commit, cuota nueva, protocolo o ticket/handoff automático.

El wrapper `scripts/ticket_metrics.sh report --ticket ... --project-root ... [--json]`
se conserva para consumidores como el comando de Higyrus. **Capture cambió de API**:
el wrapper informa cómo usar la tool nativa, no ejecuta `opencode export` de PATH,
SQL o V1 ni finge una captura. La funcionalidad capture existe en la tool; no se
eliminó para hacer verde el port. El permiso general de master-dev es ask, equivalente
al caller explícito del workflow; otros roles no reciben grants por arrastre y la
tool no tiene un whitelist de nombres de actor paralelo al contrato nativo.

## Selección y formato

- Sesión explícita, o hasta maxCount sesiones recientes, filtradas al proyecto y
  subdirectorios; primero título/body con ticket y fallback reciente con
  matched_ticket:false, como V1. No afirmar match cuando sólo hubo fallback.
- Historial almacenado completo paginado, no sólo contexto vigente; se usa el
  transporte público Core compartido con attribution/CodeGraph. Auth efímera en
  RAM del servidor, sin copiar fd readers o credenciales a shell/archivos/modelo.
- Selección puede examinar cuerpos en RAM, pero la proyección persistida conserva
  sólo metadata/counters. No se guardan prompts, razonamiento, outputs, attachments
  o blobs provider. Metadata privada/marcada o asignaciones sensibles obvias fallan;
  esto no es un detector universal de secretos/PII.
- Se conservan `tmp/<ticket>/metrics/<phase>.json`, `history/<phase>-N.json` y
  summary.json/summary.md, sus campos legacy, modelos/variantes y offsets UTC.
  Capture reemplaza latest y agrega historial; report sólo lee y no recaptura.
- Tokens V2: suma exclusiva normalizada input/output/reasoning/cache, no billing
  V1. Faltantes son null/n/a, no ceros inventados. Compaction completada se incluye
  con etiqueta/measurement; no se promete comparabilidad de backends distintos.

## Límites y seguridad

La tool comprueba contrato nativo y pide permiso antes de leer sesiones/capturar;
scope externo conserva external_directory. Paths físicos, sin symlinks ni escape
de tmp; no escrituras de aplicación o remotas. Archivos se publican por rename y
captures del mismo host se serializan. No es transacción multiarchivo/crash ni
lock distribuido frente a dos hosts ajenos. Lectura histórica no es snapshot
atómico de una sesión que sigue activa: measurement.snapshotAtomic:false.

Plugin separado `opencode-ticketing.metrics`. El launcher lo exige sólo cuando la
metadata archivada de Ticketing declara metrics:true, preservando el arranque de
revisiones anteriores sin regenerarlas. No amplía OAuth/Jira/Confluence ni MCP.

## Evidencia

```text
TMPDIR=/tmp/opencode node --test v2/test/*.test.mjs
```

16 tests V2 del owner pass, incluidos6 nuevos: proyección/paridad con funciones
puras del helper V1 sobre fixtures, repetición/latest/history, report CLI,
paginación/selección/fallback, null, compaction, traversal/symlinks y privacidad.
Host oficial2.2.7 con sesión/modelo sintéticos: captura de stored messages, ask,
rechazo sin archivos y deny de otro rol con session allow. El variant `default`
que devuelve el SDK se conserva explícitamente, no se pierde por el fixture.
Ninguna captura de tickets/sesiones reales se hizo para validar este port.

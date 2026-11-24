# Rovo OAuth — alternativa DCR nativa para el piloto V2

## Estado actual: login MCP real confirmado por el operador

Después de aplicar `oauth-discovery`, el operador confirmó que el MCP funcionó.
El plan local posterior informa `scopeSelection: resource-metadata; review provider
consent`, confirmando que el perfil conserva el modo. La verificación del plan no
consulta el estado conectado ni llama herramientas remotas: el éxito de login/
conexión real es evidencia del operador, no una afirmación derivada del fixture.

El cambio a discovery resolvió el rechazo en este reintento. No se identifica qué
scope o validación interna exigía Atlassian ni se presenta como fix universal.
Una captura posterior del operador confirma MCP Connected y ejecución real de
`getAccessibleAtlassianResources`: respuesta válida con un recurso accesible.
Una segunda captura confirma `search` ejecutado sin error con cero resultados y
`getJiraIssue` con lectura directa exitosa de un ticket autorizado. Queda aprobada
la prueba básica de Jira por MCP en este piloto. La búsqueda vacía no demuestra
que recupere el ticket por su clave ni una equivalencia de relevancia/indexación.
Una tercera captura confirma búsqueda Confluence con recuperación de una página
y getConfluenceContent exitoso en Markdown. El primer intento de búsqueda falló
(la tabla del operador lo atribuye a DNS); el siguiente encontró documentación.
No se diagnostica causa de red persistente a partir de ese único fallo. Queda
completada la prueba básica real de Jira y Confluence del piloto, sin validar
imágenes/adjuntos, todos los sitios, relevancia general ni todos los lifecycle.
No incorporar URL, identificadores ni contenido interno a esta documentación.
El ajuste de permisos por agente queda para después, según
el pedido del operador; se mantienen los guards actuales, V1 y credenciales intactos.

## Hallazgo nuevo: los scopes configurados no eran los scopes efectivos de V1

El operador priorizó conectar el MCP y dejar el ajuste de permisos por agente para
después. La comparación anterior sólo probaba igualdad de valores en archivos;
**no probaba paridad de la petición OAuth efectiva**. Se corrige esa conclusión.

La fuente pública exacta de OpenCode 1.19.4 declara MCP SDK 1.29.0. Su transporte
pasa a `auth()` el scope del desafío WWW-Authenticate, no el de clientMetadata.
SDK 1.29.0 resuelve scopes en este orden:

1. Scope del desafío, si existe.
2. `scopes_supported` del recurso publicado por Atlassian.
3. `clientMetadata.scope` configurado, sólo como fallback.

Un probe unauthenticated `initialize` al endpoint real devolvió 401 y sólo
`resource_metadata` en WWW-Authenticate, **sin scope**. No hubo registro OAuth,
tokens ni tools Jira/Confluence. El SDK 1.29.0 se ejecutó además en un fixture
desechable con fetch simulado, sin sockets ni auth stores: aun con un scope de
config distinto, envió todos los scopes PRM tanto al registro como a authorize.
Esto verifica la selección de ese SDK, no el grant histórico de la cuenta ni
posibles cambios adicionales del ejecutable V1 local.

En cambio, OpenCode 2.2.7 pasa `oauth.scope ?? challenge.scope` explícitamente a
`auth()`. Por eso transportar literalmente el string del archivo V1 (cuatro
scopes, luego seis) **sí puede reducir la solicitud efectiva respecto de V1**.
Es una diferencia de integración confirmada, no todavía la causa demostrada del
rechazo post-consentimiento.

### Corrección aplicada: descubrimiento nativo

`rovoDiscoveryServer` elimina únicamente `oauth.scope`; no hardcodea una lista
nueva, audience, prompt, clientes o credenciales. El cliente V2 nativo vuelve a
usar el desafío/metadata del proveedor. Se conservan endpoint v2, DCR/callback19876,
roles y ACL de tools. No hay proxy, patch del host, instalación global ni cambio V1.
El coordinador compara baseline conocida, guarda `.pre-rovo-discovery.bak` y
`.ticketing-oauth-discovery.json`; las reaperturas mantienen el descubrimiento.
Los markers de identidad previos quedan como historial, no como scopes forzados.
Repetir oauth-identity con discovery activo se rechaza antes de recomponer el perfil.

**Impacto en consentimiento:** Atlassian publica un catálogo más amplio, incluyendo
offline_access y scopes de escritura/administración de productos. El request puede
ser más amplio que el del intento anterior; no confundir esto con abrir herramientas
a los agentes. Revisar la pantalla del proveedor y no aceptar permisos inesperados
por reflejo. No se garantiza que todos los scopes publicados sean concedidos.

Pasaron 66 tests de migración, 18 del addon, 21 casos nativos Ticketing y cinco modos
OAuth loopback. El caso discovery reproduce un desafío sin scope y metadata más
amplia que la config: registro y authorize coinciden, con PKCE/callback/token
ficticios completos y `debug config --standalone` del oficial 2.2.7. También se
probó reapertura completa, backups, drift, puerto ocupado, no-op y markers inválidos.
El cliente V2 no agrega prompt=consent automáticamente en ese caso; SDK 1.29.0 sí
lo hace cuando selecciona offline_access. Por tanto no afirmar identidad completa
de requests V1/V2 ni inventar parámetros extra para ocultar esa diferencia.

Procedimiento ya aplicado por el operador. Requirió cerrar el intento y cliente
V2; no hace falta repetirlo después de un login exitoso:


Usá la entrada gestionada con el addon configurado; ver [Core](https://github.com/juanma91m/super-turing-opencode/blob/main/v2/install/README.md).


Luego iniciar una autorización nueva en `/mcps`, sin repetir apply/oauth-identity,
sin reutilizar links, sin leer/copiar/borrar tokens. Si falla el primer comando,
detenerse. El operador ya confirmó login, recursos, search sin error (vacío) y
lectura directa Jira posteriores, y luego búsqueda/lectura Confluence reales.
No presentar los fixtures como evidencia de aceptación del proveedor.

## Histórico: DCR e identidad por sí solos no resolvieron la autorización

El operador ejecutó la compatibilidad y repitió el login en un navegador habitual.
Las nuevas capturas muestran client_id registrado (ya no el documento URL) y
callback en 19876. El marker local también confirma `dcr-loopback`. Atlassian
volvió a responder el mismo `invalid_request`. **La selección DCR funcionó;
la hipótesis de que cambiar CIMD/callback bastaría quedó descartada.**

El operador también aplicó el opt-in de identidad. La captura de la nueva solicitud
incluye `read:account` y `email`, y `ticketing.mjs plan` confirma ambos scopes en el
perfil. El login volvió a fallar en Chrome y en el navegador integrado de la app,
con `invalid_request / Incorrect request parameters`. **Agregar esos dos scopes
tampoco bastó.** En ese punto no había OAuth exitoso; el éxito posterior con
discovery se registra al inicio de este documento.

El operador precisó que ejecuta V2 desde una terminal independiente de Debian,
no desde una terminal integrada en Codex/ChatGPT. Llega a la pantalla de
consentimiento, con sitio elegido, cliente `opencode`, callback esperado y grupos
Read/Write/Search seleccionados. **El rechazo aparece al pulsar Aceptar.** Por
lo tanto, se alcanzó el consentimiento: no describirlo como fallo al abrir el
enlace o como ausencia de pantalla de permisos. No hay evidencia de callback o
intercambio de código completados. Las casillas son grupos del proveedor, no la
ACL MCP; no pedir más grupos para corregir el error por intuición.

No seguir repitiendo los procedimientos históricos de abajo ni borrar credenciales.
Después de este resultado no se modificó la configuración, no se inició otro
intento ni se canceló el del operador. El fixture local valida el cliente/protocolo,
no las reglas internas del proveedor. No agregar más scopes/flags por ensayo.

### Doble apertura del enlace: síntoma separado

El operador informa que un clic abre Chrome y el navegador integrado de la app.
En la fuente exacta 2.2.7, `packages/tui/src/ui/link.tsx` renderiza un `<a href>` y
además llama a `openUrl` en `onMouseUp`; `packages/util/src/open.ts` delega en el
abridor del sistema. `OAuthAuto` inicia polling al montarse, no una apertura
automática del navegador. Enter con Redirect URL vacío usa el mismo `openUrl`.

Hipótesis: el manejador del clic de OpenCode y el de hipervínculos del escritorio/
terminal pueden estar actuando sobre el mismo gesto. La terminal no está integrada
en la app ChatGPT/Codex; se retira esa explicación específica. La consulta local
read-only de XDG/GIO informa Chrome como predeterminado HTTPS. ChatGPT también
está registrado como manejador HTTP/HTTPS por su desktop entry, pero eso **no
demuestra que lo hayan invocado** ni identifica el segundo disparador. No se trazó
la ruta real de apertura y no se declara la causa confirmada.
La doble apertura no demuestra dos intentos OAuth:
pueden ser dos vistas de la misma solicitud. Tampoco basta para explicar el
`invalid_request`, que el operador observó en ambos navegadores.

Para un diagnóstico de apertura sin OAuth, comparar clic y Enter usando sólo un
enlace público inocuo, sin parámetros de autorización. No recompilar/parchear el
host ni cambiar asociaciones globales. No abrir enlaces OAuth desde herramientas
para reproducir este síntoma.

### Diagnóstico previo al hallazgo de selección de scopes

#### Contraste con la configuración V1 instalada

Ante el pedido del operador de conservar el consentimiento amplio que ya había
aceptado, se auditó `~/.config/opencode/opencode.json` mediante `v2/preflight.py`,
sin mostrar valores ajenos ni abrir almacenes OAuth. El servidor V1 está habilitado,
endpoint y objeto OAuth coinciden exactamente con el fragmento canónico y no hay
campos extra de servidor. El request configurado contiene estos cuatro scopes:

```text
read:jira:agent-interface
read:confluence:agent-interface
search:rovo:agent-interface
write:confluence:agent-interface
```

La lectura seleccionada del config desplegado del workshop confirmó el mismo
endpoint y los cuatro scopes en el mismo orden, más `read:account email`, con
callback19876. **No se recortó el consentimiento de producto de V1 ni su scope
de escritura Confluence.** El plan confirma el opt-in aplicado. No se inspeccionó
el grant/token guardado: los scopes solicitados en config no demuestran el alcance
exacto de una autorización anterior, ni que hoy V1 pueda completar un login nuevo.

En la configuración V1 global, Rovo está oculto por defecto, con cuatro lecturas
habilitadas para planner y tres para code-reviewer. Las definiciones instaladas
de ambos agentes V1 no agregan reglas Rovo que alteren esas allowlists. En V2 esas
mismas lecturas están expresadas como permisos nativos en sus archivos de agentes,
no como los flags `tools` de V1. No se trata de un recorte inventado para el piloto.
No se auditó cada overlay de proyecto ni el estado en memoria de procesos abiertos.

El operador confirmó cuenta correcta; el portal administrativo sólo muestra crear
organización y no se dispone de revisión de sus políticas. No crear una organización
ni exigir acceso admin para continuar la comparación del cliente. La política de
organización sigue sin comprobarse, no es causa demostrada. Dado que no falta ningún
scope configurado de producto de V1, se pasó a contrastar el comportamiento OAuth
de ambos clientes. Ese contraste encontró la prioridad de selección descrita al
inicio. La paridad de archivos no prueba la de requests. No copiar credenciales
V1 al piloto ni ampliar herramientas para ocultar el error.

#### Límites y comprobaciones de proveedor

Detener reintentos. La causa exacta del rechazo visible en Atlassian sigue sin
identificarse; no hay evidencia de que haya alcanzado el callback local. Hace
falta contraste sanitizado registro DCR/solicitud authorize o diagnóstico del
proveedor, sin leer ni publicar auth stores, URLs completas, state, PKCE o tokens.
No asumir contraseña incorrecta, fallo exclusivo del navegador embebido, scopes
faltantes o política de organización como causas probadas.

El reporte público Codex #36026 también documenta rechazo después de Aceptar,
pero en otro endpoint; compartir esta fase no prueba el mismo bug. La KB oficial
de Atlassian sobre bloqueo del consentimiento describe políticas de dominios y
posible desfase del backend; su error documentado es diferente. Sirve como línea
de consulta para soporte, no como autorización para cambiar ajustes de organización.

La documentación oficial incluye `127.0.0.1` y `localhost` entre los dominios
soportados HTTP por defecto, aunque la organización puede bloquearlos. Revisar
en modo lectura Atlassian Administration → Rovo MCP server → Domain settings:
si permite o bloquea el callback loopback y el cliente. No agregar comodines ni
quitar/recrear reglas por ensayo. Si la política parece correcta o no hay acceso
administrativo, pedir a soporte que identifique la validación que falla tras el
consentimiento, usando el ID de error que conserva el operador.

#### Resumen sanitizado listo para soporte (sin envío automático)

- Cliente oficial OpenCode 2.2.7, Linux/Debian; terminal independiente.
- Recurso MCP: `https://mcp.atlassian.com/v2/mcp`.
- DCR nativo, cliente público, PKCE S256 y callback `http://127.0.0.1:19876/callback`.
- La pantalla reconoce cliente y callback, permite elegir sitio y muestra los
  grupos Read/Write/Search. Al pulsar Aceptar termina en la página Atlassian con
  `invalid_request / Incorrect request parameters`, sin éxito observado en cliente.
- Se reprodujo en Chrome y en navegador integrado; CIMD, DCR y luego el opt-in
  read:account/email no resolvieron el rechazo. Estos dos scopes están confirmados
  en la solicitud actual; no se agregaron audience/prompt ni otros scopes.
- Scopes de producto preservados: read:jira:agent-interface,
  read:confluence:agent-interface, search:rovo:agent-interface,
  write:confluence:agent-interface. No hubo llamadas de tools Jira/Confluence.
- Solicitud: identificar el parámetro o validación de política rechazados al
  finalizar el consentimiento y si exige un ajuste documentado del cliente.
- El operador puede completar fecha/hora/zona e ID de error directamente en el
  canal autorizado de soporte; no incluir aquí cuenta, sitio, client_id transitorio,
  cookies, HAR, URLs de autorización completas, state, PKCE, códigos o tokens.

### Evidencia inicial sobre scopes de identidad (histórico)

La petición inicial y el fragmento canónico contienen cuatro scopes de producto;
no incluían `read:account` ni `email`. La metadata pública de `/v2/mcp` anuncia
ambos como soportados, pero **no distingue scopes obligatorios**.

Dos implementaciones públicas documentan el mismo mensaje al faltar identidad:

- [mcp-gateway-registry PR 1519](https://github.com/agentic-community/mcp-gateway-registry/pull/1519),
  todavía abierto: su autor reporta un barrido controlado en authv2 donde agregar
  sólo read:account fue determinante, descartando audience/prompt/redirect.
- [AI Playground PR 40](https://github.com/c2s-bouygues/c2s.aiplayground.opensource/pull/40),
  mergeado: contra `/v2/mcp` incorpora read:account y email, y también prompt=consent.

Ambas rutas de recurso publican el mismo issuer, aunque sus scopes de producto
son diferentes. Son reportes técnicos de terceros, **no un requisito oficial
confirmado para esta cuenta ni prueba de una solución universal**. Como control,
[Codex issue 36026](https://github.com/openai/codex/issues/36026) reportó rechazo
incluso incluyendo read:account; su cierre remite a investigación de Atlassian,
no a un fix demostrado.

La hipótesis acotada fue completar sólo la identidad OAuth manteniendo
DCR, callback, endpoint y herramientas iguales. El operador autorizó solicitar
read:account/email: **amplía lectura de identidad**, aunque no habilite más tools
ni mutaciones Jira/Confluence. La opción se implementó y el operador la aplicó;
el resultado real fue otro rechazo, como se registra arriba.
No añadir audience de OAuth 3LO clásico a MCP por analogía: esa documentación
especifica apps creadas en developer console y no demuestra el contrato Rovo DCR.
Tampoco añadir todos los scopes publicados ni introducir un proxy para eludirlo.

### Identidad autorizada: cambio aplicado por el operador

`rovoIdentityServer` agrega únicamente `read:account` y `email` al string OAuth
existente, sin quitar, reordenar o duplicar sus scopes. El fragmento V1 global no
cambia. El coordinador exige baseline DCR y callback ya conocidos; actualiza sólo
`mcp.servers.atlassian-rovo.oauth.scope` del perfil y un marker no secreto
`.ticketing-oauth-identity.json`. Guarda `.pre-rovo-identity.bak`, mantiene intacto
el marker DCR y rechaza drift o puerto ocupado sin escribir ni cancelar a nadie.
Las aperturas siguientes reconstruyen el mismo scope opt-in, sin deshacerlo.

No cambia client_id, registro, redirect_uri/puerto, resource, endpoint, scopes de
producto, permisos MCP, código del host, ni agrega audience o prompt. No lee ni
borra credenciales, inicia intentos OAuth o consulta tickets. Es un experimento
acotado solicitado por el operador, no un nuevo default portable obligatorio.

Los tests comparan el documento completo antes/después: sólo difiere scope, además
del marker de control. Cubren backups, no-op, falta de DCR, drift, puerto ocupado,
ack de cierre y reapertura de la composición completa con políticas/actores
idénticos. Los campos inesperados del marker se rechazan sin volcar sus valores.
La regresión de cierre pasó 61 tests de migración (incluido el chequeo API nativo),
18 del addon y 21 casos nativos de Ticketing. El smoke OAuth pasó sus cuatro
escenarios y `debug config --standalone` con el ejecutable oficial.
El smoke OAuth ahora incluye una regla **sintética** de identidad:
falla sin los dos scopes y completa registro/callback/PKCE/token con ellos,
conservando scope también en el request DCR. Esa regla modela la hipótesis, **no
prueba que Atlassian tenga esas reglas ni que el login real ya funcione**.

Procedimiento histórico ya ejecutado por el operador; **no repetir como solución**.
Requería el intento fallido y el cliente V2 cerrados, desde una terminal normal:

```bash
```

Luego iniciar una autorización nueva en `/mcps`, sin reutilizar links anteriores.
No hace falta repetir apply general, oauth-compat, logout ni borrar caches/tokens.
Revisar el consentimiento de identidad recién autorizado. Si vuelve a fallar,
detener reintentos: no añadir más scopes/flags por ensayo; se requiere evidencia
del proveedor/upstream. Compartir sólo el error, nunca URL/state/código/token.

## Evidencia y límites del diagnóstico

El operador aplicó Ticketing y abrió la autorización desde el cliente V2. Atlassian
respondió `invalid_request / Incorrect request parameters` antes de completar el
login. La captura de OpenCode muestra el modo **Client ID Metadata Document
(CIMD)**: el client_id es el documento público de OpenCode, no un cliente DCR.
No se recopilaron ni persistieron URL de autorización, state, PKCE, códigos o tokens.

La metadata pública del recurso MCP v2 apunta al authorization server de Atlassian.
Este anuncia **CIMD, clientes públicos, PKCE S256 y un registration_endpoint DCR**.
Por eso no se concluye que Atlassian no soporte CIMD: el motivo exacto del rechazo
de ese request todavía no está probado. El browser embebido tampoco se declara
causa sin evidencia adicional. No es un diagnóstico de contraseña incorrecta.

La fuente exacta OpenCode `v2.2.7` selecciona CIMD si no hay client_id ni redirect_uri
explícitos y el servidor lo anuncia. **Configurar oauth.redirect_uri desactiva esa
selección y usa DCR**, sin parchear el host ni registrar un client_id ajeno.

## Alternativa preparada, no aplicada automáticamente

El helper del addon `oauth-compat.mjs` agrega únicamente:

```json
{ "redirect_uri": "http://127.0.0.1:19876/callback" }
```

al objeto OAuth existente. El listener nativo deriva el mismo puerto de esa URI;
no se mezclan callback_port y redirect_uri incompatibles. Se conserva endpoint
MCP **v2**, authorization server descubierto, recurso, scopes, PKCE, transporte y
matriz 4/3/0. No se cambia a v1, no se introduce mcp-remote/proxy, no se recompila
OpenCode ni se copian/borran credenciales. No se amplían permisos Jira/Confluence.

**Tradeoff:** se usa registro dinámico de cliente con callback exacto y puerto
fijo, en vez del documento público con puerto efímero. Sólo puede haber un listener
en ese puerto; si está ocupado, se informa y no se detiene ningún proceso. No se
presenta como prueba de que Atlassian real vaya a aceptar el reintento.

El coordinador `rovo-oauth-compat.mjs` requiere una composición Ticketing conocida,
compara bytes, guarda `.pre-rovo-oauth.bak` y registra sólo metadata no secreta en
`.ticketing-oauth-compat.json`. Actualiza únicamente config/marker del workshop,
no el fragmento V1 global ni sus auth stores. Los siguientes chat/verify conservan
el modo del marker en vez de deshacerlo. Sigue siendo una actualización atómica
por archivo, no una transacción FS completa.

## Validación local realizada

`smoke-ticketing-oauth.mjs` usa el ejecutable oficial 2.2.7 y **únicamente servidores
loopback**, un perfil y almacenamiento de credenciales ficticios:

1. El servidor de prueba anuncia CIMD y DCR. Sin redirect explícito, el cliente
   nativo elige el documento público; el fixture lo rechaza deliberadamente.
   Es un control negativo, **no una reproducción de las reglas internas de Atlassian**.
2. Con el helper de compatibilidad, el mismo cliente registra por DCR la URI exacta,
   conserva scope/resource y completa callback, state/issuer, PKCE S256 e intercambio
   de tokens ficticios. El status nativo del intento llega a `complete`.

Ambos modos pasaron `debug config --standalone` antes del flujo. No hubo navegador,
registro en Atlassian, requests a Jira, credenciales reales ni modelos reales.
Sólo se canceló el intento pendiente **creado por el fixture**; nunca el del operador.
Los tests unitarios cubren cambio mínimo, backups, idempotencia, drift y puerto
ocupado sin cerrar a su dueño. Las URL/state/verificadores/tokens no se vuelcan a logs.

Desde la base canónica:

```bash
```

El operador sí ejecutó el cambio después de cerrar el cliente; falló también el
reintento real DCR. **OAuth real y catálogo/lectura reales siguen pendientes.**

## Reintento inicial del operador (histórico; no repetir como fix confirmado)

1. Salir con Esc del intento fallido y cerrar el cliente del workshop V2. No hace
   falta cerrar V1, borrar cachés, hacer logout global ni reinstalar.
2. Desde una terminal normal, con HOME real:

```bash
```

La primera acción hace sólo el upgrade y `debug config`; no llama APIs OAuth,
no conecta al proveedor, no inspecciona tokens ni cancela intentos. Se debe cargar
la nueva configuración reiniciando el cliente. Si el puerto no está disponible,
detenerse y revisar el error; no matar procesos por nombre.

3. En `/mcps`, iniciar **una autorización nueva** de atlassian-rovo. No reutilizar
   el enlace/pestaña anteriores ni pegar la página de error en Redirect URL. Si
   abre un browser embebido, se puede abrir el enlace nuevo localmente en el
   navegador habitual; nunca compartirlo en el chat. Un redirect válido con código
   sólo se pega en el campo del cliente nativo si el browser no puede alcanzarlo.
4. Revisar cuenta y consentimiento. Los scopes originales pueden ser más amplios
   que las tools habilitadas; la ACL del cliente sigue limitada a lectura.

Si vuelve a fallar, informar únicamente el error y si el cliente sigue usando un
documento URL como client_id, **sin copiar el ID, URL completa, state o código**.
No borrar credenciales por reflejo: puede haber estado de un login previo y eso
requiere diagnóstico separado. No declarar el problema resuelto hasta observar
el login real y una lectura autorizada.

## Fuentes públicas verificadas

- https://mcp.atlassian.com/.well-known/oauth-protected-resource/v2/mcp
- Metadata del issuer devuelto por authorization_servers (discovery con path).
- https://opencode.ai/oauth/opencode/client.json
- https://github.com/anomalyco/opencode/blob/v2.2.7/packages/core/src/mcp/oauth.ts
- https://github.com/anomalyco/opencode/blob/v2.2.7/packages/schema/src/mcp.ts
- https://github.com/anomalyco/opencode/blob/v2.2.7/packages/tui/src/ui/link.tsx
- https://github.com/anomalyco/opencode/blob/v2.2.7/packages/tui/src/component/dialog-integration.tsx
- https://github.com/anomalyco/opencode/blob/v2.2.7/packages/util/src/open.ts
- https://github.com/anomalyco/opencode/blob/v1.19.4/packages/opencode/src/mcp/oauth-provider.ts
- https://github.com/anomalyco/opencode/blob/v1.19.4/packages/opencode/src/mcp/index.ts
- https://github.com/anomalyco/opencode/blob/v1.19.4/packages/opencode/package.json
- https://unpkg.com/@modelcontextprotocol/sdk@1.29.0/dist/esm/client/auth.js
- https://unpkg.com/@modelcontextprotocol/sdk@1.29.0/dist/esm/client/streamableHttp.js
- https://support.atlassian.com/rovo/kb/fix-oauth-consent-block-for-atlassian-rovo-mcp-server-in-atlassian-cloud/
- https://support.atlassian.com/security-and-access-policies/docs/available-atlassian-rovo-mcp-server-domains/

import assert from 'node:assert/strict';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { enableTicketing, ROVO_ROLES, ROVO_TOOLS } from './config.mjs';
const root = fileURLToPath(new URL('../', import.meta.url));

export function ticketingContribution({ server, confluenceReferences = false, confluenceWrites = false }) {
  return { id: 'ticketing', apply(ctx) {
    assert(ctx.version === 1 && ctx.kind === 'general');
    assert(server && server.codemode === false, 'Explicit selected native Rovo wiring required; no implicit OAuth scope override');
    const result = spawnSync('python3', [path.join(root, 'v2/general-assets.py')], { input: JSON.stringify({ config: ctx.config, mock: ctx.mock }), encoding: 'utf8', timeout: 10000,
      maxBuffer: 8 * 1024 * 1024, env: { PATH: '/usr/local/bin:/usr/bin:/bin', PYTHONDONTWRITEBYTECODE: '1' } });
    assert(!result.error && result.status === 0, 'Native Ticketing assets unavailable; no Jira call attempted');
    const data = JSON.parse(result.stdout);
    for (const asset of data.assets) ctx.addConfig(asset.path, Buffer.from(asset.content_b64, 'base64'));
    for (const [role, block] of Object.entries(data.autonomy)) if (ctx.agents[role] && !ctx.agents[role].system.includes('<!-- TICKETING_AUTONOMY_START -->')) ctx.agents[role].system += '\n\n<!-- TICKETING_AUTONOMY_START -->\n' + block + '\n<!-- TICKETING_AUTONOMY_END -->\n';
    for (const [role, tools] of Object.entries(ROVO_ROLES)) {
      const agent = ctx.agents[role]; assert(agent);
      if (!agent.permissions.some(rule => rule.action.startsWith('atlassian-rovo_'))) agent.permissions.push(...tools.map(action => ({ action, resource: '*', effect: 'allow' })));
    }
    const enabled = enableTicketing(ctx.document, { server });
    enabled.plugins.pop(); // Replace only the just-added source package with its owned bundle.
    ctx.copyBundleTree('ticketing', path.join(root, 'v2/plugins/titles'), 'v2/plugins/titles');
    ctx.addBundle('ticketing', 'lib/ticket-session-title.ts', ctx.readAsset(path.join(root, 'lib/ticket-session-title.ts')));
    enabled.plugins.push(ctx.bundlePath('ticketing', 'v2/plugins/titles')); Object.assign(ctx.document, enabled);
    ctx.copyBundleTree('ticketing', path.join(root, 'v2/plugins/metrics'), 'v2/plugins/metrics');
    ctx.document.plugins.push(ctx.bundlePath('ticketing', 'v2/plugins/metrics'));
    ctx.addConfig('scripts/ticket_metrics.py',ctx.readAsset(path.join(root,'v2/metrics-report.py')));
    ctx.addConfig('scripts/ticket_metrics.sh','#!/usr/bin/env bash\nset -euo pipefail\nSCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"\nexec python3 "$SCRIPT_DIR/ticket_metrics.py" "$@"\n');
    ctx.agents['master-dev'].permissions.push({action:'ticket-metrics',resource:'*',effect:'ask'});
    ctx.manageTools(['ticket-metrics']);
    ctx.closeTools('atlassian-rovo_*', [...ROVO_TOOLS, ...(confluenceReferences ? ['atlassian-rovo_executeRead'] : []), ...(confluenceWrites ? ['atlassian-rovo_createConfluenceContent', 'atlassian-rovo_updateConfluenceContent'] : [])]);
    ctx.appendInstructions('## Ticketing general V2\nLos roles técnicos conservan sólo lecturas Jira/Confluence clasificadas por rol; consentimiento OAuth no es ACL de tools. Documents puede conservar las dos escrituras Confluence originales de Documenter con ask, no escritura Jira ni otros mutadores. Handoff local opt-in por contrato/pedido, nunca por detectar un ID aislado. Helper jira por broker y metadata bajo tmp; no preparar credenciales ni hacer escrituras remotas para probar la migración.');
    ctx.appendInstructions('Métricas de fases: ticket-metrics capture/report conserva tmp/<ticket>/metrics (latest/history/summary). Capture usa historial público V2 en RAM; no exportar sesiones a archivos ni ejecutar opencode V1. El wrapper ticket_metrics.sh conserva report; capture se solicita a la tool nativa, con ask y sólo por pedido/workflow activo. No capturar ni activar handoff por rutina. Tokens V2 normalizados no son billing V1; faltantes null.');
    ctx.metadata.ticketing = { commands: 6, reads: 4, mutations: false, metrics: true, handoff: 'local opt-in broker', documentReferences: confluenceReferences, documentWrites: confluenceWrites,
      ...(confluenceReferences ? { referenceTransport: { version: 1, executor: 'atlassian-rovo_executeRead', consumer: 'documents', operations: ['getContentFormatGuide', 'getConfluenceSpace'] } } : {}) };
  } };
}

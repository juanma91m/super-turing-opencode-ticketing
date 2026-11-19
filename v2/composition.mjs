import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { enableTicketing, ROVO_TOOLS } from './config.mjs';

const renderer = fileURLToPath(new URL('./assets.py', import.meta.url));
const quote = text => /^[A-Za-z0-9_./-]+$/.test(text) ? text : `'${text.replaceAll("'", "'\\''")}'`;

// Consume a prior composition (e.g. Knowledge) instead of editing its sources or
// reading arbitrary deployed files as a new baseline. No live writes here.
export function ticketingExtension({ server } = {}) {
  return context => {
    const { document, instructions, assets, config, mock } = context;
    const agents = Object.fromEntries(assets.filter(asset => path.dirname(asset.file) === path.join(config, 'agents'))
      .map(asset => [path.basename(asset.file, '.md'), Buffer.from(asset.desired).toString('utf8')]));
    const result = spawnSync('python3', [renderer], {
      input: JSON.stringify({ config, agents, mock: Boolean(mock) }), encoding: 'utf8', timeout: 10000,
      maxBuffer: 8 * 1024 * 1024, env: { PATH: process.env.PATH ?? '/usr/bin:/bin', PYTHONDONTWRITEBYTECODE: '1' },
    });
    assert(!result.error && result.status === 0, 'Ticketing asset rendering failed; no Jira access attempted');
    const plan = JSON.parse(result.stdout);
    const combined = new Map(assets.map(asset => [asset.file, asset]));
    for (const item of plan.assets) {
      const file = path.join(config, item.path), desired = Buffer.from(item.content_b64, 'base64');
      const prior = combined.get(file);
      if (prior && desired.equals(Buffer.from(prior.desired))) continue;
      combined.set(file, { file, desired, ...(item.previous_b64 ? { previous: Buffer.from(item.previous_b64, 'base64'), backup: true } : {}), tag: 'ticketing' });
    }
    const next = enableTicketing(document, { server });
    for (const role of ['plan', 'build']) {
      if (!Object.hasOwn(agents, role)) {
        next.agents ??= {};
        next.agents[role] = { ...next.agents[role], disabled: false };
      }
    }
    const boundary = next.plugins.find(plugin => typeof plugin === 'object' && plugin.package.endsWith('/workshop-guard/'));
    assert(boundary, 'Expected the explicit pilot boundary');
    boundary.options.additionalTools = [...(boundary.options.additionalTools ?? []), ...ROVO_TOOLS];
    boundary.options.helperValidators = [...(boundary.options.helperValidators ?? []), path.join(config, 'scripts/ticketing_check.py')];
    boundary.options.preserveTitles = true;
    boundary.options.ticketing = true;
    for (const asset of combined.values()) boundary.options.pinned[asset.file] = createHash('sha256').update(asset.desired).digest('hex');
    const prefix = `python3 ${quote(path.join(config, 'scripts/planner_shell.py'))} helper jira`;
    next.policies.push({ action: 'tool.use', resource: `shell:${prefix} *`, effect: 'allow' });
    next.policies.push({ action: 'tool.use', resource: `shell:python3 ${quote(path.join(config, 'scripts/planner_shell.py'))} --help`, effect: 'allow' });
    return { ...context, document: next, assets: [...combined.values()], roles: plan.roles,
      skills: [...(context.skills ?? []), ...plan.skills], tag: 'ticketing',
      previousDocument: JSON.stringify(document, null, 2) + '\n', previousInstructions: instructions,
      instructions: instructions + '\n## Ticketing V2\nJira/Confluence sólo mediante lecturas autorizadas por rol. Tener un ticket o usar code review no activa handoff: manda el contrato del proyecto y el pedido. El helper jira puede escribir metadata local bajo tmp por la vía del broker, sin habilitar Edit ni shell libre. No publicar, mutar tickets ni copiar credenciales.\n' };
  };
}

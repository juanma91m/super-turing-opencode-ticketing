import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

export const ROVO_ROLES = JSON.parse(fs.readFileSync(new URL('./rovo-tools.json', import.meta.url), 'utf8'));
export const ROVO_TOOLS = [...new Set(Object.values(ROVO_ROLES).flat())];
export const titlePackage = fileURLToPath(new URL('./plugins/titles/', import.meta.url)).replace(/\/$/, '');

export function rovoServer() {
  const { enabled, timeout, ...server } = JSON.parse(fs.readFileSync(new URL('../mcp/atlassian-rovo.json', import.meta.url), 'utf8'))['atlassian-rovo'];
  // Preserve the canonical consent request, including its broader Confluence
  // scope. OAuth scopes are NOT the role permission boundary.
  return { ...server, disabled: enabled === false, codemode: false, timeout: { execution: timeout } };
}

export function enableTicketing(base, { server = rovoServer() } = {}) {
  assert(!Object.hasOwn(base.mcp?.servers ?? {}, 'atlassian-rovo'), 'Existing Rovo wiring needs explicit reconciliation');
  assert(server.codemode === false, 'Ticketing requires direct native MCP tools');
  const document = structuredClone(base);
  document.mcp ??= { servers: {} };
  document.mcp.servers ??= {};
  document.mcp.servers['atlassian-rovo'] = structuredClone(server);
  document.permissions = [...(document.permissions ?? []), { action: 'atlassian-rovo_*', resource: '*', effect: 'deny' }];
  document.policies = [...(document.policies ?? []), { action: 'mcp.use', resource: 'atlassian-rovo', effect: 'allow' },
    ...ROVO_TOOLS.map(name => ({ action: 'tool.use', resource: `${name}:*`, effect: 'allow' }))];
  document.plugins = [...(document.plugins ?? []), titlePackage];
  return document;
}

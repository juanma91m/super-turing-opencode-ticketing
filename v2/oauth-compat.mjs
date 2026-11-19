import assert from 'node:assert/strict';

export const DCR_CALLBACK_PORT = 19876;
export const ROVO_IDENTITY_SCOPES = Object.freeze(['read:account', 'email']);

// Native OpenCode 2.2.7 chooses DCR when an explicit redirect_uri is configured.
// This changes only client registration, never the MCP endpoint, scopes, client
// privileges or token storage. Do not invent/reuse someone else's client_id.
export function dcrLoopbackServer(server, port = DCR_CALLBACK_PORT) {
  assert.equal(server?.type, 'remote', 'DCR compatibility needs a remote OAuth server');
  assert(server.oauth && typeof server.oauth === 'object', 'Existing OAuth configuration required');
  assert(Number.isSafeInteger(port) && port >= 1 && port <= 65535, 'Invalid loopback callback port');
  assert(!server.oauth.client_id && !server.oauth.client_secret && !server.oauth.redirect_uri, 'Do not override an explicit OAuth client or callback');
  assert(server.oauth.callback_port === undefined || server.oauth.callback_port === port, 'Do not mismatch an explicit callback port');
  const result = structuredClone(server);
  result.oauth.redirect_uri = `http://127.0.0.1:${port}/callback`;
  return result;
}

// Opt-in only: this increases the OAuth consent request for identity reads.
// Preserve every existing product scope and all unrelated native settings.
export function rovoIdentityServer(server) {
  assert.equal(server?.type, 'remote', 'Identity scopes need the existing remote server');
  assert(server.oauth && typeof server.oauth === 'object' && typeof server.oauth.scope === 'string' && server.oauth.scope.trim(), 'Explicit existing OAuth scopes required; do not replace discovery defaults');
  const result = structuredClone(server);
  const present = new Set(result.oauth.scope.split(/\s+/).filter(Boolean));
  const missing = ROVO_IDENTITY_SCOPES.filter(scope => !present.has(scope));
  if (missing.length) result.oauth.scope += (/\s$/.test(result.oauth.scope) ? '' : ' ') + missing.join(' ');
  return result;
}

// V1 SDK 1.29.0 selects PRM scopes before clientMetadata.scope. Native V2 passes
// configured scope explicitly, overriding that discovery. Remove only this
// override to restore provider-driven consent; tools/roles are a separate ACL.
export function rovoDiscoveryServer(server) {
  assert(server?.type === 'remote' && server.oauth && typeof server.oauth === 'object', 'Discovery needs the existing remote OAuth server');
  const result = structuredClone(server);
  delete result.oauth.scope;
  return result;
}

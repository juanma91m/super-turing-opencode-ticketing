// Public wiring selection only. Native runtime, not this selector, owns auth.
import assert from 'node:assert/strict';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { rovoServer, ROVO_ROLES } from './config.mjs';
import { dcrLoopbackServer, rovoDiscoveryServer } from './oauth-compat.mjs';

export function selectedRovoServer(home, config) {
  assert(path.isAbsolute(home) && path.isAbsolute(config), 'Explicit runtime identity required');
  const result = spawnSync('/usr/bin/python3', ['-I', '-B', fileURLToPath(new URL('./preflight.py', import.meta.url)), path.join(config, 'opencode.json')], { encoding: 'utf8', timeout: 10000, maxBuffer: 1024 * 1024, env: { PATH: '/usr/local/bin:/usr/bin:/bin', HOME: home } });
  assert(!result.error && result.status === 0, 'Rovo wiring requires reconciliation; values suppressed; no host/auth started');
  const metadata = JSON.parse(result.stdout);
  assert(metadata.serverPresent && metadata.canonicalEndpoint && metadata.canonicalOAuthRequest && metadata.globallyHidden && metadata.unsupportedServerFields === 0, 'Unreviewed Rovo wiring/ACL; no normalization');
  assert.deepEqual(metadata.roleReads, ROVO_ROLES, 'Rovo role read ACL requires reconciliation');
  return { server: { ...rovoDiscoveryServer(dcrLoopbackServer(rovoServer())), disabled: !metadata.enabled }, metadata: { canonicalWiring: true, enabled: metadata.enabled, authStoresRead: false, privateConfigurationValuesExported: false, hostStarted: false } };
}

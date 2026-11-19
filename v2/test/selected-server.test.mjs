import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { selectedRovoServer } from '../selected-server.mjs';
import { ROVO_ROLES } from '../config.mjs';

function fixture(t) {
  const root = fs.mkdtempSync('/tmp/opencode/rovo-selector-'); t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const canonical = JSON.parse(fs.readFileSync(new URL('../../mcp/atlassian-rovo.json', import.meta.url)))['atlassian-rovo'];
  const config = { mcp: { 'atlassian-rovo': canonical }, tools: { 'atlassian-rovo_*': false }, agent: Object.fromEntries(Object.entries(ROVO_ROLES).map(([id, names]) => [id, { tools: Object.fromEntries(names.map(name => [name, true])) }])), unrelated: { apiKey: 'PRIVATE_UNRELATED_VALUE_MUST_NOT_BE_EXPORTED' } };
  return { root, config, save() { fs.writeFileSync(path.join(root, 'opencode.json'), JSON.stringify(config)); } };
}
test('owner selector preserves approved resource-metadata transport, disabled state and read ACL without credentials/startup', t => {
  const f = fixture(t); f.save(); const before = fs.readFileSync(path.join(f.root, 'opencode.json'));
  const selected = selectedRovoServer(f.root, f.root); assert(selected.metadata.canonicalWiring); assert.equal(selected.metadata.authStoresRead, false); assert.equal(selected.metadata.privateConfigurationValuesExported, false); assert.equal(selected.metadata.hostStarted, false); assert.equal(selected.server.codemode, false);
  assert(!JSON.stringify(selected).includes('PRIVATE')); assert.deepEqual(fs.readFileSync(path.join(f.root, 'opencode.json')), before);
  f.config.mcp['atlassian-rovo'].enabled = false; f.save(); assert.equal(selectedRovoServer(f.root, f.root).server.disabled, true);
});
test('unknown server headers/endpoints or expected read ACL drift are refused, never normalized/exported', t => {
  const f = fixture(t), original = structuredClone(f.config);
  for (const change of ['headers', 'endpoint', 'reads']) {
    f.config = structuredClone(original);
    if (change === 'headers') f.config.mcp['atlassian-rovo'].headers = { Authorization: 'PRIVATE_MUST_NOT_LEAK' };
    if (change === 'endpoint') f.config.mcp['atlassian-rovo'].url = 'https://private.invalid/secret';
    if (change === 'reads') f.config.agent.planner.tools['atlassian-rovo_getConfluenceContent'] = false;
    fs.writeFileSync(path.join(f.root, 'opencode.json'), JSON.stringify(f.config));
    assert.throws(() => selectedRovoServer(f.root, f.root), error => !error.message.includes('PRIVATE') && !error.message.includes('private.invalid'));
  }
});

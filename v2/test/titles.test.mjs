import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildTicketSessionTitle } from '../../lib/ticket-session-title.ts';
import { isInitialTitle, promptText, register } from '../plugins/titles/titles.mjs';
import { enableTicketing, ROVO_ROLES, ROVO_TOOLS, rovoServer } from '../config.mjs';
import { inspectTicketing } from '../inspect.mjs';

test('native title eligibility adds only the absent V2 title to V1 defaults', () => {
  for (const value of [undefined, '', 'New session', 'Untitled session']) assert(isInitialTitle(value));
  assert(!isInitialTitle('Manual operator title'));
});

test('title input is the last model-visible actual user, not queued/synthetic/tool data', () => {
  const originals = [{ type: 'user', id: 'msg_first', text: 'Analizá TST-10 fixture' },
    { type: 'synthetic', id: 'msg_synthetic', text: 'Analizá OTHER-10' },
    { type: 'user', id: 'msg_future', text: 'Analizá FUTURE-10' }];
  const event = { messages: [{ role: 'user', id: 'msg_first' }, { role: 'user', id: 'msg_synthetic' }, { role: 'tool', id: 'msg_future' }] };
  assert.equal(promptText(event, originals), originals[0].text);
});

test('context naming preserves manual and child titles and uses the executing actor', async () => {
  for (const session of [{ title: undefined, agent: 'master-dev' }, { title: 'Manual' }, { title: undefined, parentID: 'ses_parent' }]) {
    const hooks = new Map(), updates = [];
    await register({ session: {
      async hook(kind, callback) { hooks.set(kind, callback); },
      async get() { return session; },
      async context() { return [{ type: 'user', id: 'msg_fixture', text: 'Analizá TST-10 fixture' }]; },
      async update(value) { updates.push(value); },
    } });
    const event = { sessionID: 'ses_fixture', agent: 'planner', messages: [{ role: 'user', id: 'msg_fixture', content: [] }] };
    await hooks.get('context')(event);
    await hooks.get('context')(event);
    assert.equal(updates.length, session.title === 'Manual' || session.parentID ? 0 : 1);
    if (updates.length) assert.equal(updates[0].title, buildTicketSessionTitle('planner', 'Analizá TST-10 fixture'));
  }
});

test('naming failure never blocks a prompt or requests model generation', async () => {
  const hooks = new Map();
  await register({ session: { async hook(kind, callback) { hooks.set(kind, callback); }, async context() { throw new Error('Fixture unavailable'); }, async get() { throw new Error('Fixture unavailable'); } } });
  await assert.doesNotReject(hooks.get('context')({ sessionID: 'ses_fixture', agent: 'planner', messages: [] }));
  await assert.doesNotReject(hooks.get('title')({ sessionID: 'ses_fixture', messages: [] }));
});

test('private-marked user text is never copied into a persistent title', async () => {
  const hooks = new Map();
  let updates = 0;
  await register({ session: {
    async hook(kind, callback) { hooks.set(kind, callback); },
    async get() { return { agent: 'planner' }; },
    async context() { return [{ id: 'msg_private', type: 'user', text: 'Analizá TST-10 <private>fixture</private>' }]; },
    async update() { updates++; },
  } });
  const event = { sessionID: 'ses_private', agent: 'planner', messages: [{ role: 'user', id: 'msg_private', content: [] }] };
  await hooks.get('context')(event);
  await hooks.get('title')(event);
  assert.equal(updates, 0);
  assert.equal(event.result, undefined);
});

test('title fallback never takes its actor from a future session switch', async () => {
  const hooks = new Map();
  await register({ session: {
    async hook(kind, callback) { hooks.set(kind, callback); },
    async get() { return { agent: 'code-reviewer' }; },
    async context() { return [{ id: 'msg_current', type: 'user', text: 'Analizá TST-10 fixture' }, { id: 'msg_future', type: 'user', text: 'Review PR #999' }]; },
    async update() {},
  } });
  const context = { sessionID: 'ses_fixture', agent: 'planner', messages: [{ role: 'user', id: 'msg_current', content: [] }] };
  await hooks.get('context')(context);
  const title = { sessionID: 'ses_fixture', messages: context.messages };
  await hooks.get('title')(title);
  assert.equal(title.result, 'Análisis TST-10 fixture');
  const queued = { sessionID: 'ses_fixture', messages: [{ role: 'user', id: 'msg_future', content: [] }] };
  await hooks.get('title')(queued);
  assert.equal(queued.result, undefined);
});

test('Rovo composition preserves consent config but exposes only exact read policies', () => {
  const server = rovoServer();
  assert.equal(server.url, 'https://mcp.atlassian.com/v2/mcp');
  assert(server.oauth.scope.includes('write:confluence:agent-interface'), 'Do not silently narrow the current consent request');
  assert.equal(server.codemode, false);
  const base = { mcp: { servers: { engram: { type: 'local', command: ['fixture'] } } }, permissions: [], policies: [], plugins: [] };
  const clone = structuredClone(base), next = enableTicketing(base);
  assert.deepEqual(base, clone);
  assert.deepEqual(next.mcp.servers.engram, base.mcp.servers.engram);
  assert.deepEqual(next.permissions.at(-1), { action: 'atlassian-rovo_*', resource: '*', effect: 'deny' });
  assert.equal(ROVO_ROLES.planner.length, 4); assert.equal(ROVO_ROLES['code-reviewer'].length, 3);
  assert.equal(ROVO_TOOLS.length, 4);
  assert(next.policies.filter(rule => rule.action === 'tool.use').every(rule => !/create|update|delete/i.test(rule.resource)));
  assert.throws(() => enableTicketing(next), /reconciliation/);
});

test('inspection reports missing OAuth as pending, not as a connected integration', async () => {
  const actors = ['planner', 'code-reviewer', 'master-dev'];
  const lists = {
    '/api/agent': actors.map(id => ({ id, permissions: [{ action: 'edit', resource: '*', effect: 'deny' }, { action: 'atlassian-rovo_*', resource: '*', effect: 'deny' }, ...(ROVO_ROLES[id] ?? []).map(action => ({ action, resource: '*', effect: 'allow' }))] })),
    '/api/command': ['ticket-plan', 'ticket-refresh', 'ticket-verdict', 'ticket-implement', 'ticket-validate', 'ticket-code-review'].map(name => ({ name })),
    '/api/skill': [{ id: 'workflow-ticket-handoff' }], '/api/plugin': [{ id: 'opencode-ticketing.titles' }],
    '/api/mcp': [{ name: 'atlassian-rovo', status: { status: 'needs_auth' } }],
  };
  const result = await inspectTicketing(async route => lists[route], actors);
  assert.equal(result.rovoStatus, 'needs_auth');
  assert.equal(result.remoteMutationsAllowed, false);
});

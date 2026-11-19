import assert from 'node:assert/strict';
import { ROVO_ROLES, ROVO_TOOLS } from './config.mjs';

export function permissionEffect(rules, action) {
  const matches = pattern => new RegExp('^' + pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replaceAll('*', '.*').replaceAll('?', '.') + '$').test(action);
  return rules.findLast(rule => matches(rule.action) && rule.resource === '*')?.effect;
}

// get is an injected, validated native API list reader. No dependency on host
// internals, OAuth stores, an active Jira site or the base migration repo.
export async function inspectTicketing(get, roles) {
  const agents = await get('/api/agent');
  for (const id of roles) {
    const agent = agents.find(item => item.id === id);
    assert(agent, `Missing actor ${id}`);
    if (['planner', 'code-reviewer'].includes(id)) assert.equal(permissionEffect(agent.permissions, 'edit'), 'deny', `${id} lost its application edit guard`);
    for (const tool of ROVO_TOOLS) assert.equal(permissionEffect(agent.permissions, tool), ROVO_ROLES[id]?.includes(tool) ? 'allow' : 'deny', `${id} Rovo permission`);
    assert.equal(permissionEffect(agent.permissions, 'atlassian-rovo_createJiraIssue'), 'deny', `${id} unexpected Jira write permission`);
  }
  const commands = await get('/api/command');
  for (const name of ['ticket-plan', 'ticket-refresh', 'ticket-verdict', 'ticket-implement', 'ticket-validate', 'ticket-code-review']) assert(commands.some(item => item.name === name), `Missing ${name}`);
  const skills = await get('/api/skill');
  assert(skills.some(item => item.id === 'workflow-ticket-handoff'), 'Missing handoff skill');
  const plugins = await get('/api/plugin');
  assert(plugins.some(item => item.id === 'opencode-ticketing.titles'), 'Missing native title adapter');
  const mcp = await get('/api/mcp');
  const rovo = mcp.find(item => item.name === 'atlassian-rovo');
  return { roles: roles.length, ticketCommands: 6, readTools: ROVO_TOOLS.length, plannerTools: 4, reviewerTools: 3,
    rovoStatus: rovo?.status?.status ?? 'not registered', remoteMutationsAllowed: false };
}

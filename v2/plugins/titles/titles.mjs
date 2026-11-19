import { buildTicketSessionTitle, isDefaultSessionTitle } from '../../../lib/ticket-session-title.ts';

export const isInitialTitle = title => title === undefined || title === '' || isDefaultSessionTitle(title);

export function promptText(event, originals) {
  const users = new Map(originals.filter(message => message.type === 'user').map(message => [message.id, message.text]));
  for (const message of [...event.messages].reverse()) {
    if (message.role === 'user' && users.has(message.id)) return users.get(message.id);
  }
}

export async function register(ctx) {
  const processed = new Set();
  const executing = new Map();
  // The executing context owns agent selection, including command overrides.
  // Do not infer it from the last queued prompt or a future agent switch.
  await ctx.session.hook('context', async event => {
    if (processed.has(event.sessionID) || !['planner', 'code-reviewer'].includes(event.agent)) return;
    try {
      executing.set(event.sessionID, { agent: event.agent, users: new Set(event.messages.filter(message => message.role === 'user' && message.id).map(message => message.id)) });
      const originals = await ctx.session.context({ sessionID: event.sessionID });
      const text = promptText(event, originals);
      if (typeof text === 'string' && /<\/?private\b/i.test(text)) return;
      const title = typeof text === 'string' ? buildTicketSessionTitle(event.agent, text) : undefined;
      if (!title) return;
      const session = await ctx.session.get({ sessionID: event.sessionID });
      if (session.parentID || !isInitialTitle(session.title)) return;
      await ctx.session.update({ sessionID: event.sessionID, title });
      processed.add(event.sessionID);
    } catch {
      // Naming is best-effort, just like V1; never block the actual request.
    }
  });
  await ctx.session.hook('title', async event => {
    try {
      const actor = executing.get(event.sessionID);
      const latestUser = [...event.messages].reverse().find(message => message.role === 'user');
      if (!actor || !latestUser?.id || !actor.users.has(latestUser.id)) return;
      const session = await ctx.session.get({ sessionID: event.sessionID });
      if (session.parentID || !isInitialTitle(session.title)) return;
      const text = promptText(event, await ctx.session.context({ sessionID: event.sessionID }));
      if (typeof text === 'string' && /<\/?private\b/i.test(text)) return;
      const title = typeof text === 'string' && text.trim() ? buildTicketSessionTitle(actor.agent, text) : undefined;
      if (title) event.result = title;
    } catch { /* Keep the host's normal title behavior on failure. */ }
  });
}

import type { Part } from "@opencode-ai/sdk"
import type { Plugin } from "@opencode-ai/plugin"

import { buildTicketSessionTitle, isDefaultSessionTitle } from "../lib/ticket-session-title.ts"

const TicketSessionTitlePlugin: Plugin = async ({ client, directory }) => {
  const processedSessions = new Set<string>()

  return {
    "chat.message": async (input, output) => {
      if (processedSessions.has(input.sessionID)) return

      const text = output.parts
        .filter((part): part is Part & { type: "text"; text: string } => part.type === "text")
        .filter((part) => !part.synthetic)
        .map((part) => part.text)
        .join("\n")
        .trim()
      const title = buildTicketSessionTitle(input.agent, text)
      if (!title) return

      try {
        const response = await client.session.get({
          path: { id: input.sessionID },
          query: { directory },
        })
        const session = response.data
        if (!session || session.parentID || !isDefaultSessionTitle(session.title)) return

        await client.session.update({
          path: { id: input.sessionID },
          query: { directory },
          body: { title },
        })
        processedSessions.add(input.sessionID)
      } catch {
        // El naming es best-effort: nunca debe bloquear el prompt del usuario.
      }
    },
  }
}

export default TicketSessionTitlePlugin

import type { Plugin } from "@opencode-ai/plugin"

const PLAN_AGENTS = new Set(["plan", "planner"])
const BUILD_AGENTS = new Set(["build", "master-dev", "agent-design"])

const PLAN_RULES = `## Ticketing workflow (optional addon)

If the current project explicitly uses a ticket workflow, you may rely on the assets installed by super-turing-opencode-ticketing.

- If the work is associated with a ticket and the project uses a canonical handoff, prefer the handoff artifact the project defines before ad-hoc planning notes.
- If the project uses the canonical \`tmp/<ticket>/verdict.md\` pattern, use it as the final planning artifact only when that workflow is actually enabled in the repo.
- If Jira helpers or local wrappers exist and are approved, you may use them; otherwise do not assume Jira access.
- Use the \`workflow-ticket-handoff\` skill when the project explicitly adopts that flow.
`

const BUILD_RULES = `## Ticketing + project templating workflow (optional addon)

If the current project explicitly uses a ticket workflow or project-layer scaffolding, you may rely on the assets installed by super-turing-opencode-ticketing.

- If a canonical ticket handoff exists, treat it as the primary implementation/design input before broad repo exploration.
- If the project uses the canonical \`tmp/<ticket>/result-dev.md\` pattern, write the final implementation artifact there only when that workflow is enabled.
- If the user asks to scaffold a project-specific OpenCode layer and the repo uses this addon, prefer the extracted templating assets and local overlay helpers instead of inventing a new structure.
- If Jira helpers or local wrappers exist and are approved, you may use them; otherwise do not assume Jira access.
`

export const TicketingCoupling: Plugin = async () => ({
  "experimental.chat.system.transform": async (input, output) => {
    const agent = typeof input?.agent === "string" ? input.agent : undefined
    if (!agent) return
    if (PLAN_AGENTS.has(agent)) {
      output.system = [[...output.system, PLAN_RULES].join("\n\n---\n\n")]
      return
    }
    if (BUILD_AGENTS.has(agent)) {
      output.system = [[...output.system, BUILD_RULES].join("\n\n---\n\n")]
    }
  },
})

export default TicketingCoupling

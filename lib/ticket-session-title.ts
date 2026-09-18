const TICKET_PATTERN = /\b([A-Z][A-Z0-9]{1,9}-\d+)\b/i
const MAX_TITLE_LENGTH = 100

type BranchPair = {
  origin: string
  destination: string
}

export function buildTicketSessionTitle(agent: string | undefined, text: string): string | undefined {
  if (agent === "planner") return buildAnalysisTitle(text)
  if (agent === "code-reviewer") return buildReviewTitle(text)
}

export function isDefaultSessionTitle(title: string): boolean {
  const generated = /^(?:New session|Child session) - \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
  return generated.test(title) || title === "New session" || title === "Untitled session"
}

function buildAnalysisTitle(text: string): string {
  const ticket = extractTicket(text)
  const description = extractDescription(text, ticket)
  return truncateTitle(["Análisis", ticket, description].filter(Boolean).join(" "))
}

function buildReviewTitle(text: string): string | undefined {
  const ticket = extractTicket(text)
  const pullRequest = extractPullRequest(text)
  if (pullRequest) return truncateTitle(`Review PR ${pullRequest}${ticket ? ` - ${ticket}` : ""}`)

  const branches = extractBranches(text)
  if (!branches) return

  const branchContainsTicket = [branches.origin, branches.destination].some((branch) => TICKET_PATTERN.test(branch))
  const suffix = ticket && !branchContainsTicket ? ` - ${ticket}` : ""
  return truncateTitle(`Review PR ${branches.destination} <- ${branches.origin}${suffix}`)
}

function extractTicket(text: string): string | undefined {
  return text.match(TICKET_PATTERN)?.[1]?.toUpperCase()
}

function extractPullRequest(text: string): string | undefined {
  return (
    text.match(/https?:\/\/\S+\/(?:pull|pulls|merge_requests)\/(\d+)(?:\b|\/)/i)?.[1] ??
    text.match(/\b(?:PR|pull request)\s*#?\s*(\d+)\b/i)?.[1]
  )
}

function extractBranches(text: string): BranchPair | undefined {
  const arrowToOrigin = text.match(/([A-Za-z0-9._/-]+)\s*<-\s*([A-Za-z0-9._/-]+)/)
  if (arrowToOrigin) return { destination: arrowToOrigin[1], origin: arrowToOrigin[2] }

  const arrowToDestination = text.match(/([A-Za-z0-9._/-]+)\s*->\s*([A-Za-z0-9._/-]+)/)
  if (arrowToDestination) return { origin: arrowToDestination[1], destination: arrowToDestination[2] }

  const named = text.match(
    /(?:rama\s+)?origen\s*[`:='"-]*\s*([A-Za-z0-9._/-]+)[`'"]?[\s\S]{0,120}?(?:rama\s+)?destino\s*[`:='"-]*\s*([A-Za-z0-9._/-]+)/i,
  )
  if (named) return { origin: named[1], destination: named[2] }
}

function extractDescription(text: string, ticket: string | undefined): string | undefined {
  const firstLine = text
    .split("\n")
    .map((line) => line.trim())
    .find(Boolean)
  if (!firstLine) return

  const description = firstLine
    .replace(/https?:\/\/\S+/gi, " ")
    .replace(ticket ? new RegExp(`\\b${escapeRegex(ticket)}\\b`, "gi") : /$^/, " ")
    .replace(/^\s*(?:por\s+favor\s+)?(?:quiero|necesito|pod[eé]s|puedes|deber[ií]as)\s+(?:que\s+)?/i, "")
    .replace(/^\s*(?:anali(?:z|c)[\p{L}]*|hac[eé]|hacer|prepar[aá]|preparar|arm[aá]|armar)\s+/iu, "")
    .replace(/^\s*(?:un\s+|el\s+)?an[aá]lisis\s+(?:de|del|sobre)\s+/i, "")
    .replace(/^\s*(?:el\s+)?ticket\s*/i, "")
    .replace(/^\s*(?:el|la|un|una)\s+/i, "")
    .replace(/(?:^|\s+)(?:con|usando)\s+(?:el\s+)?[`'"]?planner\b[`'"]?/gi, " ")
    .replace(/\s+/g, " ")
    .replace(/^[\s:;,.-]+|[\s:;,.-]+$/g, "")

  if (!description) return
  return truncateAtWord(description, 70)
}

function truncateTitle(title: string): string {
  return truncateAtWord(title, MAX_TITLE_LENGTH)
}

function truncateAtWord(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value
  const shortened = value.slice(0, maxLength - 3)
  const wordBoundary = shortened.lastIndexOf(" ")
  return `${(wordBoundary > 0 ? shortened.slice(0, wordBoundary) : shortened).trimEnd()}...`
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

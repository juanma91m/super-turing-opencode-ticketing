import assert from "node:assert/strict"
import test from "node:test"

import { buildTicketSessionTitle, isDefaultSessionTitle } from "../lib/ticket-session-title.ts"

test("nombra análisis con ticket y descripción", () => {
  assert.equal(
    buildTicketSessionTitle("planner", "Analizá el ticket VB-7579 actualización de librerias"),
    "Análisis VB-7579 actualización de librerias",
  )
})

test("nombra análisis sin ticket", () => {
  assert.equal(
    buildTicketSessionTitle("planner", "Quiero que analices la estrategia de cache distribuida"),
    "Análisis estrategia de cache distribuida",
  )
})

test("admite análisis con ticket sin descripción", () => {
  assert.equal(buildTicketSessionTitle("planner", "Analizá el ticket VB-7579 con `planner`."), "Análisis VB-7579")
})

test("nombra review desde link de PR y ticket", () => {
  assert.equal(
    buildTicketSessionTitle("code-reviewer", "Revisá https://github.com/acme/repo/pull/802 para VB-7579"),
    "Review PR 802 - VB-7579",
  )
})

test("omite ticket cuando no fue informado en review de PR", () => {
  assert.equal(
    buildTicketSessionTitle("code-reviewer", "Review del PR https://github.com/acme/repo/pull/802"),
    "Review PR 802",
  )
})

test("nombra review por ramas con ticket explícito", () => {
  assert.equal(
    buildTicketSessionTitle(
      "code-reviewer",
      "Revisá la rama origen `fix_arreglo` contra la rama destino `main` para VB-7372",
    ),
    "Review PR main <- fix_arreglo - VB-7372",
  )
})

test("omite sufijo cuando la rama ya contiene el ticket", () => {
  assert.equal(
    buildTicketSessionTitle("code-reviewer", "Revisá main <- fix/VB-7372-arreglo para VB-7372"),
    "Review PR main <- fix/VB-7372-arreglo",
  )
})

test("no interviene para otros agentes ni reviews sin referencia", () => {
  assert.equal(buildTicketSessionTitle("master-dev", "Analizá VB-7579"), undefined)
  assert.equal(buildTicketSessionTitle("code-reviewer", "Revisá estos cambios"), undefined)
})

test("reconoce únicamente títulos iniciales", () => {
  assert.equal(isDefaultSessionTitle("New session - 2026-09-18T12:30:00.000Z"), true)
  assert.equal(isDefaultSessionTitle("Untitled session"), true)
  assert.equal(isDefaultSessionTitle("Mi título manual"), false)
})

test("el módulo autodetectado expone solamente la factory default", async () => {
  const pluginModule = await import("../plugins/ticket-session-title.ts")
  assert.deepEqual(Object.keys(pluginModule), ["default"])
})

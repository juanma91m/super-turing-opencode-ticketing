---
description: Revisa ramas por ticket Jira y guarda un informe incremental bajo tmp/<ticket>/code-review/.
agent: code-reviewer
subtask: false
---
Revisá el ticket `$1` comparando la rama origen `$2` contra la rama destino `$3`.

Aplicá `code-review-branch-to-branch` en modo ticket y el contrato local de review: consulta Jira acotada, helper y storage por ticket habilitados por el agente efectivo. Si no hay un contrato compatible, pedí el contexto/agente correspondiente; el comando no habilita permisos ni fallback global y no crea handoff de implementación.

Si falta ticket o rama, pedí aclaración antes de iniciar.

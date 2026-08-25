# Agent System

## Purpose

This repository uses specialised Claude Code agents as a small delivery team. MCP is the shared tools and data layer below those agents; it is not a second set of agents.

```text
Owner request
  -> orchestrator
  -> specialised implementation or review agents
  -> tester and, when needed, security-reviewer
  -> orchestrator summary
```

## Roles

| Role | Owns | Can change files | Required follow-up |
| --- | --- | --- | --- |
| `orchestrator` | Planning, routing, acceptance summary | No broad implementation | Routes reviews and reports outcome |
| `backend-dev` | `application/backend/**` | Yes | Tester for affected scenario |
| `frontend-dev` | Frontend behaviour and API integration | Yes | Tester; UI/UX review for visual changes |
| `ui-ux-designer` | Visual system, accessibility, responsive layout | Yes, frontend presentation only | Browser/preview check |
| `devops` | Compose, `deploy/**`, CI, `.gitignore` | Yes | Config or routing validation |
| `tester` | Behaviour, regressions, API/UI contracts | No | Reproducible report |
| `security-reviewer` | Auth, data isolation, secrets, dependencies, privacy | No | Evidence-based report |
| `mentor` | Code explanations, alternatives and learning exercises | No | A short lesson with a comprehension check |

The source of truth for each role is `.claude/agents/<role>.md`. Project-wide requirements stay in `CLAUDE.md`; do not copy them into every role file.

## Task Handoff

Every handoff from the orchestrator contains:

1. A concrete outcome, not a vague request to “improve” something.
2. Allowed files and explicitly excluded files.
3. Contracts with neighbouring layers: endpoint, request/response fields, migration shape, or UI state.
4. A verification command or user scenario.
5. Open questions and assumptions.

Agents return only four things: changed files, decision made, verification performed, and work that remains outside scope. This keeps the final summary factual and easy to review.

## Delivery Flow

| Change type | Route |
| --- | --- |
| A backend-only endpoint or migration | `backend-dev` -> `tester` |
| A frontend interaction | `frontend-dev` -> `tester` |
| A visual or accessibility change | `ui-ux-designer` -> `tester` |
| A cross-layer feature | `orchestrator` -> implementation agents in dependency order -> `tester` |
| Auth, user data, secrets, dependency, CORS or external API work | Relevant implementation agent -> `tester` + `security-reviewer` |
| Docker, proxy, CI or environment work | `devops` -> `tester` when behaviour changes -> `security-reviewer` when exposure or secrets change |
| Learning request or a significant finished change | Relevant role -> `mentor` -> owner |

Do not run two writing agents in the same files at once. For a cross-layer feature, define the API contract first, then make the backend change, then the frontend change.

## Engineering Principles

- New code, tests and configuration do not receive explanatory comments. Put explanations in the final chat response; preserve existing owner comments unless explicitly asked to change them.
- The working AI path is `CompanionChat` -> `/api/companion/*` -> Express -> Ollama `/api/chat`. Changes to it require coordinated frontend and backend tests plus security review of consent, sensitive messages, retention and data isolation.
- Before a substantial change, compare a simple option with a more complex one. Prefer the smallest reliable change that meets the current requirement and can be maintained by the project.
- Use project conventions and established practices. Favour clear names, small focused modules, explicit boundaries and tests for changed behaviour over new abstractions or speculative optimisation.

## MCP Rollout

Start with narrow, read-first tools. Each tool should have a typed input and a specific outcome. Avoid a generic `execute_any_command` tool.

| Phase | MCP capability | Users | Guardrails |
| --- | --- | --- | --- |
| 1 | Repository status, code search, targeted test/lint commands | All roles | No write access; commands are allow-listed |
| 2 | Browser preview, screenshots, console and network inspection | Frontend, UI/UX, tester | Local preview only; test accounts only |
| 3 | Database schema inspection and migration status | Backend, tester, security | Read-only by default; no production credentials |
| 4 | Git and pull-request metadata | Orchestrator, reviewers | Read-only; commit and push remain explicit user actions |
| 5 | Deployment status and logs | DevOps, security | Read-only; deploy requires explicit confirmation |

Keep credentials out of agent prompts, reports and repository files. Pass them only through environment variables managed outside Git. Sensitive health data must never be sent to an external MCP service without explicit review and approval.

## Acceptance Checklist

Before the orchestrator marks work complete:

- The responsible implementation agent completed its scoped change.
- The affected scenario has a reported test result, or the reason it could not be verified is stated.
- Security review exists for changes that affect sensitive boundaries.
- No reviewer silently edited code.
- The final report names changes, checks, known risks and excluded follow-up work.

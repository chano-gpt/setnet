# 0011 — Managed launches use each harness's auto-approval mode

Status: **Accepted** (2026-08-25)

## Context

setnet can start a coding-agent harness from Herd, Spaces, or a fresh shell. The original managed
profiles preserved interactive approval prompts: Claude used manual mode and Codex asked on request
inside its workspace-write sandbox. That was the safer default, but it made a phone-launched agent
stop at approval gates the operator had explicitly opened setnet to avoid babysitting.

The operator chose one consistent rule for app-launched sessions: enter the harness's supported
auto-approval mode, except OMO, whose permission flow remains owned by OMO. The exact switches are a
runtime contract rather than interchangeable spellings. They were checked against the installed CLI
help on 2026-08-25; OpenCode's switch was also checked against its official CLI documentation.

## Decision

Managed launch profiles use these arguments:

- Antigravity: `--dangerously-skip-permissions`
- OMO: no permission override
- Claude Code: `--permission-mode auto`
- Codex: `--approve-for-me`
- Pi: no override because its default has no per-tool approval gate
- OpenCode: `--auto`

Keep the allowlist in `bridge/agent-launch.ts` as the server-side authority. The browser catalog may
offer only the same IDs, but it is not a security boundary. Do not silently replace a harness's auto
mode with a broader bypass flag when an auto mode exists.

## Consequences

- Agents started from the app can execute tools without waiting for approval on every call. This is
  intentional and materially increases the consequence of exposing the setnet URL; README's remote
  shell warning must continue to name it.
- Codex keeps its workspace-write sandbox and routes approval decisions through automatic review;
  it does not use the broader `--dangerously-bypass-approvals-and-sandbox` mode.
- OMO remains visibly labelled “Own permissions” so the launcher never promises a mode it does not
  control.
- CLI flags can change independently. Re-verify the installed `--help` and the harness's official
  documentation before changing a profile, then update the launch tests and operator docs together.
- Revisit this decision if setnet gains a per-launch permission selector. Until then, one predictable
  policy is preferable to entry points that start the same harness with different authority.

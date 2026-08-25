/** The browser may choose only from this catalog; the bridge independently allowlists the same ids. */
export const LAUNCH_AGENTS = [
  { id: "agy", name: "Antigravity", description: "Google coding agent", autoMode: true },
  { id: "omo", name: "Omo", description: "Omo coding agent", autoMode: false },
  { id: "claude", name: "Claude Code", description: "Anthropic coding agent", autoMode: true },
  { id: "codex", name: "Codex", description: "OpenAI coding agent", autoMode: true },
  { id: "pi", name: "Pi", description: "Minimal coding agent", autoMode: true },
  { id: "opencode", name: "OpenCode", description: "Open-source coding agent", autoMode: true },
] as const satisfies readonly {
  id: string;
  name: string;
  description: string;
  autoMode: boolean;
}[];

export type LaunchAgent = (typeof LAUNCH_AGENTS)[number];
export type LaunchAgentId = LaunchAgent["id"];

export function launchAgentById(id: LaunchAgentId): LaunchAgent {
  return LAUNCH_AGENTS.find((agent) => agent.id === id)!;
}

import { LAUNCH_AGENTS } from "@/lib/launch-agents";
import type { AgentView } from "@/lib/types";

const CATALOG_NAMES = new Map<string, string>(LAUNCH_AGENTS.map((agent) => [agent.id, agent.name]));

/** A stable, readable identity for built-in and future Herdr agents alike. */
export function agentLabel(agent: Pick<AgentView, "agent" | "displayName">): string {
  const supplied = agent.displayName?.trim();
  if (supplied) return supplied;

  const id = agent.agent.trim();
  const known = CATALOG_NAMES.get(id.toLowerCase());
  if (known) return known;
  if (!id) return "Agent";

  return id
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((word) =>
      word.length <= 4 && word === word.toUpperCase() ? word : `${word.charAt(0).toUpperCase()}${word.slice(1)}`,
    )
    .join(" ");
}

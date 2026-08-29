/**
 * Agent-facing metadata Herdr already knows but setnet used to discard.
 *
 * Keep this harness-neutral: live integration state is trusted, while terminal titles are not.
 * Titles commonly survive a session change and therefore cannot identify the current task.
 */
export interface AgentMetadataSource {
  agent: string;
  workspaceLabel: string;
  displayAgent?: string | null;
  stateLabels?: Record<string, string> | null;
}

const ACTIVITY_LABEL_KEYS = ["activity", "task", "message", "summary", "goal"] as const;

function clean(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  // Metadata is not trusted markup. Drop control characters and collapse layout whitespace before
  // it ever reaches the browser; React still renders the result as a text node.
  const text = value
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return undefined;
  return text.length > 160 ? `${text.slice(0, 159).trimEnd()}…` : text;
}

/** Prefer the integration's human-facing name, while keeping the stable agent id as fallback. */
export function agentDisplayName(source: AgentMetadataSource): string | undefined {
  return clean(source.displayAgent);
}

/** Extract a concise current-task label without knowing which harness produced it. */
export function agentActivity(source: AgentMetadataSource): string | undefined {
  for (const key of ACTIVITY_LABEL_KEYS) {
    const label = clean(source.stateLabels?.[key]);
    if (label) return label;
  }
  return undefined;
}

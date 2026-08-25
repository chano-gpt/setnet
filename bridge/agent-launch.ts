export interface ManagedLaunchProfile {
  kind: string;
  args: readonly string[];
}

const MANAGED_LAUNCHES = {
  agy: { kind: "agy", args: ["--dangerously-skip-permissions"] },
  omo: { kind: "omo", args: [] },
  claude: { kind: "claude", args: ["--permission-mode", "auto"] },
  codex: { kind: "codex", args: ["--approve-for-me"] },
  pi: { kind: "pi", args: [] },
  opencode: { kind: "opencode", args: ["--auto"] },
} as const satisfies Record<string, ManagedLaunchProfile>;

export function managedLaunchFor(kind: string): ManagedLaunchProfile | null {
  if (!Object.hasOwn(MANAGED_LAUNCHES, kind)) return null;
  return MANAGED_LAUNCHES[kind as keyof typeof MANAGED_LAUNCHES];
}

export function managedAgentName(kind: string, paneId: string): string {
  return `collie-${kind}-${paneId}`
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .slice(0, 32);
}

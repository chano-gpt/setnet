import {
  CLAUDE,
  CODEX,
  OMP,
  OPENCODE,
  PI,
  type AgentCommand,
} from "@/lib/agent-command-catalogs";
import { AGY } from "@/lib/agent-command-catalogs/agy";
import { OMO } from "@/lib/agent-command-catalogs/omo";

export type { AgentCommand } from "@/lib/agent-command-catalogs";

export interface CommandCatalog {
  commands: readonly AgentCommand[];
  provenance: { kind: "bundled"; source: string } | { kind: "none" };
  completeness: "partial" | "unknown";
  freshness: "bundled" | "none";
  execution: "insert-only";
}

interface BundledCatalog {
  commands: readonly AgentCommand[];
  source: string;
}

const BUNDLED: Readonly<Record<string, BundledCatalog>> = {
  agy: { commands: AGY, source: "AGY 1.1.12 installed binary and bundled guide" },
  claude: { commands: CLAUDE, source: "Claude Code official documentation" },
  codex: { commands: CODEX, source: "Codex CLI official documentation" },
  pi: { commands: PI, source: "Pi built-in slash command source" },
  opencode: { commands: OPENCODE, source: "OpenCode official documentation" },
  omo: { commands: OMO, source: "Senpi 2026.8.12-4 installed static registrations" },
  omp: { commands: OMP, source: "OMP 17.2.12 terminal corpus" },
};

const ALIASES: Readonly<Record<string, keyof typeof BUNDLED>> = {
  agy: "agy",
  antigravity: "agy",
  "antigravity-cli": "agy",
  claude: "claude",
  "claude-code": "claude",
  codex: "codex",
  "codex-cli": "codex",
  pi: "pi",
  "pi-go": "pi",
  opencode: "opencode",
  "opencode-dev": "opencode",
  omp: "omp",
  "omp-dev": "omp",
  omo: "omo",
};

const UNKNOWN_CATALOG: CommandCatalog = {
  commands: [],
  provenance: { kind: "none" },
  completeness: "unknown",
  freshness: "none",
  execution: "insert-only",
};

export function commandCatalogFor(agent: string | undefined | null): CommandCatalog {
  if (!agent) return UNKNOWN_CATALOG;
  const key = agent.toLowerCase().trim();
  if (!Object.hasOwn(ALIASES, key)) return UNKNOWN_CATALOG;
  const alias = ALIASES[key];
  if (alias === undefined) return UNKNOWN_CATALOG;
  const catalog = BUNDLED[alias];
  return {
    commands: catalog.commands,
    provenance: { kind: "bundled", source: catalog.source },
    completeness: "partial",
    freshness: "bundled",
    execution: "insert-only",
  };
}

export function commandsFor(agent: string | undefined | null): readonly AgentCommand[] {
  return commandCatalogFor(agent).commands;
}

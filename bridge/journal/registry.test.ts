import { describe, expect, test } from "bun:test";

import { adapterFor, buildJournalRegistry, journalAgents } from "./registry.ts";

// The registry is the SINGLE decision site for "which agents have a journal". These tests pin the
// two properties that keep it from rotting: keys come from the adapters themselves, and a hostile
// agent name can't resolve to something that isn't an adapter.

const roots = {
  claude: ["/c"],
  codex: ["/x"],
  pi: ["/p"],
  omo: ["/m"],
  opencode: ["/o"],
};

describe("buildJournalRegistry", () => {
  test("serves the four verified harnesses", () => {
    expect(journalAgents(buildJournalRegistry(roots))).toEqual([
      "claude",
      "codex",
      "omo",
      "opencode",
      "pi",
    ]);
  });

  test("routes omo through its Pi-compatible journal", () => {
    const registry = buildJournalRegistry(roots);
    expect(adapterFor(registry, "omo")?.agent).toBe("omo");
  });

  test("every key IS its adapter's own agent string — the map can't drift from the adapters", () => {
    const registry = buildJournalRegistry(roots);
    for (const [key, adapter] of Object.entries(registry)) expect(adapter.agent).toBe(key);
  });
});

describe("adapterFor", () => {
  const registry = buildJournalRegistry(roots);

  test.each(["claude", "codex", "pi", "opencode"])("resolves %s", (agent) => {
    expect(adapterFor(registry, agent)?.agent).toBe(agent);
  });

  test("an agent with no journal is undefined, not a throw", () => {
    expect(adapterFor(registry, "aider")).toBeUndefined();
    expect(adapterFor(registry, undefined)).toBeUndefined();
  });

  // The agent string comes from Herdr, but it ORIGINATES in an agent's own report — so an inherited
  // Object.prototype key must not resolve to a function masquerading as an adapter.
  test.each(["toString", "constructor", "__proto__", "hasOwnProperty"])(
    "%s does not resolve to a non-adapter",
    (key) => {
      expect(adapterFor(registry, key)).toBeUndefined();
    },
  );
});

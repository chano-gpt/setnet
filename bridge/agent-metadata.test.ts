import { describe, expect, test } from "bun:test";

import { agentActivity, agentDisplayName, type AgentMetadataSource } from "./agent-metadata.ts";

describe("agent metadata", () => {
  test("extracts an OMO task from live structured state", () => {
    expect(
      agentActivity({
        agent: "omo",
        workspaceLabel: "dev",
        stateLabels: { task: "Running eval" },
      }),
    ).toBe("Running eval");
  });

  test("works for an unknown agent when it reports structured state", () => {
    expect(
      agentActivity({
        agent: "future-agent",
        workspaceLabel: "app",
        stateLabels: { activity: "Indexing docs" },
      }),
    ).toBe("Indexing docs");
  });

  test("never treats a stale terminal title as the current session or task", () => {
    expect(
      agentActivity({
        agent: "omo",
        workspaceLabel: "dev",
        terminalTitle: "omo - 이전 세션 - dev",
      } as AgentMetadataSource & { terminalTitle: string }),
    ).toBeUndefined();
  });

  test("prefers structured state and explicit integration metadata", () => {
    const source = {
      agent: "omo",
      workspaceLabel: "dev",
      displayAgent: "OmO Native",
      stateLabels: { task: "Structured task" },
    };
    expect(agentDisplayName(source)).toBe("OmO Native");
    expect(agentActivity(source)).toBe("Structured task");
  });

  test("sanitizes and bounds metadata before it reaches the wire", () => {
    const activity = agentActivity({
      agent: "x",
      workspaceLabel: "dev",
      stateLabels: { task: `hello\u0000\n${"x".repeat(200)}` },
    });
    expect(activity).not.toContain("\u0000");
    expect(activity).not.toContain("\n");
    expect(activity?.length).toBe(160);
    expect(activity?.endsWith("…")).toBe(true);
  });
});

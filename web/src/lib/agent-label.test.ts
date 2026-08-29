import { describe, expect, it } from "vitest";

import { agentLabel } from "./agent-label";

describe("agentLabel", () => {
  it("uses polished catalog names for known agents", () => {
    expect(agentLabel({ agent: "omo" })).toBe("Omo");
    expect(agentLabel({ agent: "opencode" })).toBe("OpenCode");
  });

  it("honors an integration-supplied display name", () => {
    expect(agentLabel({ agent: "omo", displayName: "OmO Native" })).toBe("OmO Native");
  });

  it("turns any unknown id into a readable fallback", () => {
    expect(agentLabel({ agent: "future_agent" })).toBe("Future Agent");
    expect(agentLabel({ agent: "GPT-cli" })).toBe("GPT Cli");
  });
});

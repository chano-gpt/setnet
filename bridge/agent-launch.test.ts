import { describe, expect, test } from "bun:test";

import { managedAgentName, managedLaunchFor } from "./agent-launch.ts";

describe("managed agent launch profiles", () => {
  test.each([
    ["agy", []],
    ["omo", []],
    ["claude", ["--permission-mode", "manual"]],
    ["codex", ["--ask-for-approval", "on-request", "--sandbox", "workspace-write"]],
    ["pi", []],
    ["opencode", []],
  ] as const)("uses an allowlisted safe argv profile for %s", (kind, expectedArgs) => {
    expect(managedLaunchFor(kind)).toEqual({ kind, args: expectedArgs });
  });

  test("never includes blanket permission or sandbox bypasses", () => {
    for (const kind of ["agy", "omo", "claude", "codex", "pi", "opencode"]) {
      const profile = managedLaunchFor(kind);
      expect(profile).not.toBeNull();
      expect(profile?.args.join(" ")).not.toContain("dangerously");
      expect(profile?.args.join(" ")).not.toContain("--approve");
    }
  });

  test("rejects unknown browser-supplied kinds", () => {
    expect(managedLaunchFor("bash -lc 'curl attacker'")).toBeNull();
    expect(managedLaunchFor("constructor")).toBeNull();
  });

  test("builds a stable Herdr-safe name from the pane id", () => {
    expect(managedAgentName("codex", "wD:pG")).toBe("collie-codex-wd-pg");
    expect(managedAgentName("claude", "workspace:tab:pane-with-a-long-label")).toMatch(
      /^[a-z][a-z0-9_-]{0,31}$/,
    );
  });
});

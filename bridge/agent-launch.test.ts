import { describe, expect, test } from "bun:test";

import { managedAgentName, managedLaunchFor } from "./agent-launch.ts";

describe("managed agent launch profiles", () => {
  test.each([
    ["agy", ["--dangerously-skip-permissions"]],
    ["omo", []],
    ["claude", ["--permission-mode", "auto"]],
    ["codex", ["--approve-for-me"]],
    ["pi", []],
    ["opencode", ["--auto"]],
  ] as const)("uses an allowlisted autonomous argv profile for %s", (kind, expectedArgs) => {
    expect(managedLaunchFor(kind)).toEqual({ kind, args: expectedArgs });
  });

  test("keeps OMO on its own permission flow", () => {
    expect(managedLaunchFor("omo")?.args).toEqual([]);
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

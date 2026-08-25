import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { startAgent } from "@/lib/api";
import { AgentLauncher } from "./agent-launcher";

vi.mock("@/lib/api", () => ({
  startAgent: vi.fn(),
}));

vi.mock("@/lib/status", () => ({
  setStatus: vi.fn(),
}));

const mockedStartAgent = vi.mocked(startAgent);

describe("AgentLauncher", () => {
  beforeEach(() => {
    mockedStartAgent.mockReset();
    mockedStartAgent.mockResolvedValue({ ok: true });
  });

  it.each([
    ["Antigravity", "agy"],
    ["Omo", "omo"],
    ["Claude Code", "claude"],
    ["Codex", "codex"],
    ["Pi", "pi"],
    ["OpenCode", "opencode"],
  ])("launches %s through Herdr managed start", async (label, kind) => {
    const user = userEvent.setup();
    render(<AgentLauncher paneId="w1:p1" session="remote" />);

    await user.click(screen.getByRole("button", { name: `Launch ${label}` }));

    expect(mockedStartAgent).toHaveBeenCalledExactlyOnceWith("w1:p1", kind, "remote");
  });

  it("describes autonomous managed startup and the Omo exception", () => {
    render(<AgentLauncher paneId="w1:p1" />);

    expect(screen.getByText(/starts in auto mode/i)).toBeInTheDocument();
    expect(screen.getByText(/omo keeps its own permission flow/i)).toBeInTheDocument();
  });
});

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { AgentView } from "@/lib/types";
import { DashboardComposer } from "./dashboard-composer";

const agent: AgentView = {
  paneId: "w1:p1",
  workspaceId: "w1",
  workspaceLabel: "collie-ux",
  workspaceNumber: 1,
  tabId: "w1:t1",
  agent: "omo",
  status: "idle",
  cwd: "/home/noah/dev/projects/collie",
  focused: false,
};

describe("DashboardComposer", () => {
  it("preserves the draft across polling updates for the same pane", async () => {
    const view = render(
      <DashboardComposer agent={agent} readOnly={false} onClose={vi.fn()} />,
    );
    const input = screen.getByRole("textbox", { name: "Message" });
    await userEvent.type(input, "/ulw-plan");

    view.rerender(
      <DashboardComposer
        agent={{ ...agent, status: "working", lastActiveAt: 2 }}
        readOnly={false}
        onClose={vi.fn()}
      />,
    );

    expect(input).toHaveValue("/ulw-plan");
  });
});

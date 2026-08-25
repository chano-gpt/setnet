import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { NewAgentSheet } from "./new-agent-sheet";
import type { WorkspaceView } from "@/lib/types";

const workspaces: WorkspaceView[] = [
  {
    workspaceId: "w1",
    number: 1,
    label: "alpha",
    focused: false,
    activeTabId: "w1:t1",
    tabCount: 1,
    paneCount: 1,
  },
  {
    workspaceId: "w2",
    number: 2,
    label: "beta",
    focused: false,
    activeTabId: "w2:t1",
    tabCount: 1,
    paneCount: 1,
  },
];

describe("NewAgentSheet", () => {
  it("starts the chosen agent directly in the selected space", async () => {
    const user = userEvent.setup();
    const onCreate = vi.fn().mockResolvedValue(true);
    const onClose = vi.fn();
    render(
      <NewAgentSheet
        open
        workspaces={workspaces}
        onClose={onClose}
        onCreate={onCreate}
        onNewSpace={vi.fn()}
      />,
    );

    await user.selectOptions(screen.getByRole("combobox", { name: /space/i }), "w2");
    await user.click(screen.getByRole("button", { name: /start codex in beta/i }));

    expect(onCreate).toHaveBeenCalledExactlyOnceWith("w2", "codex");
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("keeps the sheet open after a failed launch", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <NewAgentSheet
        open
        workspaces={workspaces}
        onClose={onClose}
        onCreate={vi.fn().mockResolvedValue(false)}
        onNewSpace={vi.fn()}
      />,
    );
    await user.click(screen.getByRole("button", { name: /start claude code in alpha/i }));
    expect(onClose).not.toHaveBeenCalled();
  });

  it("routes an empty install to space creation", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onNewSpace = vi.fn();
    render(
      <NewAgentSheet
        open
        workspaces={[]}
        onClose={onClose}
        onCreate={vi.fn()}
        onNewSpace={onNewSpace}
      />,
    );
    await user.click(screen.getByRole("button", { name: /new space/i }));
    expect(onClose).toHaveBeenCalledOnce();
    expect(onNewSpace).toHaveBeenCalledOnce();
  });
});

import { act, render, screen } from "@testing-library/react";
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
    const onCreate = vi.fn().mockResolvedValue({ ok: true });
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

  it("keeps the sheet open and shows the reason after a failed launch", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <NewAgentSheet
        open
        workspaces={workspaces}
        onClose={onClose}
        onCreate={vi.fn().mockResolvedValue({ ok: false, error: "Read-only device" })}
        onNewSpace={vi.fn()}
      />,
    );
    await user.click(screen.getByRole("button", { name: /start claude code in alpha/i }));
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("Read-only device");
  });

  it("carries the chosen agent into space creation on an empty install", async () => {
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
    await user.click(screen.getByRole("button", { name: /start codex in a new space/i }));
    expect(onClose).toHaveBeenCalledOnce();
    expect(onNewSpace).toHaveBeenCalledExactlyOnceWith("codex");
  });

  it("does not unlock a slow launch when polling replaces the workspace array", async () => {
    const user = userEvent.setup();
    let finish!: (result: { ok: true }) => void;
    const onCreate = vi.fn(
      () => new Promise<{ ok: true }>((resolve) => {
        finish = resolve;
      }),
    );
    const { rerender } = render(
      <NewAgentSheet
        open
        workspaces={workspaces}
        onClose={vi.fn()}
        onCreate={onCreate}
        onNewSpace={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: /start codex in alpha/i }));
    rerender(
      <NewAgentSheet
        open
        workspaces={[...workspaces]}
        onClose={vi.fn()}
        onCreate={onCreate}
        onNewSpace={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: /start claude code in alpha/i })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: /start claude code in alpha/i }));
    expect(onCreate).toHaveBeenCalledOnce();
    await act(async () => finish({ ok: true }));
  });
});

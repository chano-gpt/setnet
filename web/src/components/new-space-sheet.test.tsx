import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { NewSpaceSheet } from "./new-space-sheet";

describe("NewSpaceSheet", () => {
  it("waits for creation and closes only on success", async () => {
    const user = userEvent.setup();
    let finish!: (result: { ok: true }) => void;
    const onCreate = vi.fn(
      () => new Promise<{ ok: true }>((resolve) => {
        finish = resolve;
      }),
    );
    const onClose = vi.fn();
    render(<NewSpaceSheet open onClose={onClose} onCreate={onCreate} />);

    await user.type(screen.getByLabelText(/directory/i), "/work/new");
    await user.type(screen.getByLabelText(/label/i), "new work");
    const submit = screen.getByRole("button", { name: /create space & open shell/i });
    await user.click(submit);

    expect(onCreate).toHaveBeenCalledExactlyOnceWith({ cwd: "/work/new", label: "new work" });
    expect(submit).toBeDisabled();
    expect(onClose).not.toHaveBeenCalled();
    await user.click(submit);
    expect(onCreate).toHaveBeenCalledOnce();
    await act(async () => finish({ ok: true }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("shows an inline error and keeps the form open", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <NewSpaceSheet
        open
        onClose={onClose}
        onCreate={vi.fn().mockResolvedValue({ ok: false, error: "Directory refused" })}
        submitLabel="Create space & start Codex"
      />,
    );

    await user.click(screen.getByRole("button", { name: /create space & start codex/i }));
    expect(screen.getByRole("alert")).toHaveTextContent("Directory refused");
    expect(onClose).not.toHaveBeenCalled();
  });
});

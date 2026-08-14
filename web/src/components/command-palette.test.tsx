import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { CommandPalette } from "./command-palette";

function setup(overrides?: { agent?: string | null }) {
  const props = {
    open: true,
    onClose: vi.fn(),
    agent: "claude" as string | null | undefined,
    onInsert: vi.fn(),
    onSubmit: vi.fn(),
    ...overrides,
  };
  render(<CommandPalette {...props} />);
  return props;
}

describe("CommandPalette", () => {
  it("shows only common commands when the query is empty", () => {
    setup();
    // /status is common; /doctor is not.
    expect(screen.getByText("/status")).toBeInTheDocument();
    expect(screen.queryByText("/doctor")).toBeNull();
  });

  it("filters across the full catalog as you type", async () => {
    const user = userEvent.setup();
    setup();
    const search = screen.getByPlaceholderText(/Search \d+ commands/);
    await user.type(search, "doctor");
    expect(screen.getByText("/doctor")).toBeInTheDocument();
    // Non-matching common commands fall away.
    expect(screen.queryByText("/status")).toBeNull();
  });

  it("shows an empty state when nothing matches", async () => {
    const user = userEvent.setup();
    setup();
    await user.type(screen.getByPlaceholderText(/Search \d+ commands/), "zzzznotacommand");
    expect(screen.getByText(/No commands match/)).toBeInTheDocument();
  });

  it("inserts a bundled no-arg command for review instead of submitting it", async () => {
    const user = userEvent.setup();
    const props = setup();
    await user.click(screen.getByText("/status"));
    expect(props.onInsert).toHaveBeenCalledExactlyOnceWith("/status");
    expect(props.onClose).toHaveBeenCalledOnce();
    expect(props.onSubmit).not.toHaveBeenCalled();
  });

  it("inserts an arg-taking command into the composer (with trailing space) and closes", async () => {
    const user = userEvent.setup();
    const props = setup();
    await user.click(screen.getByText("/compact")); // takesArg: true
    expect(props.onInsert).toHaveBeenCalledExactlyOnceWith("/compact ");
    expect(props.onClose).toHaveBeenCalledOnce();
    expect(props.onSubmit).not.toHaveBeenCalled();
  });

  it("inserts a dangerous bundled command without executing it", async () => {
    const user = userEvent.setup();
    const props = setup();

    await user.click(screen.getByText("/clear"));
    expect(props.onInsert).toHaveBeenCalledExactlyOnceWith("/clear");
    expect(props.onSubmit).not.toHaveBeenCalled();
    expect(props.onClose).toHaveBeenCalledOnce();
  });

  it("renders nothing for an unknown agent (empty catalog → sheet still opens but no commands)", () => {
    setup({ agent: "gemini" });
    expect(screen.queryByText("/status")).toBeNull();
    expect(screen.queryByText("/compact")).toBeNull();
  });

  it("uses the omp catalog for the current omo harness name", () => {
    setup({ agent: "omo" });
    expect(screen.getByText("/tasks")).toBeInTheDocument();
  });

  it("shows AGY's conservative bundled fallback", () => {
    setup({ agent: "agy" });
    expect(screen.getByText("/help")).toBeInTheDocument();
  });
});

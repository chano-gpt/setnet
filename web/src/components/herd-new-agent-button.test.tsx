import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { HerdNewAgentButton } from "./herd-new-agent-button";

describe("HerdNewAgentButton", () => {
  it("stays centered above the bottom navigation and opens agent creation", async () => {
    const onClick = vi.fn();
    const { container } = render(<HerdNewAgentButton onClick={onClick} />);

    expect(container.firstElementChild).toHaveClass("fixed", "inset-x-0", "justify-center");
    await userEvent.click(screen.getByRole("button", { name: /new agent/i }));
    expect(onClick).toHaveBeenCalledOnce();
  });
});

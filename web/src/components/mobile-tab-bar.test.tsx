import { fireEvent, render, screen } from "@testing-library/react";

import { MobileTabBar } from "./mobile-tab-bar";

describe("MobileTabBar", () => {
  it("exposes the active destination and attention count", () => {
    render(
      <MobileTabBar
        active="herd"
        attentionCount={3}
        onSelect={vi.fn()}
        onSettings={vi.fn()}
      />,
    );

    expect(screen.getByRole("navigation", { name: "Primary" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Herd, 3 need attention" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("switches sections and opens settings", () => {
    const onSelect = vi.fn();
    const onSettings = vi.fn();
    render(
      <MobileTabBar
        active="spaces"
        attentionCount={0}
        onSelect={onSelect}
        onSettings={onSettings}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Herd" }));
    fireEvent.click(screen.getByRole("button", { name: "Spaces" }));
    fireEvent.click(screen.getByRole("button", { name: "Settings" }));

    expect(onSelect).toHaveBeenNthCalledWith(1, "herd");
    expect(onSelect).toHaveBeenNthCalledWith(2, "spaces");
    expect(onSettings).toHaveBeenCalledOnce();
  });
});

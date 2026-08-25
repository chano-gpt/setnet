import { useState } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, Outlet, RouterProvider, useLocation } from "react-router";

import * as api from "@/lib/api";
import { ROOT_ROUTE_ID, type HomeData } from "@/lib/loaders";
import { useSpaceActions } from "./use-spaces";

vi.mock("@/lib/api", () => ({
  createTab: vi.fn(),
  createWorkspace: vi.fn(),
  startAgent: vi.fn(),
}));

vi.mock("@/lib/status", () => ({ setStatus: vi.fn() }));

const home: HomeData = {
  bridge: "connected",
  device: undefined,
  agents: [],
  shellPanes: [],
  workspaces: [],
  tabs: [],
  sessions: [],
  session: "remote",
  snoozedUntil: null,
  update: undefined,
  error: false,
  authError: false,
};

function LaunchHarness() {
  const { newAgent, newSpaceAgent } = useSpaceActions();
  const [result, setResult] = useState("");
  return (
    <>
      <button
        onClick={() =>
          void newAgent("w1", "codex").then((value) => setResult(JSON.stringify(value)))
        }
      >
        Launch
      </button>
      <button onClick={() => void newSpaceAgent({ label: "new" }, "claude")}>Launch in new</button>
      <output>{result}</output>
    </>
  );
}

function Destination() {
  const location = useLocation();
  return <pre data-testid="state">{JSON.stringify(location.state)}</pre>;
}

function view() {
  const router = createMemoryRouter(
    [
      {
        id: ROOT_ROUTE_ID,
        path: "/",
        loader: () => home,
        element: <Outlet />,
        children: [
          { index: true, element: <LaunchHarness /> },
          { path: "pane/:paneId", element: <Destination /> },
        ],
      },
    ],
    { initialEntries: ["/"] },
  );
  render(<RouterProvider router={router} />);
  return router;
}

describe("useSpaceActions — direct agent creation", () => {
  beforeEach(() => {
    vi.mocked(api.createTab).mockReset();
    vi.mocked(api.createWorkspace).mockReset();
    vi.mocked(api.startAgent).mockReset();
    vi.mocked(api.createTab).mockResolvedValue({
      ok: true,
      pane: {
        paneId: "w1:p2",
        workspaceId: "w1",
        workspaceLabel: "alpha",
        tabId: "w1:t2",
        cwd: "/work/alpha",
      },
    });
  });

  it("creates a tab, starts the chosen harness, and navigates with an agent fallback", async () => {
    vi.mocked(api.startAgent).mockResolvedValue({ ok: true });
    const router = view();
    await userEvent.click(await screen.findByRole("button", { name: "Launch" }));

    await waitFor(() => expect(router.state.location.pathname).toBe("/pane/w1%3Ap2"));
    expect(api.createTab).toHaveBeenCalledExactlyOnceWith("w1", {}, "remote");
    expect(api.startAgent).toHaveBeenCalledExactlyOnceWith("w1:p2", "codex", "remote");
    expect(screen.getByTestId("state")).toHaveTextContent('"agent":"codex"');
    expect(screen.getByTestId("state")).toHaveTextContent('"kind":"agent"');
  });

  it("returns a visible error instead of reporting a managed-start failure as success", async () => {
    vi.mocked(api.startAgent).mockResolvedValue({ ok: false, error: "missing binary" });
    const router = view();
    await userEvent.click(await screen.findByRole("button", { name: "Launch" }));

    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("missing binary"));
    expect(screen.getByRole("status")).toHaveTextContent('"ok":false');
    expect(router.state.location.pathname).toBe("/");
  });

  it("opens the retained shell when managed start becomes network-ambiguous", async () => {
    vi.mocked(api.startAgent).mockRejectedValue(new Error("connection reset"));
    const router = view();
    await userEvent.click(await screen.findByRole("button", { name: "Launch" }));

    await waitFor(() => expect(router.state.location.pathname).toBe("/pane/w1%3Ap2"));
    const state = screen.getByTestId("state");
    expect(state).toHaveTextContent('"selectAgent":true');
    expect(state).toHaveTextContent('"agent":"shell"');
    expect(state).toHaveTextContent('"kind":"shell"');
  });

  it("starts an agent in a new workspace's initial pane without creating an extra tab", async () => {
    vi.mocked(api.createWorkspace).mockResolvedValue({
      ok: true,
      pane: {
        paneId: "w2:p1",
        workspaceId: "w2",
        workspaceLabel: "new",
        tabId: "w2:t1",
        cwd: "/home/you",
      },
    });
    vi.mocked(api.startAgent).mockResolvedValue({ ok: true });
    const router = view();
    await userEvent.click(await screen.findByRole("button", { name: "Launch in new" }));

    await waitFor(() => expect(router.state.location.pathname).toBe("/pane/w2%3Ap1"));
    expect(api.createWorkspace).toHaveBeenCalledExactlyOnceWith({ label: "new" }, "remote");
    expect(api.createTab).not.toHaveBeenCalled();
    expect(api.startAgent).toHaveBeenCalledExactlyOnceWith("w2:p1", "claude", "remote");
  });
});

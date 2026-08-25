import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";

import { server } from "@/test/setup";
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

  // This sheet is the SHORTEST path from a push notification to a reply, and it has no mirror — it
  // cannot see a dialog or verify that the text landed. The three tests below pin the guarantees it
  // can still make, because it used to make none of them.

  it("makes a destructive message take a second tap", async () => {
    const sent: string[] = [];
    server.use(
      http.post("/api/pane/:paneId/prompt", async ({ request }) => {
        sent.push(((await request.json()) as { text: string }).text);
        return HttpResponse.json({ ok: true });
      }),
    );
    render(<DashboardComposer agent={agent} readOnly={false} onClose={vi.fn()} />);
    await userEvent.type(screen.getByRole("textbox", { name: "Message" }), "sudo rm -rf /tmp/x");

    await userEvent.click(screen.getByRole("button", { name: /send/i }));
    expect(sent).toEqual([]);
    expect(await screen.findByRole("button", { name: /really send/i })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /really send/i }));
    await waitFor(() => expect(sent).toEqual(["sudo rm -rf /tmp/x"]));
  });

  // `blocked` is the one piece of dialog knowledge a mirror-less surface has. Sending free text at a
  // blocked agent is the #34 failure: the text is swallowed and the Enter answers the question.
  it("warns and confirms before messaging a blocked agent", async () => {
    const sent: string[] = [];
    server.use(
      http.post("/api/pane/:paneId/prompt", async ({ request }) => {
        sent.push(((await request.json()) as { text: string }).text);
        return HttpResponse.json({ ok: true });
      }),
    );
    render(
      <DashboardComposer
        agent={{ ...agent, status: "blocked" }}
        readOnly={false}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText(/waiting on a question/i)).toBeInTheDocument();

    await userEvent.type(screen.getByRole("textbox", { name: "Message" }), "go ahead");
    await userEvent.click(screen.getByRole("button", { name: /send/i }));
    expect(sent).toEqual([]);
    await userEvent.click(screen.getByRole("button", { name: /really send/i }));
    await waitFor(() => expect(sent).toEqual(["go ahead"]));
  });

  it("keeps the draft and the sheet open when the send fails", async () => {
    const onClose = vi.fn();
    server.use(
      http.post("/api/pane/:paneId/prompt", () =>
        HttpResponse.json({ ok: false, error: "agent is blocked" }, { status: 502 }),
      ),
    );
    render(<DashboardComposer agent={agent} readOnly={false} onClose={onClose} />);
    const input = screen.getByRole("textbox", { name: "Message" });
    await userEvent.type(input, "status?");
    await userEvent.click(screen.getByRole("button", { name: /send/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/agent is blocked/i);
    expect(input).toHaveValue("status?");
    expect(onClose).not.toHaveBeenCalled();
  });
});

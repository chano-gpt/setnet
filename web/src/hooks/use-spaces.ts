import { useCallback, useRef } from "react";
import { useNavigate, useRevalidator, useRouteLoaderData } from "react-router";

import * as api from "@/lib/api";
import { setStatus } from "@/lib/status";
import { panePath } from "@/lib/nav";
import { ROOT_ROUTE_ID, type HomeData } from "@/lib/loaders";
import type { AgentLaunchResult, LaunchAgentId } from "@/lib/launch-agents";
import { isReadOnly, type AgentView, type CreateResponse } from "@/lib/types";

function freshPaneFromCreate(
  pane: Extract<CreateResponse, { ok: true }>["pane"],
  agent: LaunchAgentId | "shell" = "shell",
): AgentView {
  return {
    paneId: pane.paneId,
    workspaceId: pane.workspaceId,
    workspaceLabel: pane.workspaceLabel,
    workspaceNumber: 0,
    tabId: pane.tabId,
    agent,
    status: "unknown",
    cwd: pane.cwd,
    focused: false,
    kind: agent === "shell" ? "shell" : "agent",
  };
}

// Shared "create a tab/space, then jump into its fresh shell" flow, used by the home space view and
// the detail Herdr palette. The new pane won't be in the snapshot until the next poll, so we pass
// it through navigation state (`freshPane`) — the detail route falls back to it so the composer is
// live immediately (no "agent gone" flash) while a revalidate catches the snapshot up.
export function useSpaceActions() {
  const navigate = useNavigate();
  const revalidator = useRevalidator();
  // revalidator changes identity each revalidation cycle; keep the callbacks stable via a ref so
  // they don't break a memoized child when passed as props.
  const revalidatorRef = useRef(revalidator);
  revalidatorRef.current = revalidator;

  // Creating a tab/space is a sensitive (structural) action — a read-only device can't, and the
  // bridge rejects it anyway. Short-circuit centrally so every create entry point (tab strip,
  // space list, command palette) is covered with one friendly notice. Read via a ref so the
  // returned callbacks stay stable across revalidations.
  const root = useRouteLoaderData(ROOT_ROUTE_ID) as HomeData | undefined;
  const readOnlyRef = useRef(false);
  readOnlyRef.current = isReadOnly(root?.device);
  // The session the new tab/space must be created in (and navigated into). Read via a ref so the
  // returned callbacks stay stable across revalidations, like readOnly above.
  const sessionRef = useRef<string | undefined>(undefined);
  sessionRef.current = root?.session;

  const open = useCallback(
    (res: CreateResponse, what: "tab" | "space") => {
      if (!res.ok) {
        setStatus(res.error, "error");
        return;
      }
      const pane = res.pane;
      setStatus(`New ${what} ready — launch your agent`, "success");
      revalidatorRef.current.revalidate();
      navigate(panePath(pane.paneId, sessionRef.current), {
        state: { freshPane: freshPaneFromCreate(pane), selectAgent: what === "tab" },
      });
    },
    [navigate],
  );

  const newTab = useCallback(
    async (workspaceId: string) => {
      if (readOnlyRef.current) return setStatus("Read-only — device not authorised", "error");
      try {
        open(await api.createTab(workspaceId, {}, sessionRef.current), "tab");
      } catch (e) {
        setStatus(e instanceof Error ? e.message : String(e), "error");
      }
    },
    [open],
  );

  const newSpace = useCallback(
    async (opts: { label?: string; cwd?: string } = {}): Promise<AgentLaunchResult> => {
      if (readOnlyRef.current) {
        const error = "Read-only — device not authorised";
        setStatus(error, "error");
        return { ok: false, error };
      }
      try {
        const created = await api.createWorkspace(opts, sessionRef.current);
        if (!created.ok) {
          setStatus(created.error, "error");
          return created;
        }
        open(created, "space");
        return { ok: true };
      } catch (e) {
        const error = e instanceof Error ? e.message : String(e);
        setStatus(error, "error");
        return { ok: false, error };
      }
    },
    [open],
  );

  const launchCreatedAgent = useCallback(
    async (
      created: Extract<CreateResponse, { ok: true }>,
      kind: LaunchAgentId,
    ): Promise<AgentLaunchResult> => {
      const started = await api.startAgent(created.pane.paneId, kind, sessionRef.current);
      if (!started.ok) {
        setStatus(`${started.error} — fresh shell kept`, "error");
        revalidatorRef.current.revalidate();
        navigate(panePath(created.pane.paneId, sessionRef.current), {
          state: { freshPane: freshPaneFromCreate(created.pane), selectAgent: true },
        });
        return { ok: true };
      }
      setStatus(`Launching ${kind} in ${created.pane.workspaceLabel}`, "success");
      revalidatorRef.current.revalidate();
      navigate(panePath(created.pane.paneId, sessionRef.current), {
        state: { freshPane: freshPaneFromCreate(created.pane, kind) },
      });
      return { ok: true };
    },
    [navigate],
  );

  const newAgent = useCallback(
    async (workspaceId: string, kind: LaunchAgentId): Promise<AgentLaunchResult> => {
      if (readOnlyRef.current) {
        const error = "Read-only — device not authorised";
        setStatus(error, "error");
        return { ok: false, error };
      }
      try {
        const created = await api.createTab(workspaceId, {}, sessionRef.current);
        if (!created.ok) {
          setStatus(created.error, "error");
          return created;
        }
        return await launchCreatedAgent(created, kind);
      } catch (e) {
        const error = e instanceof Error ? e.message : String(e);
        setStatus(error, "error");
        return { ok: false, error };
      }
    },
    [launchCreatedAgent],
  );

  const newSpaceAgent = useCallback(
    async (
      opts: { label?: string; cwd?: string },
      kind: LaunchAgentId,
    ): Promise<AgentLaunchResult> => {
      if (readOnlyRef.current) {
        const error = "Read-only — device not authorised";
        setStatus(error, "error");
        return { ok: false, error };
      }
      try {
        const created = await api.createWorkspace(opts, sessionRef.current);
        if (!created.ok) {
          setStatus(created.error, "error");
          return created;
        }
        return await launchCreatedAgent(created, kind);
      } catch (e) {
        const error = e instanceof Error ? e.message : String(e);
        setStatus(error, "error");
        return { ok: false, error };
      }
    },
    [launchCreatedAgent],
  );

  return { newTab, newSpace, newAgent, newSpaceAgent };
}

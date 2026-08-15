import { useState } from "react";
import { useLocation, useNavigate, useRouteLoaderData } from "react-router";

import { AppHeader } from "@/components/app-header";
import { SessionSwitcher } from "@/components/session-switcher";
import { ReadOnlyBanner } from "@/components/read-only-banner";
import { AgentList } from "@/components/agent-list";
import { SpaceOverview } from "@/components/space-overview";
import { NewSpaceSheet } from "@/components/new-space-sheet";
import { StatusArea } from "@/components/status-area";
import { BuildStamp } from "@/components/build-stamp";
import { UpdateBanner } from "@/components/update-banner";
import { MobileTabBar } from "@/components/mobile-tab-bar";
import { DashboardComposer } from "@/components/dashboard-composer";
import { useDashPrefs, openForCount } from "@/hooks/use-dash-prefs";
import { useLoadingStalled } from "@/hooks/use-loading-stalled";
import { useSpaceActions } from "@/hooks/use-spaces";
import { ROOT_ROUTE_ID, type HomeData } from "@/lib/loaders";
import { homeSectionFromSearch, homeSectionPath, panePath, settingsPath, spacePath } from "@/lib/nav";
import { bucketOf } from "@/lib/triage";

// Dashboard home screen. The bottom tab bar separates the action queue (Herd) from navigation
// (Spaces), so neither can bury the other on a phone. Herd keeps the urgency order from triage.ts;
// Spaces keeps its search and creation tools. The URL carries the selected tab so reload and browser
// history preserve the user's place.
export function HomeRoute() {
  const data = useRouteLoaderData(ROOT_ROUTE_ID) as HomeData;
  // A stalled load (a black-holed poll, or a pane-open tap whose navigation hangs) gallops the
  // Collie mark within the threshold — instant feedback while you're still on the dashboard, even
  // though the tap otherwise shows no visual change until its loader finally settles or times out.
  const stalled = useLoadingStalled();
  const location = useLocation();
  const navigate = useNavigate();
  const { newSpace } = useSpaceActions();
  const [newSpaceOpen, setNewSpaceOpen] = useState(false);
  const [messagePaneId, setMessagePaneId] = useState<string | null>(null);
  const { prefs, setSpacesOpen, setRecentOpen, setRecentDir } = useDashPrefs();
  // No stored choice yet? The space count decides — a two-space install shouldn't be handed a
  // mystery collapsed header, and a forty-space one shouldn't be handed a wall.
  const spacesOpen = openForCount(prefs.spacesOpen, data.workspaces.length);
  const activeSection = homeSectionFromSearch(location.search);
  const attentionCount = data.agents.filter((agent) => bucketOf(agent) === "needs").length;

  const open = (id: string) => navigate(panePath(id, data.session));
  const drillInto = (id: string) => navigate(spacePath(id, data.session));
  const selectSection = (section: "herd" | "spaces") => {
    navigate(homeSectionPath(section, data.session), { replace: true });
  };

  return (
    <div className="mx-auto flex min-h-0 w-full max-w-screen-sm flex-1 flex-col">
      {/* The dashboard header: wordmark + the dashboard-only session switcher. Settings lives in
          the persistent thumb-reachable tab bar instead of the top-right corner. */}
      <AppHeader
        bridge={data.bridge}
        error={data.error}
        stalled={stalled}
        wordmark
        rightLead={<SessionSwitcher sessions={data.sessions ?? []} current={data.session} />}
      />

      {/* Content region below the header: a viewport-clipped internal scroller. */}
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <ReadOnlyBanner device={data.device} />

        <main className="flex-1">
          {/* One focused surface at a time. Herd stays a triaged action queue; Spaces stays a
              navigator. Switching does not reset either surface's local fold/search state. */}
          {activeSection === "herd" ? (
            <AgentList
              agents={data.agents}
              bridge={data.bridge}
              onOpen={open}
              onMessage={setMessagePaneId}
              recentDir={prefs.recentDir}
              onRecentDirChange={setRecentDir}
              recentOpen={prefs.recentOpen}
              onRecentOpenChange={setRecentOpen}
            />
          ) : (
            <SpaceOverview
              workspaces={data.workspaces}
              agents={data.agents}
              shellPanes={data.shellPanes}
              onOpen={drillInto}
              onNewSpace={() => setNewSpaceOpen(true)}
              open={spacesOpen}
              onOpenChange={setSpacesOpen}
            />
          )}
        </main>

        {/* An available update / needed restart, then the build stamp (which bundle you're
            running, with a stale-cache nudge). */}
        <UpdateBanner className="px-3 pt-3" />
        <BuildStamp className="px-3 pt-3 pb-3" />
      </div>

      <MobileTabBar
        active={activeSection}
        attentionCount={attentionCount}
        onSelect={selectSection}
        onSettings={() => navigate(settingsPath(data.session))}
      />

      {/* Status overlay, anchored to the bottom of the viewport (no input here) — same slim line,
          floating so it never shifts the list. Stays outside the scroller so it never scrolls away. */}
      <div className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)_+_4.5rem)] z-30 mx-auto w-full max-w-screen-sm px-3">
        <StatusArea />
      </div>

      <NewSpaceSheet open={newSpaceOpen} onClose={() => setNewSpaceOpen(false)} onCreate={newSpace} />
      <DashboardComposer
        agent={data.agents.find((candidate) => candidate.paneId === messagePaneId) ?? null}
        session={data.session}
        readOnly={data.device?.enforced === true && data.device.authorized !== true}
        onClose={() => setMessagePaneId(null)}
      />
    </div>
  );
}

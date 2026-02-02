"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import type { GatewayStatus } from "@/lib/gateway/GatewayClient";

type CanvasOnboardingPanelProps = {
  gatewayStatus: GatewayStatus;
  needsWorkspace: boolean;
  tileCount: number;
  onOpenWorkspaceSettings: () => void;
  onNewAgent: () => void;
  canCreateAgent: boolean;
};

export function CanvasOnboardingPanel({
  gatewayStatus,
  needsWorkspace,
  tileCount,
  onOpenWorkspaceSettings,
  onNewAgent,
  canCreateAgent,
}: CanvasOnboardingPanelProps) {
  const blocker = React.useMemo(() => {
    if (gatewayStatus !== "connected") return "gateway" as const;
    if (needsWorkspace) return "workspace" as const;
    if (tileCount === 0) return "tiles" as const;
    return null;
  }, [gatewayStatus, needsWorkspace, tileCount]);

  if (!blocker) return null;

  if (blocker === "gateway") {
    const statusCommand = "openclaw gateway status";
    const startCommand = "openclaw gateway start";
    const title =
      gatewayStatus === "connecting" ? "Connecting to Gateway…" : "Gateway disconnected";
    const body =
      gatewayStatus === "connecting"
        ? "Studio can’t run agents until the Gateway is online. If this takes more than a few seconds, check the status or start it manually:"
        : "Studio can’t run agents until the Gateway is online. Check status and start it in a terminal:";

    return (
      <div className="glass-panel px-6 py-5">
        <div className="flex flex-col gap-3">
          <div>
            <h2 className="text-base font-semibold text-foreground">{title}</h2>
            <p className="text-sm text-muted-foreground">{body}</p>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <code className="rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground">
                {statusCommand}
              </code>
              <CopyButton
                text={statusCommand}
                label="Copy status command"
                successMessage="Gateway status command copied."
              />
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <code className="rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground">
                {startCommand}
              </code>
              <CopyButton
                text={startCommand}
                label="Copy start command"
                successMessage="Gateway start command copied."
              />
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Once the Gateway is running, Studio will reconnect automatically.
          </p>
        </div>
      </div>
    );
  }

  if (blocker === "workspace") {
    return (
      <div className="glass-panel px-6 py-5">
        <div className="flex flex-col gap-3">
          <div>
            <h2 className="text-base font-semibold text-foreground">Choose a workspace</h2>
            <p className="text-sm text-muted-foreground">
              Set the folder where Studio should create/manage agent workspaces.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" onClick={onOpenWorkspaceSettings}>
              Set workspace
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-panel px-6 py-5">
      <div className="flex flex-col gap-3">
        <div>
          <h2 className="text-base font-semibold text-foreground">No agents yet</h2>
          <p className="text-sm text-muted-foreground">
            Create your first agent tile to start chatting and running tools.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" onClick={onNewAgent} disabled={!canCreateAgent}>
            New Agent
          </Button>
        </div>
      </div>
    </div>
  );
}

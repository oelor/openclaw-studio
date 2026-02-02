import { useCallback, useEffect, useMemo, useState } from "react";

import {
  fetchWorkspaceSettings,
  updateWorkspaceSettings,
} from "@/lib/projects/client";
import { useToast } from "@/components/ui/toast";

type WorkspaceSettingsPanelProps = {
  onClose: () => void;
  onSaved: () => void;
};

type PathCheckResult = {
  input: string;
  resolvedPath: string;
  exists: boolean;
  isDirectory: boolean;
  readable: boolean;
  writable: boolean;
};

export const WorkspaceSettingsPanel = ({
  onClose,
  onSaved,
}: WorkspaceSettingsPanelProps) => {
  const { toast } = useToast();
  const [workspacePath, setWorkspacePath] = useState("");
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pathCheck, setPathCheck] = useState<PathCheckResult | null>(null);
  const [pathCheckError, setPathCheckError] = useState<string | null>(null);
  const [pathChecking, setPathChecking] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetchWorkspaceSettings()
      .then((result) => {
        if (!mounted) return;
        setWorkspacePath(result.workspacePath ?? "");
        setWarnings(result.warnings ?? []);
        setError(null);
      })
      .catch((err) => {
        if (!mounted) return;
        const message =
          err instanceof Error ? err.message : "Failed to load workspace settings.";
        setError(message);
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (loading) return;
    const trimmed = workspacePath.trim();
    if (!trimmed) {
      setPathCheck(null);
      setPathCheckError(null);
      setPathChecking(false);
      return;
    }

    let cancelled = false;
    setPathChecking(true);
    setPathCheck(null);
    setPathCheckError(null);

    const timer = window.setTimeout(() => {
      void fetch(`/api/path-check?p=${encodeURIComponent(trimmed)}`)
        .then(async (res) => {
          const json = (await res.json()) as unknown;
          if (cancelled) return;
          if (!res.ok) {
            const message =
              json && typeof json === "object" && "error" in json
                ? String((json as { error?: unknown }).error ?? "")
                : "Failed to validate path.";
            setPathCheck(null);
            setPathCheckError(message || "Failed to validate path.");
            return;
          }
          setPathCheck(json as PathCheckResult);
          setPathCheckError(null);
        })
        .catch((err) => {
          if (cancelled) return;
          const message = err instanceof Error ? err.message : "Failed to validate path.";
          setPathCheck(null);
          setPathCheckError(message);
        })
        .finally(() => {
          if (cancelled) return;
          setPathChecking(false);
        });
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [loading, workspacePath]);

  const trimmedPath = workspacePath.trim();
  const pathLooksValid =
    !trimmedPath ||
    trimmedPath.startsWith("/") ||
    trimmedPath === "~" ||
    trimmedPath.startsWith("~/");

  const pathHelpText =
    "Use an absolute path (e.g. /Users/you/code) or ~ / ~/... . Studio will validate it exists and is a readable/writable directory.";

  const pathCheckFailure = useMemo(() => {
    if (!pathCheck) return null;
    if (!pathCheck.exists) return `Path does not exist: ${pathCheck.resolvedPath}`;
    if (!pathCheck.isDirectory) return `Path is not a directory: ${pathCheck.resolvedPath}`;
    if (!pathCheck.readable) return `Path is not readable: ${pathCheck.resolvedPath}`;
    if (!pathCheck.writable) return `Path is not writable: ${pathCheck.resolvedPath}`;
    return null;
  }, [pathCheck]);

  const canSave = useMemo(() => {
    if (loading || saving) return false;
    if (!trimmedPath) return false;
    if (!pathLooksValid) return false;

    // Don’t allow saving until we’ve validated the path.
    if (pathChecking) return false;
    if (pathCheckError) return false;
    if (!pathCheck) return false;

    if (pathCheckFailure) return false;
    return true;
  }, [
    loading,
    pathCheck,
    pathCheckError,
    pathCheckFailure,
    pathChecking,
    pathLooksValid,
    saving,
    trimmedPath,
  ]);

  const handleSave = useCallback(async () => {
    const trimmedPath = workspacePath.trim();
    if (!trimmedPath) {
      setError("Workspace path is required.");
      return;
    }
    if (!(trimmedPath.startsWith("/") || trimmedPath === "~" || trimmedPath.startsWith("~/"))) {
      setError("Workspace path must be an absolute path (or ~).");
      return;
    }
    if (pathChecking) {
      setError("Validating workspace path…");
      return;
    }
    if (pathCheckError) {
      setError(`Could not validate workspace path: ${pathCheckError}`);
      return;
    }
    if (!pathCheck) {
      setError("Workspace path has not been validated yet.");
      return;
    }
    if (pathCheckFailure) {
      setError(pathCheckFailure);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const result = await updateWorkspaceSettings({
        workspacePath: trimmedPath,
      });
      setWarnings(result.warnings ?? []);
      if (result.warnings.length > 0) {
        toast({
          variant: "warning",
          title: "Saved with warnings",
          message: result.warnings.join(" "),
        });
      } else {
        toast({ variant: "success", title: "Saved", message: "Workspace settings updated." });
      }
      onSaved();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to save workspace settings.";
      setError(message);
    } finally {
      setSaving(false);
    }
  }, [onSaved, pathCheck, pathCheckError, pathCheckFailure, pathChecking, toast, workspacePath]);

  return (
    <div className="glass-panel px-6 py-6" data-testid="workspace-settings-panel">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Default Workspace</h2>
            <p className="text-xs text-muted-foreground">
              Change the folder where Studio agents should operate.
            </p>
          </div>
          <button
            className="rounded-lg border border-input px-3 py-1 text-xs font-semibold text-foreground transition hover:border-ring"
            type="button"
            onClick={onClose}
            data-testid="workspace-settings-close"
          >
            Close
          </button>
        </div>

        <div className="grid gap-4">
          <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Default workspace path
            <input
              className="h-11 rounded-lg border border-input bg-background px-4 text-sm text-foreground outline-none transition focus:border-ring"
              value={workspacePath}
              onChange={(event) => setWorkspacePath(event.target.value)}
              placeholder="~/code"
              disabled={loading || saving}
              aria-invalid={!pathLooksValid}
              data-testid="workspace-settings-path"
            />
            <span className="text-[11px] font-normal normal-case tracking-normal text-muted-foreground">
              {pathHelpText}
            </span>
            {!pathLooksValid ? (
              <span className="text-[11px] font-normal normal-case tracking-normal text-destructive">
                Path must start with <code>/</code> or use <code>~</code> / <code>~/</code>.
              </span>
            ) : trimmedPath && pathChecking ? (
              <span className="text-[11px] font-normal normal-case tracking-normal text-muted-foreground">
                Checking path…
              </span>
            ) : trimmedPath && pathCheckError ? (
              <span className="text-[11px] font-normal normal-case tracking-normal text-muted-foreground">
                Could not validate path: {pathCheckError}
              </span>
            ) : trimmedPath && pathCheckFailure ? (
              <span className="text-[11px] font-normal normal-case tracking-normal text-destructive">
                {pathCheckFailure}
              </span>
            ) : trimmedPath && pathCheck ? (
              <span className="text-[11px] font-normal normal-case tracking-normal text-emerald-600">
                Looks good: <code>{pathCheck.resolvedPath}</code>
              </span>
            ) : null}
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition hover:brightness-110 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
            type="button"
            onClick={handleSave}
            disabled={!canSave}
            data-testid="workspace-settings-save"
          >
            {saving ? "Saving..." : "Save settings"}
          </button>
          <button
            className="rounded-lg border border-input px-5 py-2 text-sm font-semibold text-foreground"
            type="button"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>
        </div>

        {loading ? (
          <div className="text-xs text-muted-foreground">Loading workspace settings…</div>
        ) : null}
        {error ? (
          <div className="rounded-lg border border-destructive bg-destructive px-4 py-2 text-sm text-destructive-foreground">
            {error}
          </div>
        ) : null}
        {warnings.length > 0 ? (
          <div className="rounded-lg border border-border bg-accent px-4 py-2 text-sm text-accent-foreground">
            {warnings.join(" ")}
          </div>
        ) : null}
      </div>
    </div>
  );
};

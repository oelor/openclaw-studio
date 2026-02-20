type DaemonActivityPanelProps = {
  activity: string | null;
  loading: boolean;
};

const classifyLine = (line: string): "error" | "warn" | "info" => {
  const lower = line.toLowerCase();
  if (lower.includes("error") || lower.includes("failed") || lower.includes("exception"))
    return "error";
  if (lower.includes("warn") || lower.includes("timeout") || lower.includes("retry"))
    return "warn";
  return "info";
};

const lineColor = (level: "error" | "warn" | "info"): string => {
  if (level === "error") return "text-red-400/90";
  if (level === "warn") return "text-yellow-400/80";
  return "text-muted-foreground/70";
};

export const DaemonActivityPanel = ({
  activity,
  loading,
}: DaemonActivityPanelProps) => {
  if (loading) {
    return (
      <div className="px-3 py-4 text-center text-[11px] text-muted-foreground/50">
        Loading daemon activity...
      </div>
    );
  }

  if (!activity) {
    return (
      <div className="px-3 py-4 text-center text-[11px] text-muted-foreground/50">
        No daemon activity today
      </div>
    );
  }

  const lines = activity.split("\n").filter(Boolean);

  return (
    <div className="flex flex-col gap-0 overflow-y-auto p-1">
      {lines.map((line, i) => {
        const level = classifyLine(line);
        return (
          <div
            key={i}
            className={`whitespace-pre-wrap break-all px-2 py-0.5 font-mono text-[9px] leading-tight ${lineColor(level)}`}
          >
            {line}
          </div>
        );
      })}
    </div>
  );
};

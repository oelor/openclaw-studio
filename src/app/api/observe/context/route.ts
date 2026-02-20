import { NextResponse } from "next/server";
import * as fs from "node:fs";
import * as path from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HOME = process.env.HOME ?? "/Users/miloantaeus";
const REPO_DIR = path.join(HOME, "personal-ai-assistant");
const OPENCLAW_DIR = path.join(HOME, ".openclaw");

type Initiative = {
  title: string;
  priority: string;
  status: string;
  summary: string;
};

type TaskQueueItem = {
  id: string;
  description: string;
  priority: number;
  status: string;
};

type TradingPortfolio = {
  balance: number;
  initialBalance: number;
  totalTrades: number;
  recentTrades: Array<{
    market: string;
    position: string;
    outcome: string;
    pnl: number;
    timestamp: string;
  }>;
};

type ObserveContext = {
  recentMemory: string | null;
  initiatives: Initiative[];
  taskQueue: TaskQueueItem[];
  cronJobs: Array<{
    id: string;
    name: string;
    schedule: string;
    lastStatus: string;
    lastRunAt: string | null;
    nextRunAt: string | null;
  }>;
  trading: TradingPortfolio | null;
  recentDaemonActivity: string | null;
  systemInfo: {
    model: string;
    agentCount: number;
  };
};

const readFileSafe = (filePath: string): string | null => {
  try {
    return fs.readFileSync(filePath, "utf-8");
  } catch {
    return null;
  }
};

const parseRecentMemory = (): string | null => {
  const memoryDir = path.join(
    REPO_DIR,
    "openclaw/workspace/skills/notes/data/memory/hourly"
  );
  try {
    const files = fs
      .readdirSync(memoryDir)
      .filter((f) => f.endsWith(".md"))
      .sort()
      .reverse();
    if (files.length === 0) return null;
    const content = fs.readFileSync(path.join(memoryDir, files[0]), "utf-8");
    // Get last 2 hourly blocks (most recent activity)
    const blocks = content.split(/^### /m).filter(Boolean);
    const recent = blocks.slice(-2).map((b) => `### ${b}`);
    return recent.join("\n").trim() || null;
  } catch {
    return null;
  }
};

const parseInitiatives = (): Initiative[] => {
  const content = readFileSafe(
    path.join(REPO_DIR, "openclaw/workspace/INITIATIVES.md")
  );
  if (!content) return [];

  const initiatives: Initiative[] = [];
  const lines = content.split("\n");
  let current: Partial<Initiative> | null = null;

  for (const line of lines) {
    // Match "## P0 — Title" or "## P1.5 — Title" or "### 1. Title (Priority)"
    const pMatch = line.match(
      /^##\s+(P[\d.]+)\s*[—–-]\s*(.+)$/
    );
    const numMatch = !pMatch
      ? line.match(/^###?\s+\d+\.\s+(.+?)(?:\s*\(([^)]+)\))?\s*$/)
      : null;

    if (pMatch || numMatch) {
      if (current?.title) {
        initiatives.push(current as Initiative);
      }
      if (pMatch) {
        current = {
          title: pMatch[2].trim(),
          priority: pMatch[1].trim(),
          status: "active",
          summary: "",
        };
      } else if (numMatch) {
        current = {
          title: numMatch[1].trim(),
          priority: numMatch[2]?.trim() ?? `P${initiatives.length + 1}`,
          status: "active",
          summary: "",
        };
      }
      continue;
    }
    // Collect first bullet point as summary
    if (current && !current.summary && line.trim().startsWith("-")) {
      current.summary = line.trim().slice(2).trim().slice(0, 150);
    }
    // Detect status markers
    if (current && line.toLowerCase().includes("blocked")) {
      current.status = "blocked";
    }
    if (current && line.toLowerCase().includes("completed")) {
      current.status = "completed";
    }
  }
  if (current?.title) {
    initiatives.push(current as Initiative);
  }

  return initiatives.slice(0, 8);
};

const parseTaskQueue = (): TaskQueueItem[] => {
  const content = readFileSafe(
    path.join(OPENCLAW_DIR, "task_queue.json")
  );
  if (!content) return [];

  try {
    const data = JSON.parse(content) as {
      tasks?: Array<{
        id?: string;
        description?: string;
        priority?: number;
        status?: string;
      }>;
    };
    return (data.tasks ?? [])
      .filter((t) => t.status !== "completed")
      .map((t) => ({
        id: t.id ?? "",
        description: t.description ?? "",
        priority: t.priority ?? 3,
        status: t.status ?? "pending",
      }))
      .slice(0, 10);
  } catch {
    return [];
  }
};

const parseCronJobs = (): ObserveContext["cronJobs"] => {
  const content = readFileSafe(
    path.join(OPENCLAW_DIR, "cron/jobs.json")
  );
  if (!content) return [];

  try {
    const data = JSON.parse(content) as {
      jobs?: Array<{
        id?: string;
        name?: string;
        schedule?: { cron?: string; intervalSeconds?: number };
        state?: {
          lastStatus?: string;
          lastRunAtMs?: number;
          nextRunAtMs?: number;
        };
      }>;
    };
    return (data.jobs ?? []).map((j) => ({
      id: j.id ?? "",
      name: j.name ?? "",
      schedule: j.schedule?.cron ?? (j.schedule?.intervalSeconds ? `every ${j.schedule.intervalSeconds}s` : ""),
      lastStatus: j.state?.lastStatus ?? "unknown",
      lastRunAt: j.state?.lastRunAtMs
        ? new Date(j.state.lastRunAtMs).toISOString()
        : null,
      nextRunAt: j.state?.nextRunAtMs
        ? new Date(j.state.nextRunAtMs).toISOString()
        : null,
    }));
  } catch {
    return [];
  }
};

const parseTradingPortfolio = (): TradingPortfolio | null => {
  const content = readFileSafe(
    path.join(REPO_DIR, "income/passive-income/data/trades/portfolio.json")
  );
  if (!content) return null;

  try {
    const data = JSON.parse(content) as {
      balance?: number;
      initial_balance?: number;
      trades?: Array<{
        market?: string;
        position?: string;
        outcome?: string;
        pnl?: number;
        timestamp?: string;
        created_at?: string;
      }>;
    };
    const trades = (data.trades ?? [])
      .slice(-10)
      .reverse()
      .map((t) => ({
        market: t.market ?? "unknown",
        position: t.position ?? "unknown",
        outcome: t.outcome ?? "open",
        pnl: t.pnl ?? 0,
        timestamp: t.timestamp ?? t.created_at ?? "",
      }));
    return {
      balance: data.balance ?? 0,
      initialBalance: data.initial_balance ?? 1000,
      totalTrades: (data.trades ?? []).length,
      recentTrades: trades,
    };
  } catch {
    return null;
  }
};

const parseRecentDaemonActivity = (): string | null => {
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const logFile = path.join(
    OPENCLAW_DIR,
    `logs/imessage_daemon_${today}.log`
  );
  const content = readFileSafe(logFile);
  if (!content) return null;
  const lines = content.split("\n").filter(Boolean);
  return lines.slice(-30).join("\n") || null;
};

const countAgents = (): number => {
  const agentsDir = path.join(OPENCLAW_DIR, "agents");
  try {
    return fs
      .readdirSync(agentsDir)
      .filter((f) =>
        fs.statSync(path.join(agentsDir, f)).isDirectory()
      ).length;
  } catch {
    return 0;
  }
};

export async function GET() {
  try {
    const context: ObserveContext = {
      recentMemory: parseRecentMemory(),
      initiatives: parseInitiatives(),
      taskQueue: parseTaskQueue(),
      cronJobs: parseCronJobs(),
      trading: parseTradingPortfolio(),
      recentDaemonActivity: parseRecentDaemonActivity(),
      systemInfo: {
        model: "qwen3:30b-a3b",
        agentCount: countAgents(),
      },
    };
    return NextResponse.json(context);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to load observe context.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

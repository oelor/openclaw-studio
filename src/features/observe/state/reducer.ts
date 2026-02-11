import type { ObserveAction, ObserveEntry, ObserveState, SessionStatus } from "./types";
import { MAX_ENTRIES } from "./types";

export const initialObserveState: ObserveState = {
  entries: [],
  sessions: [],
  interventionCount: 0,
  paused: false,
};

const updateSessionsFromEntries = (
  sessions: SessionStatus[],
  entries: ObserveEntry[]
): SessionStatus[] => {
  const map = new Map<string, SessionStatus>();
  for (const s of sessions) {
    map.set(s.sessionKey, { ...s });
  }

  for (const entry of entries) {
    if (!entry.sessionKey) continue;
    let session = map.get(entry.sessionKey);
    if (!session) {
      session = {
        sessionKey: entry.sessionKey,
        agentId: entry.agentId,
        displayName: entry.agentId,
        origin: "unknown",
        status: "idle",
        lastActivityAt: null,
        currentToolName: null,
        lastError: null,
        eventCount: 0,
      };
      map.set(entry.sessionKey, session);
    }

    session.eventCount += 1;
    session.lastActivityAt = entry.timestamp;

    if (entry.stream === "lifecycle") {
      if (entry.text === "start") {
        session.status = "running";
        session.currentToolName = null;
        session.lastError = null;
      } else if (entry.text === "end") {
        session.status = "idle";
        session.currentToolName = null;
      } else if (entry.text === "error") {
        session.status = "error";
        session.lastError = entry.errorMessage;
        session.currentToolName = null;
      }
    }

    if (entry.stream === "tool" && entry.toolName) {
      session.currentToolName = entry.toolName;
    }

    if (entry.severity === "error" && entry.errorMessage) {
      session.lastError = entry.errorMessage;
    }
  }

  return Array.from(map.values());
};

const countInterventions = (entries: ObserveEntry[]): number => {
  let count = 0;
  for (const e of entries) {
    if (e.severity === "error") count += 1;
  }
  return count;
};

export const observeReducer = (
  state: ObserveState,
  action: ObserveAction
): ObserveState => {
  switch (action.type) {
    case "pushEntries": {
      if (state.paused || action.entries.length === 0) return state;
      const merged = [...state.entries, ...action.entries];
      const capped =
        merged.length > MAX_ENTRIES
          ? merged.slice(merged.length - MAX_ENTRIES)
          : merged;
      const sessions = updateSessionsFromEntries(state.sessions, action.entries);
      return {
        ...state,
        entries: capped,
        sessions,
        interventionCount: countInterventions(capped),
      };
    }
    case "hydrateSessions": {
      const existing = new Map<string, SessionStatus>();
      for (const s of state.sessions) {
        existing.set(s.sessionKey, s);
      }
      const merged: SessionStatus[] = [];
      for (const incoming of action.sessions) {
        const current = existing.get(incoming.sessionKey);
        if (current) {
          merged.push({
            ...current,
            displayName: incoming.displayName ?? current.displayName,
            origin: incoming.origin !== "unknown" ? incoming.origin : current.origin,
          });
          existing.delete(incoming.sessionKey);
        } else {
          merged.push(incoming);
        }
      }
      for (const remaining of existing.values()) {
        merged.push(remaining);
      }
      return { ...state, sessions: merged };
    }
    case "togglePause":
      return { ...state, paused: !state.paused };
    case "clearLog":
      return {
        ...state,
        entries: [],
        interventionCount: 0,
      };
    default:
      return state;
  }
};

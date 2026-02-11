import type { EventFrame } from "@/lib/gateway/GatewayClient";
import { parseAgentIdFromSessionKey } from "@/lib/gateway/GatewayClient";
import { classifyGatewayEventKind } from "@/features/agents/state/runtimeEventBridge";
import type { ChatEventPayload, AgentEventPayload } from "@/features/agents/state/runtimeEventBridge";
import type { ObserveEntry } from "./types";

let entryCounter = 0;

const nextId = (): string => {
  entryCounter += 1;
  return `obs-${entryCounter}`;
};

const truncate = (text: string | null | undefined, maxLen: number = 200): string | null => {
  if (!text) return null;
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen) + "...";
};

const extractText = (message: unknown): string | null => {
  if (!message || typeof message !== "object") return null;
  const record = message as Record<string, unknown>;
  if (typeof record.content === "string") return record.content;
  if (typeof record.text === "string") return record.text;
  return null;
};

const mapChatEvent = (payload: ChatEventPayload, timestamp: number): ObserveEntry => {
  const agentId = payload.sessionKey
    ? parseAgentIdFromSessionKey(payload.sessionKey)
    : null;

  const isError = payload.state === "error" || payload.state === "aborted";
  const text = payload.errorMessage || extractText(payload.message);

  return {
    id: nextId(),
    timestamp,
    eventType: "chat",
    sessionKey: payload.sessionKey ?? null,
    agentId,
    runId: payload.runId ?? null,
    stream: null,
    toolName: null,
    toolPhase: null,
    chatState: payload.state ?? null,
    errorMessage: isError ? (payload.errorMessage ?? "Chat error") : null,
    text: truncate(text),
    severity: isError ? "error" : "info",
  };
};

const mapAgentEvent = (payload: AgentEventPayload, timestamp: number): ObserveEntry => {
  const sessionKey = payload.sessionKey ?? null;
  const agentId = sessionKey ? parseAgentIdFromSessionKey(sessionKey) : null;
  const stream = payload.stream ?? null;
  const data = payload.data ?? {};

  let toolName: string | null = null;
  let toolPhase: string | null = null;
  let text: string | null = null;
  let errorMessage: string | null = null;
  let severity: ObserveEntry["severity"] = "info";

  if (stream === "lifecycle") {
    const phase = typeof data.phase === "string" ? data.phase : null;
    text = phase;
    if (phase === "error") {
      severity = "error";
      errorMessage = typeof data.error === "string" ? data.error : "Lifecycle error";
    }
  } else if (stream === "tool") {
    toolName = typeof data.name === "string" ? data.name : null;
    toolPhase = typeof data.phase === "string" ? data.phase : null;
    if (typeof data.error === "string") {
      severity = "error";
      errorMessage = data.error;
    }
    if (typeof data.result === "string") {
      text = truncate(data.result);
    } else if (typeof data.args === "string") {
      text = truncate(data.args);
    } else if (data.args && typeof data.args === "object") {
      try {
        text = truncate(JSON.stringify(data.args));
      } catch {
        text = null;
      }
    }
  } else if (stream === "assistant") {
    const raw = typeof data.text === "string" ? data.text : null;
    text = truncate(raw);
  } else {
    // reasoning or other streams
    const raw = typeof data.text === "string" ? data.text : null;
    text = truncate(raw);
  }

  return {
    id: nextId(),
    timestamp,
    eventType: "agent",
    sessionKey,
    agentId,
    runId: payload.runId ?? null,
    stream,
    toolName,
    toolPhase,
    chatState: null,
    errorMessage,
    text,
    severity,
  };
};

export const mapEventFrameToEntry = (event: EventFrame): ObserveEntry | null => {
  const timestamp = Date.now();
  const kind = classifyGatewayEventKind(event.event);

  if (kind === "runtime-chat") {
    const payload = event.payload as ChatEventPayload | undefined;
    if (!payload) return null;
    return mapChatEvent(payload, timestamp);
  }

  if (kind === "runtime-agent") {
    const payload = event.payload as AgentEventPayload | undefined;
    if (!payload) return null;
    return mapAgentEvent(payload, timestamp);
  }

  if (event.event === "heartbeat") {
    return {
      id: nextId(),
      timestamp,
      eventType: "heartbeat",
      sessionKey: null,
      agentId: null,
      runId: null,
      stream: null,
      toolName: null,
      toolPhase: null,
      chatState: null,
      errorMessage: null,
      text: null,
      severity: "info",
    };
  }

  if (event.event === "presence") {
    return {
      id: nextId(),
      timestamp,
      eventType: "presence",
      sessionKey: null,
      agentId: null,
      runId: null,
      stream: null,
      toolName: null,
      toolPhase: null,
      chatState: null,
      errorMessage: null,
      text: null,
      severity: "info",
    };
  }

  return null;
};

import fs from "node:fs";
import os from "node:os";

import { NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import { resolveUserPath } from "@/lib/clawdbot/paths";

export const runtime = "nodejs";

const assertValidInput = (input: string) => {
  if (!input.trim()) throw new Error("Path is required.");
  const trimmed = input.trim();
  if (trimmed.startsWith("/")) return;
  if (trimmed === "~" || trimmed.startsWith("~/")) return;
  throw new Error("Path must be an absolute path (or ~).");
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawPath = searchParams.get("p") ?? "";
    const input = rawPath.trim();

    assertValidInput(input);

    const resolvedPath = resolveUserPath(input, os.homedir);

    const exists = fs.existsSync(resolvedPath);
    let isDirectory = false;
    let readable = false;
    let writable = false;

    if (exists) {
      try {
        isDirectory = fs.statSync(resolvedPath).isDirectory();
      } catch {
        isDirectory = false;
      }

      try {
        fs.accessSync(resolvedPath, fs.constants.R_OK);
        readable = true;
      } catch {
        readable = false;
      }

      try {
        fs.accessSync(resolvedPath, fs.constants.W_OK);
        writable = true;
      } catch {
        writable = false;
      }
    }

    return NextResponse.json({
      input,
      resolvedPath,
      exists,
      isDirectory,
      readable,
      writable,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to validate path.";
    logger.error(message);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

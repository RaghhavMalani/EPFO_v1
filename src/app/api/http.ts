import { NextResponse } from "next/server";
import { z } from "zod";

export function apiError(error: unknown) {
  // A malformed command is a bad request, not a workflow conflict.
  if (error instanceof z.ZodError) {
    return NextResponse.json(
      {
        error: "The request body is not a valid command.",
        issues: error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      },
      { status: 400, headers: noStoreHeaders },
    );
  }

  const message = error instanceof Error ? error.message : "The mock action could not be completed.";
  const status = message.includes("not found") ? 404 : 409;
  return NextResponse.json({ error: message }, { status, headers: noStoreHeaders });
}

export const noStoreHeaders = {
  "Cache-Control": "no-store, max-age=0",
};

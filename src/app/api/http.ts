import { NextResponse } from "next/server";

export function apiError(error: unknown) {
  const message = error instanceof Error ? error.message : "The mock action could not be completed.";
  const status = message.includes("not found") ? 404 : 409;
  return NextResponse.json({ error: message }, { status });
}

export const noStoreHeaders = {
  "Cache-Control": "no-store, max-age=0",
};

import { NextResponse } from "next/server";
import { loadSession } from "@/application/session";
import { apiError, noStoreHeaders } from "@/app/api/http";

export async function GET() {
  try {
    const { epfoService } = await loadSession();
    return NextResponse.json(epfoService.getSnapshot(), { headers: noStoreHeaders });
  } catch (error) {
    return apiError(error);
  }
}

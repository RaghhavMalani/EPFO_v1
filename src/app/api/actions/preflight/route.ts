import { NextResponse } from "next/server";
import { mutateSession } from "@/application/session";
import { apiError, noStoreHeaders } from "@/app/api/http";

export async function POST() {
  try {
    const snapshot = await mutateSession(({ epfoService }) => epfoService.completePreflight());
    return NextResponse.json(snapshot, { headers: noStoreHeaders });
  } catch (error) {
    return apiError(error);
  }
}

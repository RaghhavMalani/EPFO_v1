import { NextResponse } from "next/server";
import { epfoService } from "@/application/service-instance";
import { apiError, noStoreHeaders } from "@/app/api/http";

export async function POST() {
  try {
    return NextResponse.json(epfoService.completePreflight(), { headers: noStoreHeaders });
  } catch (error) {
    return apiError(error);
  }
}

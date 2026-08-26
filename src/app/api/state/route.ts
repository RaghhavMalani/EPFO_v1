import { NextResponse } from "next/server";
import { epfoService } from "@/application/service-instance";
import { noStoreHeaders } from "@/app/api/http";

export async function GET() {
  return NextResponse.json(epfoService.getSnapshot(), { headers: noStoreHeaders });
}

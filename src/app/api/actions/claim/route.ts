import { NextResponse } from "next/server";
import { z } from "zod";
import { epfoService } from "@/application/service-instance";
import { apiError, noStoreHeaders } from "@/app/api/http";

const ClaimActionBody = z.object({
  action: z.literal("SUBMIT"),
  confirmed: z.literal(true),
});

export async function POST(request: Request) {
  try {
    const body = ClaimActionBody.parse(await request.json());
    return NextResponse.json(epfoService.submitClaim(body.confirmed), {
      headers: noStoreHeaders,
    });
  } catch (error) {
    return apiError(error);
  }
}

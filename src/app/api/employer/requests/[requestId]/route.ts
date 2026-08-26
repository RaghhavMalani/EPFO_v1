import { NextResponse } from "next/server";
import { z } from "zod";
import { epfoService } from "@/application/service-instance";
import { apiError, noStoreHeaders } from "@/app/api/http";

const EmployerDecisionBody = z.discriminatedUnion("action", [
  z.object({ action: z.enum(["START_REVIEW", "APPROVE"]) }),
  z.object({
    action: z.enum(["REQUEST_INFORMATION", "REJECT"]),
    reason: z.string().trim().min(5),
  }),
]);

export async function POST(
  request: Request,
  { params }: { params: Promise<{ requestId: string }> },
) {
  try {
    const { requestId } = await params;
    const body = EmployerDecisionBody.parse(await request.json());
    return NextResponse.json(
      epfoService.actOnEmployerRequest(
        requestId,
        body.action,
        "reason" in body ? body.reason : undefined,
      ),
      { headers: noStoreHeaders },
    );
  } catch (error) {
    return apiError(error);
  }
}

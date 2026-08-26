import { NextResponse } from "next/server";
import { z } from "zod";
import { epfoService } from "@/application/service-instance";
import { apiError, noStoreHeaders } from "@/app/api/http";

const IssueActionBody = z.object({
  action: z.enum(["START", "SUBMIT", "SIMULATE_RESOLUTION"]),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ issueId: string }> },
) {
  try {
    const { issueId } = await params;
    const body = IssueActionBody.parse(await request.json());
    return NextResponse.json(epfoService.actOnIssue(issueId, body.action), {
      headers: noStoreHeaders,
    });
  } catch (error) {
    return apiError(error);
  }
}

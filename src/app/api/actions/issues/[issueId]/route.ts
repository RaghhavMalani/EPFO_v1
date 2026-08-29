import { NextResponse } from "next/server";
import { z } from "zod";
import { mutateSession } from "@/application/session";
import { apiError, noStoreHeaders } from "@/app/api/http";

const IssueActionBody = z.object({
  action: z.enum([
    "START_MARK_EXIT",
    "COMPLETE_MARK_EXIT",
    "CREATE_EMPLOYER_REQUEST",
    "RESUBMIT_EMPLOYER_REQUEST",
  ]),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ issueId: string }> },
) {
  try {
    const { issueId } = await params;
    const body = IssueActionBody.parse(await request.json());
    const snapshot = await mutateSession(({ epfoService }) => {
      const handlers = {
        START_MARK_EXIT: () => epfoService.startMarkExit(issueId),
        COMPLETE_MARK_EXIT: () => epfoService.completeMarkExit(issueId),
        CREATE_EMPLOYER_REQUEST: () => epfoService.createEmployerRequest(issueId),
        RESUBMIT_EMPLOYER_REQUEST: () => epfoService.resubmitEmployerRequest(issueId),
      } satisfies Record<typeof body.action, () => unknown>;
      return handlers[body.action]();
    });
    return NextResponse.json(snapshot, { headers: noStoreHeaders });
  } catch (error) {
    return apiError(error);
  }
}

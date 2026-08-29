import { NextResponse } from "next/server";
import { z } from "zod";
import { mutateSession } from "@/application/session";
import { apiError, noStoreHeaders } from "@/app/api/http";
import { TransferStateSchema } from "@/domain/experience-v2";

const TransferActionBody = z.discriminatedUnion("action", [
  z.object({ action: z.literal("RESOLVE_BLOCKER") }),
  z.object({ action: z.literal("TRANSITION"), nextState: TransferStateSchema }),
  z.object({ action: z.literal("ADVANCE") }),
]);

export async function POST(request: Request) {
  try {
    const body = TransferActionBody.parse(await request.json());
    const result = await mutateSession(({ experienceV2Service }) =>
      body.action === "RESOLVE_BLOCKER"
        ? experienceV2Service.resolveTransferBlocker()
        : body.action === "TRANSITION"
          ? experienceV2Service.transitionTransfer(body.nextState)
          : experienceV2Service.advanceTransferToNextState(),
    );
    return NextResponse.json(result, { headers: noStoreHeaders });
  } catch (error) {
    return apiError(error);
  }
}

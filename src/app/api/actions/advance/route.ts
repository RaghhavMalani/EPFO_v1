import { NextResponse } from "next/server";
import { z } from "zod";
import { mutateSession, type SessionServices } from "@/application/session";
import { apiError, noStoreHeaders } from "@/app/api/http";
import { AdvanceGoalSchema, AdvanceStateSchema } from "@/domain/experience-v2";

const AdvanceActionBody = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("SELECT_GOAL"),
    goal: AdvanceGoalSchema,
    requestedAmountPaise: z.number().int().nonnegative().optional(),
  }),
  z.object({ action: z.literal("SUBMIT"), requestedAmountPaise: z.number().int().positive() }),
  z.object({ action: z.literal("TRANSITION"), nextState: AdvanceStateSchema }),
  z.object({ action: z.literal("ADVANCE") }),
]);

function runAdvanceAction(
  { experienceV2Service }: SessionServices,
  body: z.infer<typeof AdvanceActionBody>,
) {
  switch (body.action) {
    case "SELECT_GOAL":
      return experienceV2Service.setAdvanceGoal(body.goal, body.requestedAmountPaise ?? 0);
    case "SUBMIT":
      return experienceV2Service.submitAdvance(body.requestedAmountPaise);
    case "TRANSITION":
      return experienceV2Service.transitionAdvance(body.nextState);
    case "ADVANCE":
      return experienceV2Service.advanceAdvanceToNextState();
  }
}

export async function POST(request: Request) {
  try {
    const body = AdvanceActionBody.parse(await request.json());
    const result = await mutateSession((services) => runAdvanceAction(services, body));
    return NextResponse.json(result, { headers: noStoreHeaders });
  } catch (error) {
    return apiError(error);
  }
}

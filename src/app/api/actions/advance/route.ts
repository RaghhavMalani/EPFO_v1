import { NextResponse } from "next/server";
import { z } from "zod";
import { experienceV2Service } from "@/application/service-instance";
import { apiError, noStoreHeaders } from "@/app/api/http";
import { AdvanceGoalSchema } from "@/domain/experience-v2";

const AdvanceActionBody = z.discriminatedUnion("action", [
  z.object({ action: z.literal("SELECT_GOAL"), goal: AdvanceGoalSchema }),
  z.object({ action: z.literal("SUBMIT"), requestedAmountPaise: z.number().int().positive() }),
]);

export async function POST(request: Request) {
  try {
    const body = AdvanceActionBody.parse(await request.json());
    const result = body.action === "SELECT_GOAL"
      ? experienceV2Service.setAdvanceGoal(body.goal)
      : experienceV2Service.submitAdvance(body.requestedAmountPaise);
    return NextResponse.json(result, { headers: noStoreHeaders });
  } catch (error) {
    return apiError(error);
  }
}

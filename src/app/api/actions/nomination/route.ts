import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, noStoreHeaders } from "@/app/api/http";
import { mutateSession } from "@/application/session";

const NomineeInputSchema = z.object({
  name: z.string().min(1),
  relationship: z.string().min(1),
  sharePercentage: z.number().int().min(1).max(100),
  dateOfBirth: z.string().nullable(),
});

const SaveNominationBody = z.object({
  action: z.literal("SAVE"),
  nominees: z.array(NomineeInputSchema),
});

export async function POST(request: Request) {
  try {
    const body = SaveNominationBody.parse(await request.json());
    const snapshot = await mutateSession(({ epfoService }) => epfoService.saveNomination(body.nominees));
    return NextResponse.json(snapshot, { headers: noStoreHeaders });
  } catch (error) {
    return apiError(error);
  }
}

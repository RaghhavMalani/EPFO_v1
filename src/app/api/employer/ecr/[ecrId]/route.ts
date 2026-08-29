import { NextResponse } from "next/server";
import { z } from "zod";
import { experienceV2Service } from "@/application/service-instance";
import { apiError, noStoreHeaders } from "@/app/api/http";

const EcrActionBody = z.discriminatedUnion("action", [
  z.object({ action: z.literal("CORRECT_ROW"), rowId: z.string().min(1) }),
  z.object({ action: z.literal("GENERATE_CHALLAN") }),
  z.object({ action: z.literal("SIMULATE_PAYMENT") }),
]);

export async function POST(
  request: Request,
  { params }: { params: Promise<{ ecrId: string }> },
) {
  try {
    const { ecrId } = await params;
    const body = EcrActionBody.parse(await request.json());
    const result = body.action === "CORRECT_ROW"
      ? experienceV2Service.correctEcrRow(ecrId, body.rowId)
      : body.action === "GENERATE_CHALLAN"
        ? experienceV2Service.generateChallan(ecrId)
        : experienceV2Service.simulateEcrPayment(ecrId);
    return NextResponse.json(result, { headers: noStoreHeaders });
  } catch (error) {
    return apiError(error);
  }
}

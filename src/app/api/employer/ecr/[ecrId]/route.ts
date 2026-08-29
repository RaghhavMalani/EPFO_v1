import { NextResponse } from "next/server";
import { z } from "zod";
import { experienceV2Service } from "@/application/service-instance";
import { apiError, noStoreHeaders } from "@/app/api/http";

const RowCorrection = z.object({
  employee: z.string().min(1).max(120).optional(),
  uanMasked: z.string().min(1).max(40).optional(),
  wagePaise: z.number().int().nonnegative().optional(),
});

const EcrActionBody = z.discriminatedUnion("action", [
  z.object({ action: z.literal("VALIDATE") }),
  z.object({
    action: z.literal("CORRECT_ROW"),
    rowId: z.string().min(1),
    correction: RowCorrection.optional(),
  }),
  z.object({ action: z.literal("GENERATE_CHALLAN") }),
  z.object({ action: z.literal("START_PAYMENT") }),
  z.object({ action: z.literal("CONFIRM_PAYMENT") }),
]);

function runEcrAction(ecrId: string, body: z.infer<typeof EcrActionBody>) {
  switch (body.action) {
    case "VALIDATE":
      return experienceV2Service.validateEcr(ecrId);
    case "CORRECT_ROW":
      return experienceV2Service.correctEcrRow(ecrId, body.rowId, body.correction ?? {});
    case "GENERATE_CHALLAN":
      return experienceV2Service.generateChallan(ecrId);
    case "START_PAYMENT":
      return experienceV2Service.startEcrPayment(ecrId);
    case "CONFIRM_PAYMENT":
      return experienceV2Service.completeEcrPayment(ecrId);
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ ecrId: string }> },
) {
  try {
    const { ecrId } = await params;
    const body = EcrActionBody.parse(await request.json());
    return NextResponse.json(runEcrAction(ecrId, body), { headers: noStoreHeaders });
  } catch (error) {
    return apiError(error);
  }
}

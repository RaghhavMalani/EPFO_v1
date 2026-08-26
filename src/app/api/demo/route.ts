import { NextResponse } from "next/server";
import { z } from "zod";
import { epfoService } from "@/application/service-instance";
import { apiError, noStoreHeaders } from "@/app/api/http";
import type { ClaimState } from "@/domain/schemas";

const DemoActionBody = z.object({
  action: z.enum([
    "RESET",
    "VERIFY_ELIGIBILITY",
    "VERIFY_RECORDS",
    "APPROVE_CLAIM",
    "CREATE_PAYMENT_INSTRUCTION",
    "SEND_TO_BANK",
    "CREDIT_PAYMENT",
  ]),
});

const claimActionTargets: Partial<Record<z.infer<typeof DemoActionBody>["action"], ClaimState>> = {
  VERIFY_ELIGIBILITY: "ELIGIBILITY_VERIFIED",
  VERIFY_RECORDS: "RECORDS_VERIFIED",
  APPROVE_CLAIM: "APPROVED",
  CREATE_PAYMENT_INSTRUCTION: "PAYMENT_INSTRUCTION_CREATED",
  SEND_TO_BANK: "BANK_PROCESSING",
  CREDIT_PAYMENT: "CREDITED",
};

export async function POST(request: Request) {
  try {
    const { action } = DemoActionBody.parse(await request.json());
    if (action === "RESET") {
      return NextResponse.json(epfoService.reset(), { headers: noStoreHeaders });
    }
    const target = claimActionTargets[action];
    if (!target) {
      throw new Error("Unknown demo action.");
    }
    return NextResponse.json(epfoService.advanceClaim(target), { headers: noStoreHeaders });
  } catch (error) {
    return apiError(error);
  }
}

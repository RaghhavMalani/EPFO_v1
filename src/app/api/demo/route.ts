import { NextResponse } from "next/server";
import { z } from "zod";
import { mutateSession } from "@/application/session";
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
    // A reset rewrites this visitor's own scenario back to the fixtures. It is scoped
    // to their session, so resetting mid-demo cannot disturb anyone else's run.
    const snapshot = await mutateSession(({ epfoService }) => {
      if (action === "RESET") {
        return epfoService.reset();
      }
      const target = claimActionTargets[action];
      if (!target) {
        throw new Error("Unknown demo action.");
      }
      return epfoService.advanceClaim(target);
    });
    return NextResponse.json(snapshot, { headers: noStoreHeaders });
  } catch (error) {
    return apiError(error);
  }
}

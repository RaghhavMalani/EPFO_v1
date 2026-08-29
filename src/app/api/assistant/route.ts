import { NextResponse } from "next/server";
import { z } from "zod";
import { loadSession } from "@/application/session";
import { apiError, noStoreHeaders } from "@/app/api/http";
import { classifyByKeyword, resolveAssistantResponse } from "@/domain/assistant-intent";
import { classifyWithModel, type AccountContext } from "@/lib/groq";

const AssistantBody = z.object({ question: z.string().trim().min(3).max(240) });

/**
 * Ask EPFO One.
 *
 * The model classifies and explains; it never decides. The service, the account facts,
 * and the next step are all resolved from state after classification, so a wrong or
 * hallucinated answer can at worst open the wrong real screen — it cannot invent a
 * balance, an eligibility verdict, or a readiness score.
 *
 * If the model is unconfigured, slow, or returns something unusable, the keyword
 * classifier answers instead and the response says which path was taken.
 */
export async function POST(request: Request) {
  try {
    const { question } = AssistantBody.parse(await request.json());
    const { epfoService } = await loadSession();
    const snapshot = epfoService.getSnapshot();
    const { member, readiness, experience } = snapshot;

    const context: AccountContext = {
      hasContributionShortfall: experience.contributions.some(
        (item) => item.postingStatus === "MISSING" || item.postingStatus === "MISMATCH",
      ),
      hasUnconsolidatedPreviousAccount: member.employments.some(
        (record) =>
          !record.isCurrent && record.transferStatus === "NOT_TRANSFERRED" && record.pfBalancePaise > 0,
      ),
      isCurrentlyEmployed: member.employments.some((record) => record.isCurrent),
      hasClaimInFlight: snapshot.claim.state !== "DRAFT" && snapshot.claim.state !== "CREDITED",
      blockingReadinessChecks: readiness.totalChecks - readiness.passedCount,
    };

    const fromModel = await classifyWithModel(question, context);
    const classified = fromModel ?? classifyByKeyword(question);

    return NextResponse.json(
      resolveAssistantResponse(
        classified,
        fromModel ? "MODEL" : "DETERMINISTIC",
        member,
        experience.contributions,
        readiness,
      ),
      { headers: noStoreHeaders },
    );
  } catch (error) {
    return apiError(error);
  }
}

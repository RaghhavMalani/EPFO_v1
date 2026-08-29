import { describe, expect, it } from "vitest";
import {
  ASSISTANT_INTENTS,
  ModelIntentSchema,
  classifyByKeyword,
  resolveAssistantResponse,
  type AssistantIntent,
} from "@/domain/assistant-intent";
import { InMemoryEpfoRepository } from "@/repositories/in-memory-epfo-repository";

const state = new InMemoryEpfoRepository().getState();
const readiness = { passedCount: 5, totalChecks: 7 };

const resolve = (intent: AssistantIntent, source: "MODEL" | "DETERMINISTIC" = "MODEL") =>
  resolveAssistantResponse(
    { intent, explanation: "…", missingInformation: [] },
    source,
    state.member,
    state.experience.contributions,
    readiness,
  );

describe("assistant intent routing", () => {
  it("routes every intent to a real service and a real destination", () => {
    for (const intent of ASSISTANT_INTENTS) {
      const answer = resolve(intent);
      expect(answer.likelyService.length).toBeGreaterThan(0);
      expect(answer.suggestedNextStep?.href).toMatch(/^\//);
    }
  });

  it("computes account facts from state rather than taking them from the model", () => {
    // The model supplied no facts at all; every one of these is derived here.
    const contribution = resolve("UNDERSTAND_CONTRIBUTION");
    expect(contribution.relevantAccountFacts.join(" ")).toContain("2026-03");

    const transfer = resolve("TRANSFER_AFTER_JOB_CHANGE");
    expect(transfer.relevantAccountFacts.join(" ")).toMatch(/not yet consolidated/);

    const settlement = resolve("FINAL_SETTLEMENT");
    expect(settlement.relevantAccountFacts.join(" ")).toContain("5 of 7 checks");
  });

  it("reports which path produced the answer", () => {
    expect(resolve("PF_ADVANCE", "MODEL").source).toBe("MODEL");
    expect(resolve("PF_ADVANCE", "DETERMINISTIC").source).toBe("DETERMINISTIC");
  });
});

describe("model reply validation", () => {
  it("accepts a well-formed reply", () => {
    const parsed = ModelIntentSchema.safeParse({
      intent: "PF_ADVANCE",
      explanation: "You can take part of your PF out for medical treatment.",
      missingInformation: ["How much you need"],
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects an intent the product does not have a service for", () => {
    const parsed = ModelIntentSchema.safeParse({
      intent: "APPROVE_MY_CLAIM_NOW",
      explanation: "Approved.",
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects a reply with no explanation, so the fallback answers instead", () => {
    expect(ModelIntentSchema.safeParse({ intent: "PF_ADVANCE", explanation: "" }).success).toBe(false);
  });

  it("defaults missingInformation when the model leaves it out", () => {
    const parsed = ModelIntentSchema.parse({ intent: "CLAIM_STATUS", explanation: "In progress." });
    expect(parsed.missingInformation).toEqual([]);
  });
});

describe("keyword fallback", () => {
  it.each([
    ["I left my job two months ago and need my PF", "FINAL_SETTLEMENT"],
    ["Why is my March contribution lower?", "UNDERSTAND_CONTRIBUTION"],
    ["I changed companies but my old balance hasn't moved", "TRANSFER_AFTER_JOB_CHANGE"],
    ["मुझे इलाज के लिए PF से पैसे चाहिए", "PF_ADVANCE"],
    ["Maine company change ki hai, mera purana PF transfer nahi hua", "TRANSFER_AFTER_JOB_CHANGE"],
    ["What pension will I get at 58?", "PENSION_ESTIMATE"],
    ["I want to update my nominee", "UPDATE_ACCOUNT_DETAILS"],
  ])("classifies %j without a model", (question, expected) => {
    expect(classifyByKeyword(question).intent).toBe(expected);
  });

  it("falls back to guidance and says what it needs when nothing matches", () => {
    const result = classifyByKeyword("hello there");
    expect(result.intent).toBe("ACCOUNT_GUIDANCE");
    expect(result.missingInformation.length).toBeGreaterThan(0);
  });

  it("always produces something the resolver can route", () => {
    for (const question of ["", "?!", "random words entirely", "PF"]) {
      const classified = classifyByKeyword(question);
      expect(ASSISTANT_INTENTS).toContain(classified.intent);
      expect(classified.explanation.length).toBeGreaterThan(0);
    }
  });
});

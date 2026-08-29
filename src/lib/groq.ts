import { ModelIntentSchema, type ModelIntent } from "@/domain/assistant-intent";

/**
 * Groq chat completions, over plain fetch.
 *
 * The SDK would add a megabyte to pull one endpoint, and the thing that actually
 * matters here is the timeout: this runs in front of an audience on venue wifi, and
 * an assistant that hangs is worse than one that answers from the keyword classifier.
 * Everything below fails toward that fallback rather than toward an error.
 */

const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "openai/gpt-oss-20b";

/** Past this, the deterministic answer is better than a correct one that arrives late. */
const TIMEOUT_MS = 6_000;

const SYSTEM_PROMPT = `You are the intake layer of EPFO One, an Indian Employees' Provident Fund portal.

Your ONLY job is to classify what the person is trying to do, and to explain it back to them in plain language.

You MUST NOT state, calculate, estimate, or guess any of the following, because deterministic engines own them and will compute them after you:
- any rupee amount, balance, or contribution figure
- whether someone is eligible for anything
- how many readiness checks pass, or any percentage
- processing times, dates, or deadlines

Write the explanation for an ordinary person with no knowledge of EPFO forms or jargon. Two sentences at most. Never mention form numbers unless the person did. If the question is in Hindi, Hinglish, or another Indian language, reply in that same language.

List anything you would genuinely need from them before the request could proceed in missingInformation. Leave it empty if nothing is missing.

Reply with JSON only, in exactly this shape:
{"intent": "<one of the allowed intents>", "explanation": "<at most two sentences>", "missingInformation": ["<short phrase>"]}

Allowed intents:
- UNDERSTAND_CONTRIBUTION: a monthly contribution looks wrong, missing, late, or lower than expected
- FINAL_SETTLEMENT: they have left employment and want their full PF balance
- PF_ADVANCE: a partial withdrawal for medical treatment, marriage, education, or housing
- TRANSFER_AFTER_JOB_CHANGE: a previous employer's PF has not been merged into the current account
- PENSION_ESTIMATE: pension, retirement, or what they will receive at 58
- CLAIM_STATUS: where an already-filed claim has got to
- UPDATE_ACCOUNT_DETAILS: correcting a record, nominee, bank account, exit date, or personal detail
- ACCOUNT_GUIDANCE: anything else, or too vague to place`;

/** Facts about the account, so the model can classify in context. Never used for arithmetic. */
export type AccountContext = {
  hasContributionShortfall: boolean;
  hasUnconsolidatedPreviousAccount: boolean;
  isCurrentlyEmployed: boolean;
  hasClaimInFlight: boolean;
  blockingReadinessChecks: number;
};

export function isGroqConfigured(): boolean {
  return Boolean(process.env.GROQ_API_KEY);
}

/**
 * Asks the model to classify one question.
 *
 * Returns `null` on every failure path — unconfigured, timed out, non-200, unparseable,
 * or a reply that does not satisfy the schema — so the caller has exactly one thing to
 * handle rather than a taxonomy of errors.
 */
export async function classifyWithModel(
  question: string,
  context: AccountContext,
): Promise<ModelIntent | null> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return null;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(GROQ_ENDPOINT, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0,
        max_completion_tokens: 400,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              `Question: ${question}`,
              "",
              "Context about this account (for classification only — never repeat these as facts):",
              `- a monthly contribution is short or missing: ${context.hasContributionShortfall}`,
              `- a previous employer's PF is not consolidated: ${context.hasUnconsolidatedPreviousAccount}`,
              `- currently employed in a PF establishment: ${context.isCurrentlyEmployed}`,
              `- a claim is already in flight: ${context.hasClaimInFlight}`,
              `- readiness checks currently blocking: ${context.blockingReadinessChecks}`,
            ].join("\n"),
          },
        ],
      }),
    });

    if (!response.ok) {
      console.warn(`[epfo-one] Groq returned ${response.status}; answering deterministically.`);
      return null;
    }

    const payload = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = payload.choices?.[0]?.message?.content;
    if (!content) {
      return null;
    }

    // The model is instructed to return JSON, but a malformed reply is a fallback, not a crash.
    const parsed = ModelIntentSchema.safeParse(JSON.parse(content));
    return parsed.success ? parsed.data : null;
  } catch (error) {
    const reason = error instanceof Error && error.name === "AbortError" ? "timed out" : "failed";
    console.warn(`[epfo-one] Groq call ${reason}; answering deterministically.`);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

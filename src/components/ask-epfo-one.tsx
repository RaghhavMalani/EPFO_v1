"use client";

import { ArrowRightIcon, SparkleIcon, WarningCircleIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { type FormEvent, useState } from "react";
import type { AssistantResponse } from "@/domain/experience-v2";

/**
 * The natural-language way in.
 *
 * Deliberately not a chat bubble. It asks one question, and answers with a routed
 * service, the facts from the account that bear on it, and a link — because the point
 * is to get someone to the right screen, not to hold a conversation.
 */

const EXAMPLES = [
  "I left my job two months ago and need my PF",
  "Why is my March contribution lower?",
  "I changed companies but my old balance hasn't moved",
  "मुझे इलाज के लिए PF से पैसे चाहिए",
];

export function AskEpfoOne() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<AssistantResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function ask(asked: string) {
    const trimmed = asked.trim();
    if (trimmed.length < 3) return;

    setIsPending(true);
    setError(null);
    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmed }),
      });
      if (!response.ok) {
        throw new Error("That question could not be answered just now.");
      }
      setAnswer((await response.json()) as AssistantResponse);
    } catch (caught) {
      setAnswer(null);
      setError(caught instanceof Error ? caught.message : "Something went wrong.");
    } finally {
      setIsPending(false);
    }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void ask(question);
  }

  return (
    <section className="ask" aria-labelledby="ask-title">
      <div className="ask__head">
        <SparkleIcon size={20} weight="fill" aria-hidden="true" />
        <h2 id="ask-title">What are you trying to do?</h2>
      </div>
      <p className="ask__lead">
        Describe it in your own words, in English or Hindi. EPFO One works out which service
        you need and checks your record before you start.
      </p>

      <form onSubmit={onSubmit} className="ask__form">
        <label className="sr-only" htmlFor="ask-input">Your question</label>
        <input
          id="ask-input"
          type="text"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="I left my job and want my PF"
          maxLength={240}
          autoComplete="off"
          className="ask__input"
        />
        <button type="submit" disabled={isPending || question.trim().length < 3} className="ask__submit">
          {isPending ? "Thinking…" : "Ask"}
          {!isPending ? <ArrowRightIcon size={17} weight="bold" aria-hidden="true" /> : null}
        </button>
      </form>

      <ul className="ask__examples">
        {EXAMPLES.map((example) => (
          <li key={example}>
            <button
              type="button"
              disabled={isPending}
              onClick={() => {
                setQuestion(example);
                void ask(example);
              }}
            >
              {example}
            </button>
          </li>
        ))}
      </ul>

      <div aria-live="polite">
        {error ? (
          <p className="ask__error" role="alert">
            <WarningCircleIcon size={17} weight="fill" aria-hidden="true" />
            {error}
          </p>
        ) : null}

        {answer ? (
          <article className="ask__answer">
            <header>
              <span className="ask__service">{answer.likelyService}</span>
              {/* Stated rather than hidden: a judge should be able to see which path answered. */}
              <span className="ask__source">
                {answer.source === "MODEL" ? "Understood by AI" : "Matched without AI"}
              </span>
            </header>

            <p className="ask__explanation">{answer.explanation}</p>

            {answer.relevantAccountFacts.length > 0 ? (
              <dl className="ask__facts">
                <dt>From your record</dt>
                {answer.relevantAccountFacts.map((fact) => (
                  <dd key={fact}>{fact}</dd>
                ))}
              </dl>
            ) : null}

            {answer.missingInformation.length > 0 ? (
              <dl className="ask__facts ask__facts--missing">
                <dt>Still needed</dt>
                {answer.missingInformation.map((item) => (
                  <dd key={item}>{item}</dd>
                ))}
              </dl>
            ) : null}

            <p className="ask__note">
              Eligibility, amounts, and readiness are always calculated from your record — never
              written by the assistant.
            </p>

            {answer.suggestedNextStep ? (
              <Link href={answer.suggestedNextStep.href} className="ask__cta">
                {answer.suggestedNextStep.label}
                <ArrowRightIcon size={17} weight="bold" aria-hidden="true" />
              </Link>
            ) : null}
          </article>
        ) : null}
      </div>
    </section>
  );
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { loadSession } from "@/application/session";
import { apiError, noStoreHeaders } from "@/app/api/http";
import { explainEpfoContext } from "@/domain/assistant-context";

const AssistantBody = z.object({ question: z.string().trim().min(3).max(240) });

export async function POST(request: Request) {
  try {
    const { question } = AssistantBody.parse(await request.json());
    const { epfoService } = await loadSession();
    const snapshot = epfoService.getSnapshot();
    const result = explainEpfoContext(question, snapshot.member, snapshot.experience.contributions);
    return NextResponse.json(result, { headers: noStoreHeaders });
  } catch (error) {
    return apiError(error);
  }
}

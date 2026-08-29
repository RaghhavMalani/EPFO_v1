import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, noStoreHeaders } from "@/app/api/http";
import { ROLE_COOKIE } from "@/lib/auth";
import { TOUR_COOKIE, TOUR_MAX_AGE_SECONDS } from "@/lib/tour";
import { TOUR_STEPS } from "@/domain/judge-tour";

/**
 * Walkthrough navigation.
 *
 * Moving between beats can also change which role you are signed in as — that switch
 * is the point of the demo, not a shortcut around sign-in. The role cookie is
 * cosmetic gating over two published demo identities, so setting it here grants
 * nothing that the sign-in screen does not already hand out.
 */

const TourCommand = z.discriminatedUnion("action", [
  z.object({ action: z.literal("START") }),
  z.object({ action: z.literal("EXIT") }),
  z.object({ action: z.literal("GO"), index: z.number().int().min(0).max(TOUR_STEPS.length - 1) }),
]);

export async function POST(request: Request) {
  try {
    const command = TourCommand.parse(await request.json());
    const cookieStore = await cookies();

    if (command.action === "EXIT") {
      cookieStore.delete(TOUR_COOKIE);
      return NextResponse.json({ redirectTo: "/" }, { headers: noStoreHeaders });
    }

    const index = command.action === "START" ? 0 : command.index;
    const step = TOUR_STEPS[index];

    cookieStore.set(TOUR_COOKIE, String(index), {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: TOUR_MAX_AGE_SECONDS,
    });
    cookieStore.set(ROLE_COOKIE, step.role, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 8,
    });

    return NextResponse.json({ redirectTo: step.href, role: step.role }, { headers: noStoreHeaders });
  } catch (error) {
    return apiError(error);
  }
}

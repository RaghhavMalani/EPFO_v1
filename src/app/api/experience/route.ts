import { NextResponse } from "next/server";
import { loadSession } from "@/application/session";
import { apiError, noStoreHeaders } from "@/app/api/http";

/**
 * The Experience V2 read model: contributions with their health verdicts, the
 * passbook summary, advance, transfer, ECR files, activity, and past claims.
 */
export async function GET() {
  try {
    const { experienceV2Service } = await loadSession();
    return NextResponse.json(experienceV2Service.getExperience(), { headers: noStoreHeaders });
  } catch (error) {
    return apiError(error);
  }
}

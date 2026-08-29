import { NextResponse } from "next/server";
import { experienceV2Service } from "@/application/service-instance";
import { noStoreHeaders } from "@/app/api/http";

/**
 * The Experience V2 read model: contributions with their deterministic health verdicts,
 * the passbook summary, advance, transfer, ECR files, activity, and past claims.
 */
export async function GET() {
  return NextResponse.json(experienceV2Service.getExperience(), { headers: noStoreHeaders });
}

import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { noStoreHeaders } from "@/app/api/http";
import { ROLE_COOKIE } from "@/lib/auth";

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.delete(ROLE_COOKIE);
  return NextResponse.json({ redirectTo: "/login" }, { headers: noStoreHeaders });
}

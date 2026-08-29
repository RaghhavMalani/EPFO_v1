import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, noStoreHeaders } from "@/app/api/http";
import { DEMO_PASSWORD, ROLE_COOKIE, ROLE_HOME } from "@/lib/auth";

const LoginCommandSchema = z.object({
  role: z.enum(["member", "employer"]),
  password: z.string(),
});

export async function POST(request: Request) {
  try {
    const { role, password } = LoginCommandSchema.parse(await request.json());
    if (password !== DEMO_PASSWORD) {
      return NextResponse.json(
        { error: "Incorrect password. Use the demo credentials shown on the card." },
        { status: 401, headers: noStoreHeaders },
      );
    }

    const cookieStore = await cookies();
    cookieStore.set(ROLE_COOKIE, role, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 8,
    });

    return NextResponse.json({ redirectTo: ROLE_HOME[role] }, { headers: noStoreHeaders });
  } catch (error) {
    return apiError(error);
  }
}

import { NextRequest, NextResponse } from "next/server";
import { cognitoSubmissionHandler } from "@/lib/cognitoSubmissionHandler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  console.log("WEBHOOK ROUTE HIT (local):", new Date().toISOString());

  try {
    const token = req.nextUrl.searchParams.get("token");
    if (!token || token !== process.env.COGNITO_WEBHOOK_TOKEN) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = await req.json();

    await cognitoSubmissionHandler(payload);

    return NextResponse.json(
      { message: "Webhook received successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error processing webhook:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

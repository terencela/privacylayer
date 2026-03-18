import { NextRequest, NextResponse } from "next/server";
import { detectPII } from "@/lib/pii-engine";

export async function POST(req: NextRequest) {
  const { text } = await req.json();
  if (!text || typeof text !== "string") {
    return NextResponse.json({ error: "text field required" }, { status: 400 });
  }
  const result = detectPII(text);
  return NextResponse.json({
    anonymized: result.anonymized,
    matches: result.matches.map((m) => ({
      type: m.type,
      token: m.token,
      risk: m.risk,
    })),
    threatScore: result.threatScore,
    riskBreakdown: result.riskBreakdown,
    piiCount: result.matches.length,
  });
}

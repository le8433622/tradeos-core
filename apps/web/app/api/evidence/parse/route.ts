import { NextResponse } from "next/server";
import { ManualTextEvidenceAdapter } from "@tradeos/evidence-core";
import { apiErrorResponse, withApiSession } from "../../../../lib/api-errors";

const adapter = new ManualTextEvidenceAdapter();

export async function POST(request: Request) {
  try {
    const auth = await withApiSession(request);
    if (auth.response) return auth.response;

    const body = await request.json();
    const { text } = body;

    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    const result = adapter.parse({
      text,
      sourceType: "MANUAL_TEXT",
      reference: `manual-${Date.now()}`,
    });

    return NextResponse.json(result);
  } catch (error) {
    return apiErrorResponse(request, error);
  }
}

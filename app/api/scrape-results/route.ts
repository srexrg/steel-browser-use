import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const PYTHON_SERVER_URL = process.env.PYTHON_SERVER_URL || "http://localhost:8000";
    const sessionId = new URL(request.url).searchParams.get("sessionId");

    if (!sessionId) {
      return NextResponse.json({ error: "sessionId required" }, { status: 400 });
    }

    const response = await fetch(`${PYTHON_SERVER_URL}/results/${sessionId}`);
    if (!response.ok) {
      return NextResponse.json({ error: "Failed to get results" }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch results", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}


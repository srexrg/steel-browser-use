import { NextResponse } from "next/server";

export async function POST() {
  try {
    const PYTHON_SERVER_URL = process.env.PYTHON_SERVER_URL || "http://localhost:8000";

    const response = await fetch(`${PYTHON_SERVER_URL}/scrape-airbnb-sf`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ task: "" }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.detail || errorData.message || `Server error ${response.status}`;
      throw new Error(errorMessage);
    }

    const data = await response.json();
    return NextResponse.json({
      success: true,
      sessionId: data.sessionId,
      sessionViewerUrl: data.sessionViewerUrl,
      message: data.message,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to scrape Airbnb", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}


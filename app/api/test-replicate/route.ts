import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const apiToken = process.env.REPLICATE_API_TOKEN

  if (!apiToken) {
    return NextResponse.json(
      {
        error: "REPLICATE_API_TOKEN not configured",
        hasToken: false,
      },
      { status: 500 },
    )
  }

  try {
    console.log("Testing Replicate API connection...")

    // Test basic API connectivity
    const response = await fetch("https://api.replicate.com/v1/models", {
      headers: {
        Authorization: `Bearer ${apiToken}`,
      },
    })

    console.log("Test response status:", response.status)

    if (!response.ok) {
      const errorText = await response.text()
      return NextResponse.json(
        {
          error: `API test failed: ${response.status} - ${errorText}`,
          hasToken: true,
          status: response.status,
        },
        { status: response.status },
      )
    }

    const data = await response.json()

    return NextResponse.json({
      success: true,
      hasToken: true,
      message: "Replicate API connection successful",
      modelsCount: data.results?.length || 0,
    })
  } catch (error) {
    console.error("Replicate API test error:", error)

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
        hasToken: true,
        type: error instanceof TypeError ? "Network Error" : "API Error",
      },
      { status: 500 },
    )
  }
}

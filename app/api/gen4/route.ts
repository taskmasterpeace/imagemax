import { type NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    if (!process.env.REPLICATE_API_TOKEN) {
      return NextResponse.json(
        { error: "REPLICATE_API_TOKEN is not configured" },
        { status: 500 }
      );
    }
    const apiKey = process.env.REPLICATE_API_TOKEN;
    const {
      prompt,
      aspectRatio,
      resolution,
      referenceImages,
      referenceTags,
    }: {
      prompt: string;
      aspectRatio: string;
      resolution: string;
      referenceImages: string[];
      referenceTags: string[];
    } = await request.json();

    if (!prompt) {
      return NextResponse.json({ error: "Missing prompt" }, { status: 400 });
    }

    if (!referenceImages || referenceImages.length === 0) {
      return NextResponse.json(
        { error: "At least one reference image is required" },
        { status: 400 }
      );
    }

    const body = {
      input: {
        reference_images: referenceImages,
        reference_tags: referenceTags,
        prompt: prompt,
        resolution: resolution,
        aspect_ratio: aspectRatio,
      },
    };
    const generateResponse = await fetch(
      `https://api.replicate.com/v1/models/runwayml/gen4-image/predictions`,
      {
        method: "POST",
        headers: {
          Authorization: `Token ${apiKey}`,
          "Content-Type": "application/json",
          Prefer: "wait",
        },
        body: JSON.stringify(body),
      }
    );

    if (!generateResponse.ok) {
      const errorText = await generateResponse.text();
      console.error(
        `🔴 Gen 4 Generation Failed: Status ${generateResponse.status}`,
        errorText
      );
      return NextResponse.json(
        { error: "Failed to create prediction" },
        { status: generateResponse.status }
      );
    }

    const prediction = await generateResponse.json();
    let result = prediction;

    return NextResponse.json({
      success: true,
      imageUrl: Array.isArray(result.output) ? result.output[0] : result.output,
      predictionId: result.id,
      referenceCount: referenceImages.length,
    });
  } catch (error) {
    console.error("Gen 4 generation error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

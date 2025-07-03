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
    const formData = await request.formData();
    const prompt = formData.get("prompt") as string;
    const aspectRatio = formData.get("aspectRatio") as string;
    const resolution = formData.get("resolution") as string;

    if (!prompt) {
      return NextResponse.json({ error: "Missing prompt" }, { status: 400 });
    }

    // Step 1: Upload reference images
    const referenceImages: string[] = [];
    const referenceTags: string[] = [];
    const uploadPromises = [];

    for (let i = 1; i <= 3; i++) {
      const image = formData.get(`referenceImage${i}`) as File;
      const imageTags = formData.get(`referenceTags${i}`) as string;

      if (!image) continue;

      const uploadPromise = (async () => {
        const imageBuffer = await image.arrayBuffer();
        const imageBlob = new Blob([imageBuffer], { type: image.type });
        const uploadFormData = new FormData();
        uploadFormData.append("filename", image.name);
        uploadFormData.append("content", imageBlob);

        const nestedArray: string[] = imageTags ? JSON.parse(imageTags) : [];
        const flatArray = nestedArray.flat();

        const uploadResponse = await fetch(
          "https://api.replicate.com/v1/files",
          {
            method: "POST",
            headers: {
              Authorization: `Token ${apiKey}`,
            },
            body: uploadFormData,
          }
        );

        if (!uploadResponse.ok) {
          const errorText = await uploadResponse.text();
          throw new Error(
            `Image upload failed: ${uploadResponse.status} - ${errorText}`
          );
        }

        const uploadResult = await uploadResponse.json();
        const servingUrl = uploadResult.urls.get;

        referenceImages.push(servingUrl);
        referenceTags.push(flatArray.join(","));

        return servingUrl;
      })();

      uploadPromises.push(uploadPromise);
    }

    await Promise.all(uploadPromises);

    if (referenceImages.length === 0) {
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

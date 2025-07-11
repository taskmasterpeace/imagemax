import { type NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const apiToken = process.env.REPLICATE_API_TOKEN!;
    const {
      fileUrl,
      prompt,
      resolution,
      duration,
      camera_fixed,
      mode,
      seedanceModel,
      filename,
    }: {
      fileUrl: string;
      prompt: string;
      resolution: string;
      duration: number;
      camera_fixed: boolean;
      mode: "seedance" | "kontext";
      seedanceModel: string;
      filename: string;
    } = await request.json();

    if (!fileUrl || !prompt) {
      return NextResponse.json(
        { error: "Missing fileUrl or prompt" },
        { status: 400 }
      );
    }

    // Generate media
    const { model, settings } =
      mode === "seedance"
        ? {
            model: `bytedance/${seedanceModel}`,
            settings: (imageUrl: string, promptText: string) => ({
              image: imageUrl,
              fps: 24,
              prompt: promptText,
              resolution,
              duration,
              camera_fixed,
            }),
          }
        : {
            model: "black-forest-labs/flux-kontext-pro",
            settings: (imageUrl: string, promptText: string) => ({
              input_image: imageUrl,
              prompt: promptText,
              duration,
              safety_tolerance: 2,
            }),
          };
    try {
      const generateResponse = await fetch(
        `https://api.replicate.com/v1/models/${model}/predictions`,
        {
          method: "POST",
          headers: {
            Authorization: `Token ${apiToken}`,
            "Content-Type": "application/json",
            Prefer: "wait",
          },
          body: JSON.stringify({
            input: settings(fileUrl, prompt),
          }),
        }
      );

      if (!generateResponse.ok) {
        const errorText = await generateResponse.text();
        console.error(
          `🔴 Video Generation Failed for ${filename}: Status ${generateResponse.status}`,
          errorText
        );
        return NextResponse.json({
          status: "failed",
          generatedResponse: {
            filename,
            prompt,
            status: "failed",
            error: `Video generation failed: ${generateResponse.status}`,
          },
        });
      }

      let generateResult = await generateResponse.json();

      do {
        const generateResponse = await fetch(
          `https://api.replicate.com/v1/predictions/${generateResult.id}`,
          {
            method: "GET",
            headers: {
              Authorization: `Token ${apiToken}`,
            },
          }
        );
        generateResult = await generateResponse.json();
      } while (!generateResult.error && generateResult.status != "succeeded"); 

     
      const url = generateResult?.output;

      return NextResponse.json({
        status: "completed",
        generatedResponse: {
          filename,
          fileUrl,
          prompt,
          status: "completed",
          outputUrl: url,
        },
      });
    } catch (error: any) {
      console.error(`🔴 Unexpected error for ${filename}:`, error);
      return NextResponse.json({
        status: "failed",
        generatedResponse: {
          filename,
          fileUrl,
          prompt,
          status: "failed",
          error: error.message || "An unexpected error occurred.",
        },
      });
    }
  } catch (error) {
    console.error("Error in generate-videos POST:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

import { type NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const apiToken = process.env.REPLICATE_API_TOKEN!;
    const {
      fileUrls,
      prompts,
      resolution,
      duration,
      camera_fixed,
      mode,
      seedanceModel,
    }: {
      fileUrls: string[];
      prompts: string[];
      resolution: string;
      duration: number;
      camera_fixed: boolean;
      mode: "seedance" | "kontext";
      seedanceModel: string;
    } = await request.json();

    if (!fileUrls || !prompts) {
      return NextResponse.json(
        { error: "Missing fileUrls or prompts" },
        { status: 400 }
      );
    }

    const imagesUrlsAndNames = fileUrls.map((url: string, index: number) => ({
      servingUrl: url,
      filename: `media_${index}`,
    }));

    // Generate medias
    const { model, settings } =
      mode === "seedance"
        ? {
            model: `bytedance/${seedanceModel}`,
            settings: (imageUrl: string, prompt: string) => ({
              image: imageUrl,
              fps: 24,
              prompt,
              resolution,
              duration,
              camera_fixed,
            }),
          }
        : {
            model: "black-forest-labs/flux-kontext-pro",
            settings: (imageUrl: string, prompt: string) => ({
              input_image: imageUrl,
              prompt,
              duration,
              safety_tolerance: 2,
            }),
          };

    const generatedResponse = await Promise.all(
      imagesUrlsAndNames.map(
        async (
          { servingUrl, filename }: { servingUrl: string; filename: string },
          index: number
        ) => {
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
                  input: settings(servingUrl, prompts[index]),
                }),
              }
            );

            if (!generateResponse.ok) {
              const errorText = await generateResponse.text();
              console.error(
                `🔴 Video Generation Failed for ${filename}: Status ${generateResponse.status}`,
                errorText
              );
              return {
                filename,
                prompt: prompts[index],
                status: "failed",
                error: `Video generation failed: ${generateResponse.status}`,
              };
            }

            const generateResult = await generateResponse.json();
            const url = generateResult?.output;
            return {
              filename,
              fileUrl: servingUrl,
              prompt: prompts[index],
              status: "completed",
              outputUrl: url,
            };
          } catch (error: any) {
            console.error(`🔴 Unexpected error for ${filename}:`, error);
            return {
              filename,
              fileUrl: servingUrl,
              prompt: prompts[index],
              status: "failed",
              error: error.message || "An unexpected error occurred.",
            };
          }
        }
      )
    );

    return NextResponse.json({
      status: "completed",
      generatedResponse,
    });
  } catch (error) {
    console.error("Error in generate-videos POST:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

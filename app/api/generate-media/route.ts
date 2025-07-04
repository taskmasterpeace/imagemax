import { type NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const apiToken = process.env.REPLICATE_API_TOKEN!;
    const formData = await request.formData();
    const images = formData.getAll("images") as File[];
    const metadataStr = formData.get("metadata") as string;

    if (!images.length || !metadataStr) {
      return NextResponse.json(
        { error: "Missing images or metadata" },
        { status: 400 }
      );
    }

    const metadata: {
      fileUrls: string[];
      prompts: string[];
      resolution: string;
      duration: number;
      camera_fixed: boolean;
      mode: "seedance" | "kontext";
      seedanceModel: string;
    } = JSON.parse(metadataStr);
    const { prompts, resolution, duration, camera_fixed, mode, seedanceModel, fileUrls } = metadata;

    console.log("fileUrls", fileUrls)

    let imagesUrlsAndNames = [];
    if (fileUrls && Array.isArray(fileUrls) && fileUrls.length > 0) {
      imagesUrlsAndNames = images.map((image, index) => ({
        filename: image.name,
        servingUrl: fileUrls[index],
      }));
    } else {
      // Upload images to Replicate and store their filenames
      imagesUrlsAndNames = await Promise.all(
        images.map(async (image) => {
          const imageBuffer = await image.arrayBuffer();
          const imageBlob = new Blob([imageBuffer], { type: image.type });
          const uploadFormData = new FormData();
          uploadFormData.append("filename", image.name);
          uploadFormData.append("content", imageBlob);
  
          const uploadResponse = await fetch(
            "https://api.replicate.com/v1/files",
            {
              method: "POST",
              headers: {
                Authorization: `Token ${apiToken}`,
              },
              body: uploadFormData,
            }
          );
  
          if (!uploadResponse.ok) {
            const errorText = await uploadResponse.text();
            console.error(
              `🔴 Image Upload Failed: Status ${uploadResponse.status}`,
              errorText
            );
            throw new Error(
              `Image upload failed for ${image.name}: ${uploadResponse.status} - ${errorText}`
            );
          }
  
          const uploadResult = await uploadResponse.json();
          const servingUrl = uploadResult.urls.get as string;
          return { servingUrl, filename: image.name };
        })
      );
    }


    console.log("Uploaded images:", imagesUrlsAndNames);

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

    console.log("Generated model:", model);
    console.log("Generated settings:", settings);
    const generatedResponse = await Promise.all(
      imagesUrlsAndNames.map(async ({ servingUrl, filename }, index) => {
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
      })
    );

    console.log("Generated tasks:", generatedResponse);

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

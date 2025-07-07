import { type NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const apiToken = process.env.REPLICATE_API_TOKEN;
    if (!apiToken) {
      return NextResponse.json(
        { error: "Replicate API token is not configured" },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const mediaFile = formData.get("media") as File | null;

    if (!mediaFile) {
      return NextResponse.json(
        { error: "Missing media file" },
        { status: 400 }
      );
    }

    const imageBuffer = await mediaFile.arrayBuffer();
    const imageBlob = new Blob([imageBuffer], { type: mediaFile.type });

    const uploadFormData = new FormData();
    uploadFormData.append("content", imageBlob, mediaFile.name);

    const uploadResponse = await fetch("https://api.replicate.com/v1/files", {
      method: "POST",
      headers: {
        Authorization: `Token ${apiToken}`,
      },
      body: uploadFormData,
    });

    const responseData = await uploadResponse.json();

    if (!uploadResponse.ok) {
      console.error(
        `🔴 Media Upload Failed: Status ${uploadResponse.status}`,
        responseData
      );
      return NextResponse.json(
        {
          error: `Media upload failed: ${uploadResponse.status}`,
          details: responseData,
        },
        { status: uploadResponse.status }
      );
    }

    return NextResponse.json(responseData, { status: 200 });
  } catch (error: any) {
    console.error("Error in upload-media POST:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}

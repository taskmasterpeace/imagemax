import { type NextRequest, NextResponse } from "next/server"
import Replicate from "replicate"

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
})

export async function POST(request: NextRequest) {
  try {
    console.log("Starting Kontext edit...")

    if (!process.env.REPLICATE_API_TOKEN) {
      return NextResponse.json({ error: "REPLICATE_API_TOKEN is not configured" }, { status: 500 })
    }

    const formData = await request.formData()
    const image = formData.get("image") as File
    const prompt = formData.get("prompt") as string
    const editId = formData.get("editId") as string
    const model = formData.get("model") as string

    if (!image || !prompt || !editId) {
      return NextResponse.json({ error: "Missing required fields: image, prompt, or editId" }, { status: 400 })
    }

    console.log("Edit request:", {
      filename: image.name,
      prompt,
      editId,
      model,
      imageSize: image.size,
    })

    // Step 1: Upload image to Replicate
    console.log("Uploading image to Replicate...")
    const uploadedFile = await replicate.files.create(image)
    console.log("Image uploaded:", uploadedFile.urls.get)

    // Step 2: Create Kontext edit prediction
    console.log("Creating Kontext edit prediction...")

    // Use the appropriate Kontext model version
    const modelVersion =
      model === "max"
        ? "ac732df83cea7fff18b8472768c88ad041fa750ff7682a21affe81863cbe77e4" // Kontext Max
        : "9a3e2a9b8b8b8b8b8b8b8b8b8b8b8b8b8b8b8b8b8b8b8b8b8b8b8b8b8b8b8b8b" // Kontext Dev

    const prediction = await replicate.predictions.create({
      version: modelVersion,
      input: {
        image: uploadedFile.urls.get,
        prompt: prompt,
        model: model,
      },
    })

    console.log("Prediction created:", prediction.id)

    // Step 3: Poll for completion
    let result = prediction
    let attempts = 0
    const maxAttempts = 60 // 5 minutes max (5 second intervals)

    while (result.status === "starting" || result.status === "processing") {
      if (attempts >= maxAttempts) {
        throw new Error("Edit timed out after 5 minutes")
      }

      await new Promise((resolve) => setTimeout(resolve, 5000)) // Wait 5 seconds
      result = await replicate.predictions.get(prediction.id)
      attempts++

      console.log(`Polling attempt ${attempts}: ${result.status}`)
    }

    if (result.status === "succeeded") {
      console.log("Edit completed successfully")
      return NextResponse.json({
        success: true,
        imageUrl: result.output,
        editId,
        model,
        predictionId: prediction.id,
      })
    } else {
      console.error("Edit failed:", result.error)
      return NextResponse.json(
        {
          error: result.error || "Edit failed",
          editId,
          predictionId: prediction.id,
        },
        { status: 500 },
      )
    }
  } catch (error) {
    console.error("Kontext edit error:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error occurred",
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 },
    )
  }
}

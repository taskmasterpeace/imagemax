import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const prompt = formData.get("prompt") as string
    const seed = formData.get("seed") as string | null
    const aspectRatio = formData.get("aspect_ratio") as string
    const resolution = formData.get("resolution") as string
    const referenceImages = formData.getAll("reference_images") as File[]
    const referenceTags = formData.getAll("reference_tags") as string[]

    if (!prompt?.trim()) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 })
    }

    if (referenceImages.length === 0 || referenceImages.length > 3) {
      return NextResponse.json({ error: "1-3 reference images required" }, { status: 400 })
    }

    const apiToken = process.env.REPLICATE_API_TOKEN

    if (!apiToken) {
      return NextResponse.json({ error: "REPLICATE_API_TOKEN not configured" }, { status: 500 })
    }

    console.log("=== Starting Gen 4 Generation ===")
    console.log("Prompt:", prompt)
    console.log("Reference Images:", referenceImages.length)
    console.log("Aspect Ratio:", aspectRatio)
    console.log("Resolution:", resolution)
    console.log("Reference Tags:", referenceTags)

    // Step 1: Upload reference images to Replicate
    const uploadedImageUrls: string[] = []

    for (let i = 0; i < referenceImages.length; i++) {
      const image = referenceImages[i]
      console.log(`Uploading reference image ${i + 1}: ${image.name}`)

      const imageBuffer = await image.arrayBuffer()
      const imageBlob = new Blob([imageBuffer], { type: image.type })
      const uploadFormData = new FormData()
      uploadFormData.append("file", imageBlob, image.name)

      const uploadResponse = await fetch("https://api.replicate.com/v1/files", {
        method: "POST",
        headers: {
          Authorization: `Token ${apiToken}`,
        },
        body: uploadFormData,
      })

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text()
        console.error(`Upload error for image ${i + 1}:`, errorText)
        throw new Error(`Image upload failed: ${uploadResponse.status} - ${errorText}`)
      }

      const uploadResult = await uploadResponse.json()
      uploadedImageUrls.push(uploadResult.serving_url)
      console.log(`Image ${i + 1} uploaded successfully`)
    }

    // Step 2: Create Gen 4 prediction
    console.log("Creating Gen 4 prediction...")

    // Note: You'll need to replace this with the actual Gen 4 model version ID
    const gen4ModelVersion = "gen4-model-version-id" // Replace with actual version ID

    const predictionData = {
      version: gen4ModelVersion,
      input: {
        prompt: prompt,
        reference_images: uploadedImageUrls,
        aspect_ratio: aspectRatio,
        resolution: resolution,
        ...(seed && { seed: Number.parseInt(seed) }),
        ...(referenceTags.length > 0 && { reference_tags: referenceTags }),
      },
    }

    console.log("Prediction data:", JSON.stringify(predictionData, null, 2))

    const predictionResponse = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        Authorization: `Token ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(predictionData),
    })

    if (!predictionResponse.ok) {
      const errorText = await predictionResponse.text()
      console.error("Prediction error response:", errorText)
      throw new Error(`Prediction creation failed: ${predictionResponse.status} - ${errorText}`)
    }

    const prediction = await predictionResponse.json()
    console.log("Prediction created:", prediction.id, "Status:", prediction.status)

    // Step 3: Poll for completion
    console.log("Polling for completion...")
    const maxWaitTime = 5 * 60 * 1000 // 5 minutes
    const startTime = Date.now()
    let finalPrediction = prediction

    while (
      (finalPrediction.status === "starting" || finalPrediction.status === "processing") &&
      Date.now() - startTime < maxWaitTime
    ) {
      await new Promise((resolve) => setTimeout(resolve, 2000)) // Poll every 2 seconds

      const statusResponse = await fetch(`https://api.replicate.com/v1/predictions/${finalPrediction.id}`, {
        headers: {
          Authorization: `Token ${apiToken}`,
        },
      })

      if (!statusResponse.ok) {
        throw new Error(`Status check failed: ${statusResponse.status}`)
      }

      finalPrediction = await statusResponse.json()
      console.log("Poll result:", finalPrediction.status)
    }

    // Check final status
    if (finalPrediction.status === "succeeded") {
      if (!finalPrediction.output) {
        throw new Error("Prediction succeeded but no output received")
      }

      const generatedImageUrl = Array.isArray(finalPrediction.output)
        ? finalPrediction.output[0]
        : finalPrediction.output

      console.log("=== Gen 4 Generation Complete ===")
      console.log("Generated Image URL:", generatedImageUrl)

      return NextResponse.json({
        success: true,
        imageUrl: generatedImageUrl,
        aspectRatio: aspectRatio,
        resolution: resolution,
        referenceCount: referenceImages.length,
      })
    } else if (finalPrediction.status === "failed") {
      const errorMsg = finalPrediction.error || "Gen 4 generation failed"
      console.error("Prediction failed:", errorMsg)
      throw new Error(errorMsg)
    } else {
      throw new Error(`Gen 4 generation timed out. Final status: ${finalPrediction.status}`)
    }
  } catch (error) {
    console.error("=== Gen 4 Generation Error ===")
    console.error("Error details:", error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Gen 4 generation failed",
      },
      { status: 500 },
    )
  }
}

import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const image = formData.get("image") as File
    const prompt = formData.get("prompt") as string
    const editId = formData.get("editId") as string
    const model = formData.get("model") as "dev" | "max"

    if (!image || !prompt || !model) {
      return NextResponse.json({ error: "Missing image, prompt, or model" }, { status: 400 })
    }

    const apiToken = process.env.REPLICATE_API_TOKEN

    if (!apiToken) {
      return NextResponse.json({ error: "REPLICATE_API_TOKEN not configured" }, { status: 500 })
    }

    console.log("=== Starting Kontext Edit ===")
    console.log("Image:", image.name, "Size:", image.size, "Type:", image.type)
    console.log("Prompt:", prompt)
    console.log("Model:", model)
    console.log("Edit ID:", editId)

    // Step 1: Upload image to Replicate
    console.log("Step 1: Uploading image to Replicate...")
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
      console.error("Upload error response:", errorText)
      throw new Error(`Image upload failed: ${uploadResponse.status} - ${errorText}`)
    }

    const uploadResult = await uploadResponse.json()
    const imageUrl = uploadResult.serving_url
    console.log("Image uploaded successfully. URL:", imageUrl)

    // Step 2: Create Kontext prediction with the selected model
    console.log("Step 2: Creating Kontext prediction...")

    // Model version IDs (you'll need to get the actual version IDs from Replicate)
    const modelVersions = {
      dev: "flux-kontext-dev-version-id", // Replace with actual version ID
      max: "flux-kontext-max-version-id", // Replace with actual version ID
    }

    const predictionData = {
      version: modelVersions[model],
      input: {
        prompt: prompt,
        input_image: imageUrl,
        output_format: "jpg",
        // Dev model specific parameters
        ...(model === "dev" && {
          go_fast: true,
          guidance: 2.5,
          aspect_ratio: "match_input_image",
          output_quality: 80,
          num_inference_steps: 30,
        }),
        // Max model uses default parameters for premium quality
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
    console.log("Step 3: Polling for completion...")
    const maxWaitTime = model === "dev" ? 3 * 60 * 1000 : 5 * 60 * 1000 // Dev: 3 min, Max: 5 min
    const startTime = Date.now()
    let finalPrediction = prediction

    while (
      (finalPrediction.status === "starting" || finalPrediction.status === "processing") &&
      Date.now() - startTime < maxWaitTime
    ) {
      const waitTime = model === "dev" ? 1500 : 2000 // Dev polls faster
      await new Promise((resolve) => setTimeout(resolve, waitTime))

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

      const editedImageUrl = Array.isArray(finalPrediction.output) ? finalPrediction.output[0] : finalPrediction.output

      console.log("=== Image Edit Complete ===")
      console.log("Model used:", model.toUpperCase())
      console.log("Edited Image URL:", editedImageUrl)

      return NextResponse.json({
        success: true,
        imageUrl: editedImageUrl,
        editId: editId,
        model: model,
      })
    } else if (finalPrediction.status === "failed") {
      const errorMsg = finalPrediction.error || "Image editing failed"
      console.error("Prediction failed:", errorMsg)
      throw new Error(errorMsg)
    } else {
      throw new Error(`Image editing timed out. Final status: ${finalPrediction.status}`)
    }
  } catch (error) {
    console.error("=== Kontext Edit Error ===")
    console.error("Error details:", error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Image editing failed",
      },
      { status: 500 },
    )
  }
}

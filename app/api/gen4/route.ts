import { type NextRequest, NextResponse } from "next/server"
import Replicate from "replicate"

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
})

export async function POST(request: NextRequest) {
  try {
    console.log("Starting Gen 4 generation...")

    if (!process.env.REPLICATE_API_TOKEN) {
      return NextResponse.json({ error: "REPLICATE_API_TOKEN is not configured" }, { status: 500 })
    }

    const formData = await request.formData()
    const prompt = formData.get("prompt") as string
    const aspectRatio = formData.get("aspectRatio") as string
    const resolution = formData.get("resolution") as string
    const seed = formData.get("seed") as string

    if (!prompt) {
      return NextResponse.json({ error: "Missing prompt" }, { status: 400 })
    }

    console.log("Gen 4 request:", {
      prompt,
      aspectRatio,
      resolution,
      seed,
    })

    // Step 1: Upload reference images
    const referenceImages: string[] = []
    const referenceTags: string[][] = []

    for (let i = 1; i <= 3; i++) {
      const image = formData.get(`referenceImage${i}`) as File
      const tags = formData.get(`referenceTags${i}`) as string

      if (image) {
        console.log(`Uploading reference image ${i}: ${image.name}`)
        const uploadedFile = await replicate.files.create(image)
        referenceImages.push(uploadedFile.urls.get)

        if (tags) {
          try {
            referenceTags.push(JSON.parse(tags))
          } catch {
            referenceTags.push([])
          }
        } else {
          referenceTags.push([])
        }

        console.log(`Reference image ${i} uploaded:`, uploadedFile.urls.get)
      }
    }

    if (referenceImages.length === 0) {
      return NextResponse.json({ error: "At least one reference image is required" }, { status: 400 })
    }

    // Step 2: Create Gen 4 prediction
    console.log("Creating Gen 4 prediction...")

    // Use Flux or similar model for Gen 4 (placeholder version)
    const modelVersion = "ac732df83cea7fff18b8472768c88ad041fa750ff7682a21affe81863cbe77e4"

    const input: any = {
      prompt: prompt,
      aspect_ratio: aspectRatio,
      output_format: "jpg",
      output_quality: 90,
    }

    // Add reference images
    if (referenceImages[0]) input.image = referenceImages[0]
    if (referenceImages[1]) input.image_2 = referenceImages[1]
    if (referenceImages[2]) input.image_3 = referenceImages[2]

    // Add seed if provided
    if (seed && !isNaN(Number(seed))) {
      input.seed = Number(seed)
    }

    // Add resolution mapping
    const [width, height] = resolution.split("x").map(Number)
    if (width && height) {
      input.width = width
      input.height = height
    }

    const prediction = await replicate.predictions.create({
      version: modelVersion,
      input,
    })

    console.log("Prediction created:", prediction.id)

    // Step 3: Poll for completion
    let result = prediction
    let attempts = 0
    const maxAttempts = 60 // 5 minutes max

    while (result.status === "starting" || result.status === "processing") {
      if (attempts >= maxAttempts) {
        throw new Error("Generation timed out after 5 minutes")
      }

      await new Promise((resolve) => setTimeout(resolve, 5000)) // Wait 5 seconds
      result = await replicate.predictions.get(prediction.id)
      attempts++

      console.log(`Polling attempt ${attempts}: ${result.status}`)
    }

    if (result.status === "succeeded") {
      console.log("Gen 4 generation completed successfully")
      return NextResponse.json({
        success: true,
        imageUrl: Array.isArray(result.output) ? result.output[0] : result.output,
        predictionId: prediction.id,
        referenceCount: referenceImages.length,
      })
    } else {
      console.error("Gen 4 generation failed:", result.error)
      return NextResponse.json(
        {
          error: result.error || "Generation failed",
          predictionId: prediction.id,
        },
        { status: 500 },
      )
    }
  } catch (error) {
    console.error("Gen 4 generation error:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error occurred",
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 },
    )
  }
}

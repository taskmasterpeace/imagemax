import { type NextRequest, NextResponse } from "next/server"
import Replicate from "replicate"

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
})

interface VideoMetadata {
  prompts: string[]
  model: string
  resolution: string
  duration: number
  camera_fixed: boolean
  merge: boolean
}

export async function POST(request: NextRequest) {
  try {
    console.log("Starting video generation...")

    if (!process.env.REPLICATE_API_TOKEN) {
      return NextResponse.json({ error: "REPLICATE_API_TOKEN is not configured" }, { status: 500 })
    }

    const formData = await request.formData()
    const images = formData.getAll("images") as File[]
    const metadataStr = formData.get("metadata") as string

    if (!metadataStr) {
      return NextResponse.json({ error: "Missing metadata" }, { status: 400 })
    }

    const metadata: VideoMetadata = JSON.parse(metadataStr)
    console.log("Metadata:", metadata)
    console.log("Images count:", images.length)

    if (images.length === 0) {
      return NextResponse.json({ error: "No images provided" }, { status: 400 })
    }

    if (images.length !== metadata.prompts.length) {
      return NextResponse.json({ error: "Number of images must match number of prompts" }, { status: 400 })
    }

    // Step 1: Upload all images to Replicate
    console.log("Uploading images to Replicate...")
    const uploadedImages = await Promise.all(
      images.map(async (image, index) => {
        try {
          console.log(`Uploading image ${index + 1}: ${image.name}`)

          const file = await replicate.files.create(image)
          console.log(`Image ${index + 1} uploaded:`, file.urls.get)

          return {
            filename: image.name,
            url: file.urls.get,
            prompt: metadata.prompts[index],
          }
        } catch (error) {
          console.error(`Error uploading image ${index + 1}:`, error)
          throw new Error(`Failed to upload image ${image.name}: ${error}`)
        }
      }),
    )

    // Step 2: Create video predictions for each image
    console.log("Creating video predictions...")
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const predictions = await Promise.all(
      uploadedImages.map(async (imageData, index) => {
        try {
          console.log(`Creating prediction ${index + 1} for ${imageData.filename}`)

          // Use the appropriate model version based on the selected model
          let modelVersion = ""
          switch (metadata.model) {
            case "minimax-video-01":
              modelVersion = "01c7745d79ddb0ef1e8b60d2b35e4e6b6e2238c1b7e8b6e6b6e2238c1b7e8b6e6"
              break
            case "runway-gen3":
              modelVersion = "5e3a8b8b8b8b8b8b8b8b8b8b8b8b8b8b8b8b8b8b8b8b8b8b8b8b8b8b8b8b8b8b"
              break
            case "luma-dream-machine":
              modelVersion = "6e3a8b8b8b8b8b8b8b8b8b8b8b8b8b8b8b8b8b8b8b8b8b8b8b8b8b8b8b8b8b8b"
              break
            default:
              modelVersion = "01c7745d79ddb0ef1e8b60d2b35e4e6b6e2238c1b7e8b6e6b6e2238c1b7e8b6e6"
          }

          const prediction = await replicate.predictions.create({
            version: modelVersion,
            input: {
              image: imageData.url,
              prompt: imageData.prompt,
              duration: metadata.duration,
              aspect_ratio:
                metadata.resolution === "1280x720" ? "16:9" : metadata.resolution === "720x1280" ? "9:16" : "16:9",
              camera_motion: metadata.camera_fixed ? "static" : "dynamic",
            },
          })

          console.log(`Prediction ${index + 1} created:`, prediction.id)

          return {
            id: prediction.id,
            filename: imageData.filename,
            prompt: imageData.prompt,
            status: prediction.status,
            urls: prediction.urls,
          }
        } catch (error) {
          console.error(`Error creating prediction ${index + 1}:`, error)
          return {
            id: null,
            filename: imageData.filename,
            prompt: imageData.prompt,
            status: "failed",
            error: error instanceof Error ? error.message : "Unknown error",
          }
        }
      }),
    )

    // Step 3: Return job status
    const jobStatus = {
      jobId,
      status: "processing" as const,
      total: images.length,
      completed: 0,
      tasks: predictions.map((pred) => ({
        filename: pred.filename,
        prompt: pred.prompt,
        status: pred.status === "failed" ? "failed" : "processing",
        predictionId: pred.id,
        error: pred.error,
      })),
      startedAt: Date.now(),
    }

    console.log("Job created:", jobStatus)
    return NextResponse.json(jobStatus)
  } catch (error) {
    console.error("Video generation error:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error occurred",
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 },
    )
  }
}

import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const prompt = formData.get("prompt") as string
    const aspectRatio = formData.get("aspectRatio") as string
    const resolution = formData.get("resolution") as string
    const seedStr = formData.get("seed") as string
    const seed = seedStr ? Number.parseInt(seedStr) : undefined

    // Get reference images and their tags
    const referenceImages: File[] = []
    const referenceTags: string[][] = []

    for (let i = 1; i <= 3; i++) {
      const image = formData.get(`referenceImage${i}`) as File
      const tagsStr = formData.get(`referenceTags${i}`) as string

      if (image) {
        referenceImages.push(image)
        referenceTags.push(tagsStr ? JSON.parse(tagsStr) : [])
      }
    }

    if (!prompt || referenceImages.length === 0) {
      return NextResponse.json({ error: "Missing prompt or reference images" }, { status: 400 })
    }

    const apiToken = process.env.REPLICATE_API_TOKEN

    console.log("=== Starting Gen 4 Generation ===")
    if (!apiToken) {
      console.error("🔴 REPLICATE_API_TOKEN is NOT SET in the environment.")
      return NextResponse.json(
        {
          error: "REPLICATE_API_TOKEN environment variable not set on the server.",
        },
        { status: 500 },
      )
    }

    console.log("🟢 API Token is present.")
    console.log(`Token Snippet: ${apiToken.substring(0, 11)}... (length: ${apiToken.length})`)

    if (!apiToken.startsWith("r8_")) {
      console.error("🔴 Token format is INVALID. It should start with 'r8_'.")
      return NextResponse.json(
        {
          error: "Invalid Replicate API token format.",
        },
        { status: 500 },
      )
    }

    console.log("🟢 Token format is valid.")

    // Step 1: Upload reference images to Replicate
    console.log("📤 Step 1: Uploading reference images to Replicate...")
    const referenceUrls: string[] = []

    for (let i = 0; i < referenceImages.length; i++) {
      const imageUrl = await uploadImageToReplicate(referenceImages[i], apiToken)
      referenceUrls.push(imageUrl)
      console.log(`✅ Reference image ${i + 1} uploaded:`, imageUrl)
    }

    // Step 2: Create Gen 4 prediction
    console.log("✨ Step 2: Creating Gen 4 prediction...")
    const predictionId = await createGen4Prediction(
      prompt,
      referenceUrls,
      referenceTags,
      { aspectRatio, resolution, seed },
      apiToken,
    )
    console.log("✅ Prediction created:", predictionId)

    // Step 3: Poll for completion
    console.log("⏳ Step 3: Polling for completion...")
    const outputUrl = await pollPrediction(predictionId, apiToken)
    console.log("🎉 Gen 4 generation completed:", outputUrl)

    console.log("=== Gen 4 Generation Complete ===\n")

    return NextResponse.json({
      success: true,
      imageUrl: outputUrl,
      predictionId,
    })
  } catch (error) {
    console.error("❌ Error in gen4:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 },
    )
  }
}

async function uploadImageToReplicate(image: File, apiToken: string): Promise<string> {
  const arrayBuffer = await image.arrayBuffer()

  const response = await fetch("https://api.replicate.com/v1/files", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": image.type,
    },
    body: arrayBuffer,
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error("Upload error response:", errorText)
    throw new Error(`Failed to upload image: ${response.status} ${response.statusText}`)
  }

  const result = await response.json()
  return result.urls.get
}

async function createGen4Prediction(
  prompt: string,
  referenceUrls: string[],
  referenceTags: string[][],
  settings: { aspectRatio: string; resolution: string; seed?: number },
  apiToken: string,
): Promise<string> {
  // Build the input object for Gen 4
  const input: any = {
    prompt: prompt,
    aspect_ratio: settings.aspectRatio,
    output_format: "png",
    output_quality: 90,
  }

  // Add reference images
  if (referenceUrls.length > 0) {
    input.reference_image_1 = referenceUrls[0]
    if (referenceTags[0] && referenceTags[0].length > 0) {
      input.reference_tags_1 = referenceTags[0].join(", ")
    }
  }

  if (referenceUrls.length > 1) {
    input.reference_image_2 = referenceUrls[1]
    if (referenceTags[1] && referenceTags[1].length > 0) {
      input.reference_tags_2 = referenceTags[1].join(", ")
    }
  }

  if (referenceUrls.length > 2) {
    input.reference_image_3 = referenceUrls[2]
    if (referenceTags[2] && referenceTags[2].length > 0) {
      input.reference_tags_3 = referenceTags[2].join(", ")
    }
  }

  // Add seed if provided
  if (settings.seed !== undefined) {
    input.seed = settings.seed
  }

  const response = await fetch("https://api.replicate.com/v1/predictions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      version: "gen4-model-version-id", // Replace with actual Gen 4 model version ID
      input,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error("Gen 4 prediction creation error:", errorText)
    throw new Error(`Failed to create Gen 4 prediction: ${response.status} ${response.statusText}`)
  }

  const result = await response.json()
  return result.id
}

async function pollPrediction(predictionId: string, apiToken: string): Promise<string> {
  const maxAttempts = 60 // 10 minutes with 10-second intervals
  let attempts = 0

  while (attempts < maxAttempts) {
    const response = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
      headers: {
        Authorization: `Bearer ${apiToken}`,
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to get prediction status: ${response.status}`)
    }

    const result = await response.json()
    console.log(`Polling attempt ${attempts + 1}: Status = ${result.status}`)

    if (result.status === "succeeded") {
      if (result.output) {
        // Handle different output formats
        if (Array.isArray(result.output)) {
          return result.output[0]
        } else if (typeof result.output === "string") {
          return result.output
        } else {
          throw new Error("Unexpected output format")
        }
      } else {
        throw new Error("Prediction succeeded but no output found")
      }
    } else if (result.status === "failed") {
      throw new Error(`Prediction failed: ${result.error || "Unknown error"}`)
    } else if (result.status === "canceled") {
      throw new Error("Prediction was canceled")
    }

    // Wait before next poll
    await new Promise((resolve) => setTimeout(resolve, 10000)) // 10 seconds
    attempts++
  }

  throw new Error("Prediction timed out")
}

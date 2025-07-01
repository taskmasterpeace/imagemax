import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const image = formData.get("image") as File
    const prompt = formData.get("prompt") as string
    const editId = formData.get("editId") as string
    const model = formData.get("model") as string

    if (!image || !prompt || !editId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const apiToken = process.env.REPLICATE_API_TOKEN

    console.log("=== Starting Kontext Edit ===")
    if (!apiToken) {
      console.error("🔴 REPLICATE_API_TOKEN is NOT SET in the environment.")
      return NextResponse.json(
        {
          success: false,
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
          success: false,
          error: "Invalid Replicate API token format.",
        },
        { status: 500 },
      )
    }

    console.log("🟢 Token format is valid.")

    // Step 1: Upload image to Replicate
    console.log("📤 Step 1: Uploading image to Replicate...")
    const imageUrl = await uploadImageToReplicate(image, apiToken)
    console.log("✅ Image uploaded successfully:", imageUrl)

    // Step 2: Create Kontext prediction
    console.log("🎨 Step 2: Creating Kontext edit prediction...")
    const predictionId = await createKontextPrediction(imageUrl, prompt, model, apiToken)
    console.log("✅ Prediction created:", predictionId)

    // Step 3: Poll for completion
    console.log("⏳ Step 3: Polling for completion...")
    const outputUrl = await pollPrediction(predictionId, apiToken)
    console.log("🎉 Kontext edit completed:", outputUrl)

    console.log("=== Kontext Edit Complete ===\n")

    return NextResponse.json({
      success: true,
      imageUrl: outputUrl,
      editId,
    })
  } catch (error) {
    console.error("❌ Error in kontext-edit:", error)
    return NextResponse.json(
      {
        success: false,
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

async function createKontextPrediction(
  imageUrl: string,
  prompt: string,
  model: string,
  apiToken: string,
): Promise<string> {
  // Use the appropriate Kontext model version based on the model parameter
  const modelVersion =
    model === "max"
      ? "kontext-max-version-id" // Replace with actual version ID
      : "kontext-dev-version-id" // Replace with actual version ID

  const input = {
    image: imageUrl,
    prompt: prompt,
  }

  const response = await fetch("https://api.replicate.com/v1/predictions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      version: modelVersion,
      input,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error("Kontext prediction creation error:", errorText)
    throw new Error(`Failed to create Kontext prediction: ${response.status} ${response.statusText}`)
  }

  const result = await response.json()
  return result.id
}

async function pollPrediction(predictionId: string, apiToken: string): Promise<string> {
  const maxAttempts = 30 // 5 minutes with 10-second intervals
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

import { type NextRequest, NextResponse } from "next/server"
import { v4 as uuidv4 } from "uuid"

// Simple in-memory storage for API routes
const jobs = new Map<string, any>()

interface JobData {
  jobId: string
  status: "processing" | "completed" | "failed" | "merging"
  tasks: TaskData[]
  startedAt: number
  mergeRequested: boolean
  mergedOutputUrl?: string
}

interface TaskData {
  filename: string
  prompt: string
  status: "queued" | "processing" | "completed" | "failed"
  outputUrl?: string
  error?: string
  predictionId?: string
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const images = formData.getAll("images") as File[]
    const metadataStr = formData.get("metadata") as string

    if (!images.length || !metadataStr) {
      return NextResponse.json({ error: "Missing images or metadata" }, { status: 400 })
    }

    const metadata = JSON.parse(metadataStr)
    const { prompts, model, resolution, duration, camera_fixed, merge } = metadata

    if (images.length !== prompts.length) {
      return NextResponse.json({ error: "Images and prompts count mismatch" }, { status: 400 })
    }

    // Create job
    const jobId = uuidv4()
    const tasks: TaskData[] = images.map((file, index) => ({
      filename: file.name,
      prompt: prompts[index],
      status: "queued",
    }))

    const jobData: JobData = {
      jobId,
      status: "processing",
      tasks,
      startedAt: Date.now(),
      mergeRequested: merge,
    }

    jobs.set(jobId, jobData)

    // Start processing images asynchronously
    processImages(jobId, images, metadata).catch((error) => {
      console.error("Error in processImages:", error)
      const job = jobs.get(jobId)
      if (job) {
        job.status = "failed"
        job.tasks.forEach((task: TaskData) => {
          if (task.status === "queued" || task.status === "processing") {
            task.status = "failed"
            task.error = error.message || "Processing failed"
          }
        })
      }
    })

    return NextResponse.json({
      jobId,
      status: "processing",
      total: images.length,
      completed: 0,
      tasks: tasks.map((task) => ({
        filename: task.filename,
        prompt: task.prompt,
        status: task.status,
      })),
    })
  } catch (error) {
    console.error("Error in generate-videos POST:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

async function processImages(jobId: string, images: File[], metadata: any) {
  const job = jobs.get(jobId)
  if (!job) {
    console.error("Job not found:", jobId)
    return
  }

  const { model, resolution, duration, camera_fixed } = metadata
  const apiToken = process.env.REPLICATE_API_TOKEN

  console.log("=== Starting Video Generation ===")
  if (!apiToken) {
    console.error("🔴 REPLICATE_API_TOKEN is NOT SET in the environment.")
    job.status = "failed"
    job.tasks.forEach((task: TaskData) => {
      task.status = "failed"
      task.error = "REPLICATE_API_TOKEN environment variable not set on the server."
    })
    return
  }

  console.log("🟢 API Token is present.")
  console.log(`Token Snippet: ${apiToken.substring(0, 11)}... (length: ${apiToken.length})`)

  if (!apiToken.startsWith("r8_")) {
    console.error("🔴 Token format is INVALID. It should start with 'r8_'.")
    job.status = "failed"
    job.tasks.forEach((task: TaskData) => {
      task.status = "failed"
      task.error = "Invalid Replicate API token format."
    })
    return
  }

  console.log("🟢 Token format is valid.")

  // Process each image
  for (let i = 0; i < images.length; i++) {
    const image = images[i]
    const task = job.tasks[i]

    try {
      console.log(`\n--- Processing Image ${i + 1}/${images.length}: ${image.name} ---`)
      task.status = "processing"

      // Step 1: Upload image to Replicate
      console.log("📤 Step 1: Uploading image to Replicate...")
      const uploadUrl = await uploadImageToReplicate(image, apiToken)
      console.log("✅ Image uploaded successfully:", uploadUrl)

      // Step 2: Create prediction
      console.log("🎬 Step 2: Creating video prediction...")
      const predictionId = await createVideoPrediction(
        uploadUrl,
        task.prompt,
        {
          model,
          resolution,
          duration,
          camera_fixed,
        },
        apiToken,
      )

      task.predictionId = predictionId
      console.log("✅ Prediction created:", predictionId)

      // Step 3: Poll for completion
      console.log("⏳ Step 3: Polling for completion...")
      const outputUrl = await pollPrediction(predictionId, apiToken)

      task.status = "completed"
      task.outputUrl = outputUrl
      console.log("🎉 Video generation completed:", outputUrl)
    } catch (error) {
      console.error(`❌ Error processing ${image.name}:`, error)
      task.status = "failed"
      task.error = error instanceof Error ? error.message : "Unknown error"
    }
  }

  // Update job status
  const completedTasks = job.tasks.filter((task: TaskData) => task.status === "completed")
  const failedTasks = job.tasks.filter((task: TaskData) => task.status === "failed")

  if (completedTasks.length === job.tasks.length) {
    job.status = "completed"
    console.log("🎊 All videos generated successfully!")
  } else if (failedTasks.length === job.tasks.length) {
    job.status = "failed"
    console.log("💥 All video generations failed.")
  } else {
    job.status = "completed" // Partial completion
    console.log(`⚠️ Partial completion: ${completedTasks.length}/${job.tasks.length} succeeded`)
  }

  console.log("=== Video Generation Complete ===\n")
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

async function createVideoPrediction(
  imageUrl: string,
  prompt: string,
  settings: any,
  apiToken: string,
): Promise<string> {
  const input = {
    image: imageUrl,
    prompt: prompt,
    resolution: settings.resolution || "1280x720",
    duration_seconds: settings.duration || 6,
    camera_fixed: settings.camera_fixed || false,
  }

  const response = await fetch("https://api.replicate.com/v1/predictions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      version: "minimax-video-01", // This should be the actual model version ID
      input,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error("Prediction creation error:", errorText)
    throw new Error(`Failed to create prediction: ${response.status} ${response.statusText}`)
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
      if (result.output && result.output.length > 0) {
        return result.output[0] // Return the first output URL
      } else {
        throw new Error("Prediction succeeded but no output URL found")
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

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const jobId = searchParams.get("jobId")

  if (!jobId) {
    return NextResponse.json({ error: "Missing jobId" }, { status: 400 })
  }

  const job = jobs.get(jobId)
  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 })
  }

  const completedTasks = job.tasks.filter((task: TaskData) => task.status === "completed")

  return NextResponse.json({
    jobId: job.jobId,
    status: job.status,
    total: job.tasks.length,
    completed: completedTasks.length,
    tasks: job.tasks.map((task: TaskData) => ({
      filename: task.filename,
      prompt: task.prompt,
      status: task.status,
      outputUrl: task.outputUrl,
      error: task.error,
    })),
    mergedOutputUrl: job.mergedOutputUrl,
  })
}

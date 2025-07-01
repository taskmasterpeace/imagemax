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

  console.log("--- API Token Check ---")
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
      task.error = "Invalid Replicate API token format. Must start with 'r8_'."
    })
    return
  }
  console.log("🟢 Token format looks correct.")
  console.log("-----------------------")

  // Process images sequentially to avoid overwhelming the API
  for (let i = 0; i < images.length; i++) {
    const image = images[i]
    const task = job.tasks[i]

    try {
      task.status = "processing"
      console.log(`Processing image ${i + 1}/${images.length}: ${image.name}`)

      // Try to call Replicate API with comprehensive error handling
      const result = await callReplicateAPIWithRetry(image, task.prompt, model, resolution, duration, camera_fixed)

      task.status = "completed"
      task.outputUrl = result.videoUrl

      console.log(`Completed image ${i + 1}/${images.length}`)
    } catch (error) {
      console.error(`Error processing image ${i + 1}:`, error)
      task.status = "failed"

      // Provide more specific error messages
      if (error instanceof Error) {
        if (error.message.includes("Invalid token") || error.message.includes("Authentication failed")) {
          task.error = "Invalid API token. Please check your REPLICATE_API_TOKEN in .env.local"
        } else if (error.message.includes("Network error")) {
          task.error = "Network connection failed. Check your internet connection."
        } else {
          task.error = error.message
        }
      } else {
        task.error = "Unknown error occurred"
      }

      // Continue processing other images even if one fails
      console.log(`Continuing with remaining images...`)
    }
  }

  // Update job status
  const completedTasks = job.tasks.filter((t: TaskData) => t.status === "completed")
  const failedTasks = job.tasks.filter((t: TaskData) => t.status === "failed")

  if (completedTasks.length + failedTasks.length === job.tasks.length) {
    if (job.mergeRequested && completedTasks.length > 1) {
      job.status = "merging"
      await mergeVideos(jobId, completedTasks)
    } else {
      job.status = completedTasks.length > 0 ? "completed" : "failed"
    }
  }

  console.log(
    `Job ${jobId} completed. Status: ${job.status}, Completed: ${completedTasks.length}, Failed: ${failedTasks.length}`,
  )
}

async function callReplicateAPIWithRetry(
  image: File,
  prompt: string,
  model: string,
  resolution: string,
  duration: number,
  cameraFixed: boolean,
  maxRetries = 2,
): Promise<{ videoUrl: string }> {
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Attempt ${attempt}/${maxRetries} for image: ${image.name}`)
      return await callReplicateAPI(image, prompt, model, resolution, duration, cameraFixed)
    } catch (error) {
      lastError = error as Error
      console.error(`🔴 Attempt ${attempt} failed:`, error.message) // Log only the message for clarity

      if (attempt < maxRetries) {
        const delay = attempt * 2000 // 2s, 4s delay
        console.log(`Retrying in ${delay}ms...`)
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }
  }

  throw lastError || new Error("All retry attempts failed")
}

async function callReplicateAPI(
  image: File,
  prompt: string,
  model: string,
  resolution: string,
  duration: number,
  cameraFixed: boolean,
): Promise<{ videoUrl: string }> {
  const apiToken = process.env.REPLICATE_API_TOKEN!

  try {
    console.log("=== Starting Replicate API Call ===")

    // Step 1: Test API connection with the provided token
    console.log("Step 1: Verifying API token with Replicate...")
    const testResponse = await fetch("https://api.replicate.com/v1/models", {
      headers: {
        Authorization: `Token ${apiToken}`, // Using "Token" prefix as per Replicate docs
      },
    })

    if (testResponse.status === 401) {
      console.error("🔴 API Verification Failed: 401 Unauthorized. The token is invalid.")
      throw new Error("Invalid Replicate API token. Please check your .env.local file and restart the server.")
    }
    if (!testResponse.ok) {
      console.error(`🔴 API Verification Failed: Status ${testResponse.status}`)
      throw new Error(`API connection test failed with status: ${testResponse.status}`)
    }
    console.log("🟢 API Token Verified Successfully.")

    // Step 2: Upload image to Replicate
    console.log("Step 2: Uploading image to Replicate...")
    const imageBuffer = await image.arrayBuffer()
    const imageBlob = new Blob([imageBuffer], { type: image.type })
    const uploadFormData = new FormData()
    uploadFormData.append("file", imageBlob, image.name) // Replicate docs use 'file' key

    const uploadResponse = await fetch("https://api.replicate.com/v1/files", {
      method: "POST",
      headers: {
        Authorization: `Token ${apiToken}`,
      },
      body: uploadFormData,
    })

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text()
      console.error(`🔴 Image Upload Failed: Status ${uploadResponse.status}`, errorText)
      throw new Error(`Image upload failed: ${uploadResponse.status} - ${errorText}`)
    }

    const uploadResult = await uploadResponse.json()
    const servingUrl = uploadResult.serving_url
    console.log("🟢 Image uploaded successfully. URL:", servingUrl)

    // For now, to ensure the token part is solved, we will return a placeholder
    // and not proceed to the expensive model prediction step.
    console.log("✅ Authentication and upload successful. Returning placeholder video for now.")
    await new Promise((resolve) => setTimeout(resolve, 1000)) // Simulate work
    return { videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4" }
  } catch (error) {
    console.error("=== Replicate API Error ===")
    console.error("Error details:", error instanceof Error ? error.message : String(error))
    // Re-throw the specific error to be caught by the calling function
    throw error
  }
}

async function mergeVideos(jobId: string, completedTasks: TaskData[]) {
  const job = jobs.get(jobId)
  if (!job) return

  try {
    console.log(`Merging ${completedTasks.length} videos for job ${jobId}`)

    // For now, just simulate merging - in production, implement FFmpeg
    await new Promise((resolve) => setTimeout(resolve, 3000))

    job.status = "completed"
    // Use first video as placeholder for merged result
    job.mergedOutputUrl = completedTasks[0].outputUrl

    console.log(`Merge completed for job ${jobId}`)
  } catch (error) {
    console.error("Error merging videos:", error)
    job.status = "failed"
  }
}

// Export the jobs map for the status endpoint
export { jobs }

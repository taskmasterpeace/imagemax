import { type NextRequest, NextResponse } from "next/server"
import { v4 as uuidv4 } from "uuid"

// Simplified approach using direct HTTP calls to Replicate
const jobs = new Map<string, any>()

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const images = formData.getAll("images") as File[]
    const metadataStr = formData.get("metadata") as string

    if (!images.length || !metadataStr) {
      return NextResponse.json({ error: "Missing images or metadata" }, { status: 400 })
    }

    if (!process.env.REPLICATE_API_TOKEN) {
      return NextResponse.json({ error: "REPLICATE_API_TOKEN not configured" }, { status: 500 })
    }

    const metadata = JSON.parse(metadataStr)
    const { prompts, model, resolution, duration, camera_fixed, merge } = metadata

    // Create job
    const jobId = uuidv4()
    const tasks = images.map((file, index) => ({
      filename: file.name,
      prompt: prompts[index],
      status: "queued",
    }))

    const jobData = {
      jobId,
      status: "processing",
      tasks,
      startedAt: Date.now(),
      mergeRequested: merge,
    }

    jobs.set(jobId, jobData)

    // Start processing
    processImagesSimple(jobId, images, metadata)

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
    console.error("Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

async function processImagesSimple(jobId: string, images: File[], metadata: any) {
  const job = jobs.get(jobId)
  if (!job) return

  // For demo purposes, simulate processing
  for (let i = 0; i < images.length; i++) {
    const task = job.tasks[i]

    try {
      task.status = "processing"

      // Simulate processing time
      await new Promise((resolve) => setTimeout(resolve, 3000))

      // For demo, create a placeholder video URL
      task.status = "completed"
      task.outputUrl = "/placeholder.svg?height=400&width=600"

      console.log(`Completed image ${i + 1}/${images.length}`)
    } catch (error) {
      task.status = "failed"
      task.error = "Processing failed"
    }
  }

  job.status = "completed"
}

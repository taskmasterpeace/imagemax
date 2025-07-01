import { type NextRequest, NextResponse } from "next/server"
import Replicate from "replicate"

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
})

export async function GET(request: NextRequest, { params }: { params: { jobId: string } }) {
  try {
    const { jobId } = params

    if (!process.env.REPLICATE_API_TOKEN) {
      return NextResponse.json({ error: "REPLICATE_API_TOKEN is not configured" }, { status: 500 })
    }

    console.log("Checking job status for:", jobId)

    // In a real implementation, you'd store job data in a database
    // For now, we'll return a mock response that simulates job progress

    // This is a simplified version - in production you'd:
    // 1. Store prediction IDs when creating the job
    // 2. Query each prediction's status from Replicate
    // 3. Update the job status based on all predictions

    const mockJobStatus = {
      jobId,
      status: "processing" as const,
      total: 1,
      completed: 0,
      tasks: [
        {
          filename: "example.jpg",
          prompt: "example prompt",
          status: "processing",
          outputUrl: undefined,
          error: undefined,
        },
      ],
      startedAt: Date.now() - 30000, // 30 seconds ago
    }

    return NextResponse.json(mockJobStatus)
  } catch (error) {
    console.error("Job status error:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 },
    )
  }
}

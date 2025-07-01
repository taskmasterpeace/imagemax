import { type NextRequest, NextResponse } from "next/server"
import { jobs } from "../generate-videos/route"

export async function GET(request: NextRequest, { params }: { params: { jobId: string } }) {
  try {
    const { jobId } = params
    const job = jobs.get(jobId)

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 })
    }

    const completedTasks = job.tasks.filter((t: any) => t.status === "completed")

    return NextResponse.json({
      jobId: job.jobId,
      status: job.status,
      tasks: job.tasks.map((task: any) => ({
        filename: task.filename,
        prompt: task.prompt,
        status: task.status,
        outputUrl: task.outputUrl,
        error: task.error,
      })),
      total: job.tasks.length,
      completed: completedTasks.length,
      mergedOutputUrl: job.mergedOutputUrl,
      startedAt: job.startedAt,
    })
  } catch (error) {
    console.error("Error getting job status:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const name = searchParams.get("name") || "video"
  const merged = searchParams.get("merged")
  const count = searchParams.get("count")

  // Return a placeholder video URL (you could serve an actual demo video file)
  const videoUrl = merged
    ? `https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4`
    : `https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4`

  return NextResponse.redirect(videoUrl)
}

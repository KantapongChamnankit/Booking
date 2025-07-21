import { NextResponse } from "next/server"

// This endpoint can be called by external cron services like cron-job.org
// to automatically clean up expired bookings
export async function GET() {
  try {
    // Call the cleanup endpoint
    const cleanupResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/cleanup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!cleanupResponse.ok) {
      throw new Error(`Cleanup failed with status: ${cleanupResponse.status}`)
    }

    const cleanupResult = await cleanupResponse.json()

    return NextResponse.json({
      success: true,
      message: "Automatic cleanup completed",
      cleanupResult,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Cron cleanup failed:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Cron cleanup failed",
        details: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}

// Also support POST for flexibility
export async function POST() {
  return GET()
}

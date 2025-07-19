import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { v4 as uuidv4 } from "uuid"

export async function GET() {
  try {
    const cookieStore = cookies()
    let sessionId = cookieStore.get("session_id")?.value

    if (!sessionId) {
      // Create new session
      sessionId = uuidv4()

      const response = NextResponse.json({ sessionId })
      response.cookies.set("session_id", sessionId as string, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 30, // 30 days
      })

      return response
    }

    return NextResponse.json({ sessionId })
  } catch (error) {
    console.error("Session error:", error)
    return NextResponse.json({ error: "Failed to get session" }, { status: 500 })
  }
}

export async function POST() {
  try {
    // Create new session (force refresh)
    const sessionId = uuidv4()

    const response = NextResponse.json({ sessionId })
    response.cookies.set("session_id", sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    })

    return response
  } catch (error) {
    console.error("Session creation error:", error)
    return NextResponse.json({ error: "Failed to create session" }, { status: 500 })
  }
}

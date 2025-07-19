import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import fs from "fs"
import path from "path"

interface Booking {
  id: string
  booker_name: string
  machine: string
  date: string
  start_time: string
  end_time: string
  created_at: string
  session_id: string
}

const DATA_FILE = path.join(process.cwd(), "data", "bookings.json")

// Get session ID from cookies
const getSessionId = (): string | null => {
  try {
    const cookieStore = cookies()
    return cookieStore.get("session_id")?.value || null
  } catch (error) {
    console.error("Error getting session:", error)
    return null
  }
}

// Read bookings from JSON file
const readBookings = (): Booking[] => {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      return []
    }
    const data = fs.readFileSync(DATA_FILE, "utf8")
    return JSON.parse(data)
  } catch (error) {
    console.error("Error reading bookings:", error)
    return []
  }
}

// Write bookings to JSON file
const writeBookings = (bookings: Booking[]): void => {
  try {
    const dataDir = path.dirname(DATA_FILE)
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true })
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(bookings, null, 2))
  } catch (error) {
    console.error("Error writing bookings:", error)
    throw new Error("Failed to save bookings")
  }
}

// DELETE - Delete a specific booking (only if owned by current session)
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json()
    const sessionId = getSessionId()
    if (!sessionId) {
      return NextResponse.json({ error: "No session found" }, { status: 401 })
    }

    const bookingId = params.id
    if (!bookingId) {
      return NextResponse.json({ error: "Booking ID is required" }, { status: 400 })
    }

    // Read current bookings
    const bookings = readBookings()

    // Find the booking
    const bookingIndex = bookings.findIndex((booking) => booking.id === bookingId)
    if (bookingIndex === -1) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 })
    }

    const booking = bookings[bookingIndex]

    if (!body?.isAdmin) {
      if (booking.session_id !== sessionId) {
        return NextResponse.json({ error: "You can only delete your own bookings" }, { status: 403 })
      }
    }
    // Remove the booking
    bookings.splice(bookingIndex, 1)

    // Save updated bookings
    writeBookings(bookings)

    console.log(`Booking deleted: ${booking.booker_name} - ${booking.machine} on ${booking.date} (ID: ${bookingId})`)

    return NextResponse.json({
      message: "Booking deleted successfully",
      deletedBooking: booking,
    })
  } catch (error) {
    console.error("Error in DELETE /api/bookings/[id]:", error)
    return NextResponse.json({ error: "Failed to delete booking" }, { status: 500 })
  }
}

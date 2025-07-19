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
  session_id: string // Add session ownership
}

// Path to the JSON file
const DATA_FILE = path.join(process.cwd(), "data", "bookings.json")

// Ensure data directory exists
const ensureDataDirectory = () => {
  const dataDir = path.dirname(DATA_FILE)
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
  }
}

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
    ensureDataDirectory()
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
    ensureDataDirectory()
    fs.writeFileSync(DATA_FILE, JSON.stringify(bookings, null, 2))
  } catch (error) {
    console.error("Error writing bookings:", error)
    throw new Error("Failed to save bookings")
  }
}

// Clean up expired bookings
const cleanupExpiredBookings = (bookings: Booking[]): Booking[] => {
  const now = new Date()
  return bookings.filter((booking) => {
    const bookingEndDateTime = new Date(`${booking.date}T${booking.end_time}`)
    return bookingEndDateTime > now
  })
}

// Check for overlapping bookings
const hasOverlappingBooking = (
  bookings: Booking[],
  newBooking: Omit<Booking, "id" | "created_at" | "session_id">,
): boolean => {
  return bookings.some((booking) => {
    if (booking.machine !== newBooking.machine || booking.date !== newBooking.date) {
      return false
    }

    const existingStart = booking.start_time
    const existingEnd = booking.end_time
    const newStart = newBooking.start_time
    const newEnd = newBooking.end_time

    // Check for overlap: new booking starts before existing ends AND new booking ends after existing starts
    return newStart < existingEnd && newEnd > existingStart
  })
}

// Generate unique ID
const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
}

// GET - Fetch all active bookings with ownership info
export async function GET() {
  try {
    const sessionId = getSessionId()
    const bookings = readBookings()

    // Clean up expired bookings
    const activeBookings = cleanupExpiredBookings(bookings)

    // Save cleaned bookings back to file if any were removed
    if (activeBookings.length !== bookings.length) {
      writeBookings(activeBookings)
    }

    // Sort bookings by date and time
    activeBookings.sort((a, b) => {
      if (a.date !== b.date) {
        return a.date.localeCompare(b.date)
      }
      return a.start_time.localeCompare(b.start_time)
    })

    // Add ownership info to each booking
    const bookingsWithOwnership = activeBookings.map((booking) => ({
      ...booking,
      isOwner: booking.session_id === sessionId,
    }))

    return NextResponse.json({
      bookings: bookingsWithOwnership,
      count: activeBookings.length,
      sessionId: sessionId,
    })
  } catch (error) {
    console.error("Error in GET /api/bookings:", error)
    return NextResponse.json({ error: "Failed to fetch bookings" }, { status: 500 })
  }
}

// POST - Create new booking with session ownership
export async function POST(request: NextRequest) {
  try {
    const sessionId = getSessionId()
    if (!sessionId) {
      return NextResponse.json({ error: "No session found. Please refresh the page." }, { status: 401 })
    }

    const body = await request.json()
    const { bookerName, machine, date, startTime, endTime } = body

    // Basic validation
    if (!bookerName || !machine || !date || !startTime || !endTime) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 })
    }

    if (endTime <= startTime) {
      return NextResponse.json({ error: "End time must be after start time" }, { status: 400 })
    }

    const bookingStartDateTime = new Date(`${date}T${startTime}`)
    const now = new Date()
    if (bookingStartDateTime <= now) {
      return NextResponse.json({ error: "Bookings cannot be made for past dates/times" }, { status: 400 })
    }

    // Read current bookings
    let bookings = readBookings()

    // Clean up expired bookings first
    bookings = cleanupExpiredBookings(bookings)

    // Create new booking object
    const newBookingData = {
      booker_name: bookerName,
      machine,
      date,
      start_time: startTime,
      end_time: endTime,
    }

    // Check for overlapping bookings
    if (hasOverlappingBooking(bookings, newBookingData)) {
      return NextResponse.json(
        { error: "This time slot conflicts with an existing booking for the same machine" },
        { status: 409 },
      )
    }

    // Create new booking with ID, timestamp, and session ownership
    const newBooking: Booking = {
      id: generateId(),
      ...newBookingData,
      created_at: new Date().toISOString(),
      session_id: sessionId,
    }

    // Add to bookings array
    bookings.push(newBooking)

    // Save to file
    writeBookings(bookings)

    console.log(
      `New booking created: ${bookerName} - ${machine} on ${date} from ${startTime} to ${endTime} (Session: ${sessionId})`,
    )

    return NextResponse.json(
      {
        message: "Booking created successfully",
        booking: { ...newBooking, isOwner: true },
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("Error in POST /api/bookings:", error)
    return NextResponse.json({ error: "Failed to create booking" }, { status: 500 })
  }
}

// DELETE - Remove expired bookings manually
export async function DELETE() {
  try {
    const bookings = readBookings()
    const originalCount = bookings.length

    // Clean up expired bookings
    const activeBookings = cleanupExpiredBookings(bookings)
    const deletedCount = originalCount - activeBookings.length

    // Save cleaned bookings
    writeBookings(activeBookings)

    return NextResponse.json({
      message: `Removed ${deletedCount} expired booking(s)`,
      deletedCount: deletedCount,
    })
  } catch (error) {
    console.error("Error in DELETE /api/bookings:", error)
    return NextResponse.json({ error: "Failed to remove expired bookings" }, { status: 500 })
  }
}

import { NextResponse } from "next/server"
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
}

const DATA_FILE = path.join(process.cwd(), "data", "bookings.json")

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

export async function POST() {
  try {
    const bookings = readBookings()
    const originalCount = bookings.length

    // Remove expired bookings
    const now = new Date()
    const activeBookings = bookings.filter((booking) => {
      const bookingEndDateTime = new Date(`${booking.date}T${booking.end_time}`)
      return bookingEndDateTime > now
    })

    const deletedCount = originalCount - activeBookings.length

    // Save cleaned bookings
    writeBookings(activeBookings)

    return NextResponse.json({
      success: true,
      message: `Removed ${deletedCount} expired booking(s)`,
      deletedCount: deletedCount,
    })
  } catch (error) {
    console.error("Error during cleanup:", error)
    return NextResponse.json({ error: "Cleanup failed" }, { status: 500 })
  }
}

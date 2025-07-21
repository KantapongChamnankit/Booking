import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"
import { isBookingExpired, logTimezoneDebug, getCurrentThailandDate } from "@/lib/timezone"

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

const performCleanup = () => {
  const bookings = readBookings()
  const originalCount = bookings.length

  // Log timezone debug information
  logTimezoneDebug("Cleanup")
  
  // Get current Thailand time for comparison
  const currentThailandTime = getCurrentThailandDate()
  console.log(`Current Thailand time for cleanup: ${currentThailandTime.toISOString()}`)

  const activeBookings = bookings.filter((booking) => {
    try {
      const expired = isBookingExpired(booking.date, booking.end_time)
      
      if (expired) {
        console.log(`🗑️  Removing expired booking: ${booking.booker_name} - ${booking.date} ${booking.end_time} (Machine: ${booking.machine})`)
      } else {
        console.log(`✅ Keeping active booking: ${booking.booker_name} - ${booking.date} ${booking.end_time}`)
      }
      
      return !expired
    } catch (error) {
      console.error("Error processing booking:", booking, error)
      // Keep booking if there's an error parsing dates to be safe
      return true
    }
  })

  const deletedCount = originalCount - activeBookings.length

  // Save cleaned bookings only if there were changes
  if (deletedCount > 0) {
    writeBookings(activeBookings)
    console.log(`✨ Cleanup completed: removed ${deletedCount} expired bookings`)
  } else {
    console.log("✨ No expired bookings found during cleanup")
  }

  return {
    success: true,
    message: `Removed ${deletedCount} expired booking(s)`,
    deletedCount: deletedCount,
    originalCount: originalCount,
    activeCount: activeBookings.length,
    serverTime: new Date().toISOString(),
    thailandTime: currentThailandTime.toISOString(),
    timezone: 'Asia/Bangkok (UTC+7)',
  }
}

// GET endpoint for automatic cleanup (can be called by external cron jobs)
export async function GET() {
  try {
    console.log("🔄 Starting automatic cleanup...")
    const result = performCleanup()
    console.log("✅ Automatic cleanup completed successfully")
    return NextResponse.json(result)
  } catch (error) {
    console.error("❌ Error during GET cleanup:", error)
    return NextResponse.json({ 
      error: "Cleanup failed",
      details: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

// POST endpoint for manual cleanup
export async function POST() {
  try {
    console.log("🔄 Starting manual cleanup...")
    const result = performCleanup()
    console.log("✅ Manual cleanup completed successfully")
    return NextResponse.json(result)
  } catch (error) {
    console.error("❌ Error during POST cleanup:", error)
    return NextResponse.json({ 
      error: "Cleanup failed",
      details: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

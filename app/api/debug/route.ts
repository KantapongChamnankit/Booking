import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"
import { 
  getCurrentThailandTime, 
  createBookingEndDateTime, 
  isBookingExpired,
  logTimezoneDebug,
  getCurrentDateString 
} from "@/lib/timezone"

interface Booking {
  id: string
  booker_name: string
  machine: string
  date: string
  start_time: string
  end_time: string
  created_at: string
}

export async function GET() {
  try {
    // Log timezone debug info
    logTimezoneDebug("Debug endpoint")
    
    const DATA_FILE = path.join(process.cwd(), "data", "bookings.json")
    
    let bookings: Booking[] = []
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, "utf8")
      bookings = JSON.parse(data)
    }

    const now = new Date()
    const thailandTime = getCurrentThailandTime()
    const currentDateString = getCurrentDateString()

    // Analyze each booking
    const bookingAnalysis = bookings.map(booking => {
      try {
        const bookingEndDateTime = createBookingEndDateTime(booking.date, booking.end_time)
        const expired = isBookingExpired(booking.date, booking.end_time)
        
        return {
          id: booking.id,
          booker_name: booking.booker_name,
          date: booking.date,
          end_time: booking.end_time,
          bookingEndDateTime: bookingEndDateTime.toISOString(),
          expired,
          hoursUntilExpiry: (bookingEndDateTime.getTime() - now.getTime()) / (1000 * 60 * 60)
        }
      } catch (error) {
        return {
          id: booking.id,
          booker_name: booking.booker_name,
          date: booking.date,
          end_time: booking.end_time,
          error: error instanceof Error ? error.message : "Unknown error"
        }
      }
    })

    return NextResponse.json({
      serverInfo: {
        serverTime: now.toISOString(),
        serverTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        serverTimezoneOffset: now.getTimezoneOffset(),
        thailandTime: thailandTime.toISOString(),
        currentDateString,
        nodeEnv: process.env.NODE_ENV,
        platform: process.platform,
      },
      bookingsCount: {
        total: bookings.length,
        expired: bookingAnalysis.filter(b => b.expired).length,
        active: bookingAnalysis.filter(b => !b.expired && !b.error).length,
        errors: bookingAnalysis.filter(b => b.error).length,
      },
      bookingAnalysis,
      timestamp: now.toISOString(),
    })
  } catch (error) {
    console.error("Debug endpoint error:", error)
    return NextResponse.json(
      {
        error: "Debug endpoint failed",
        details: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}

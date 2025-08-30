import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
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

// ...existing code...

const performCleanup = async () => {
  // Log timezone debug information
  logTimezoneDebug("Cleanup")
  const currentThailandTime = getCurrentThailandDate()
  console.log(`Current Thailand time for cleanup: ${currentThailandTime.toISOString()}`)

  // Fetch all bookings from Supabase
  const { data: bookings, error } = await supabase
    .from('bookings')
    .select('*')
  if (error) {
    throw new Error('Supabase fetch error: ' + error.message)
  }
  const originalCount = bookings.length

  // Find expired bookings
  const expiredBookings = bookings.filter((booking) => {
    try {
      return isBookingExpired(booking.date, booking.end_time)
    } catch (error) {
      return false
    }
  })
  const expiredIds = expiredBookings.map(b => b.id)

  // Delete expired bookings from Supabase
  let deletedCount = 0
  if (expiredIds.length > 0) {
    const { error: deleteError } = await supabase
      .from('bookings')
      .delete()
      .in('id', expiredIds)
    if (deleteError) {
      throw new Error('Supabase delete error: ' + deleteError.message)
    }
    deletedCount = expiredIds.length
    console.log(`✨ Cleanup completed: removed ${deletedCount} expired bookings`)
  } else {
    console.log("✨ No expired bookings found during cleanup")
  }

  return {
    success: true,
    message: `Removed ${deletedCount} expired booking(s)`,
    deletedCount: deletedCount,
    originalCount: originalCount,
    activeCount: originalCount - deletedCount,
    serverTime: new Date().toISOString(),
    thailandTime: currentThailandTime.toISOString(),
    timezone: 'Asia/Bangkok (UTC+7)',
  }
}

// GET endpoint for automatic cleanup (can be called by external cron jobs)
export async function GET() {
  try {
    console.log("🔄 Starting automatic cleanup...")
    const result = await performCleanup()
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
    const result = await performCleanup()
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

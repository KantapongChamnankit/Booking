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
  console.log(`Current Thailand time (human): ${currentThailandTime.toLocaleString('en-US', { timeZone: 'Asia/Bangkok' })}`)
  
  // Debug: show actual UTC time too
  const utcNow = new Date()
  console.log(`Current UTC time: ${utcNow.toISOString()}`)
  console.log(`Current local time: ${utcNow.toLocaleString()}`)

  // Fetch all bookings from Supabase
  const { data: bookings, error } = await supabase
    .from('bookings')
    .select('*')
  if (error) {
    throw new Error('Supabase fetch error: ' + error.message)
  }
  const originalCount = bookings.length

  // Find bookings that expired more than 30 minutes ago
  const expiredIds: string[] = []
  const now = currentThailandTime
  bookings.forEach((booking) => {
    try {
      // คำนวณเวลาสิ้นสุดของ booking - simplified approach
      const bookingDateStr = `${booking.date}T${booking.end_time}:00`
      console.log(`🔍 Checking booking: ${booking.booker_name} - ${bookingDateStr}`)
      console.log(`   📝 Created at: ${booking.created_at}`)
      
      // สร้าง booking end datetime - treat the date/time as Thailand timezone
      // Simple approach: parse as local time then treat as Thailand time
      const bookingEndThailand = new Date(bookingDateStr)
      
      console.log(`   📅 Booking end (Thailand): ${bookingEndThailand.toISOString()}`)
      console.log(`   📅 Booking end (display): ${bookingEndThailand.toLocaleString('en-US')}`)
      console.log(`   🕐 Current (Thailand): ${now.toISOString()}`)
      console.log(`   🕐 Current (display): ${now.toLocaleString('en-US')}`)
      
      // คำนวณความแตกต่างของเวลา (ทั้งคู่เป็น Thailand time แล้ว)
      const timeDiff = now.getTime() - bookingEndThailand.getTime()
      const minutesDiff = Math.floor(timeDiff / (1000 * 60))
      const hoursDiff = Math.floor(minutesDiff / 60)
      
      console.log(`   ⏰ Time difference: ${minutesDiff} minutes (${hoursDiff} hours)`)
      console.log(`   🌍 Server timezone: ${Intl.DateTimeFormat().resolvedOptions().timeZone}`)
      
      // ตรวจสอบว่าหมดอายุเกิน 30 นาที (1800000 ms) หรือไม่
      if (timeDiff > 30 * 60 * 1000) {
        console.log(`   ❌ EXPIRED (${minutesDiff} min ago / ${hoursDiff} hours ago) - will delete`)
        expiredIds.push(booking.id)
      } else if (timeDiff > 0) {
        console.log(`   ⚠️  Just ended (${minutesDiff} min ago) - not yet expired (need 30+ min)`)
      } else {
        console.log(`   ✅ ACTIVE (ends in ${-minutesDiff} min)`)
      }
    } catch (error) {
      console.error(`❌ Error processing booking ${booking.id}:`, error)
      // skip error
    }
  })

  // Delete only bookings expired > 30 min
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
    console.log(`✨ Cleanup completed: removed ${deletedCount} expired bookings (>30min)`) 
  } else {
    console.log("✨ No expired bookings found during cleanup (>30min)")
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

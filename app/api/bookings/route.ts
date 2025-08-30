import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { supabase } from "@/lib/supabase"
import { isBookingExpired, getCurrentDateString } from "@/lib/timezone"

interface Booking {
  id: string
  booker_name: string
  phone: string
  machine: string
  date: string
  start_time: string
  end_time: string
  created_at: string
  session_id: string // Add session ownership
}

// ...existing code...

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

// Validate Thai phone number
const validateThaiPhone = (phone: string): boolean => {
  // Remove all spaces, dashes, and parentheses
  const cleanPhone = phone.replace(/[\s\-\(\)]/g, '')
  
  // Thai phone number patterns:
  // Mobile: 08X-XXX-XXXX or 06X-XXX-XXXX or 09X-XXX-XXXX
  // With country code: +66 8X-XXX-XXXX or 66 8X-XXX-XXXX
  // Landline: 0X-XXX-XXXX (where X is 2-7 for area codes)
  
  const patterns = [
    /^0[689]\d{8}$/, // Mobile numbers: 08X, 06X, 09X followed by 8 digits
    /^0[2-7]\d{7,8}$/, // Landline numbers: area codes 02-07 followed by 7-8 digits
    /^\+66[689]\d{8}$/, // International mobile: +66 8X, +66 6X, +66 9X
    /^\+660[2-7]\d{7,8}$/, // International landline: +66 0X
    /^66[689]\d{8}$/, // International mobile without +: 66 8X, 66 6X, 66 9X
    /^660[2-7]\d{7,8}$/ // International landline without +: 66 0X
  ]
  
  return patterns.some(pattern => pattern.test(cleanPhone))
}

// Supabase CRUD helpers
const getBookingsFromSupabase = async (): Promise<Booking[]> => {
  const { data, error } = await supabase
    .from('bookings')
    .select('*')
  if (error) {
    console.error('Supabase fetch error:', error)
    return []
  }
  return data || []
}

const insertBookingToSupabase = async (booking: Booking): Promise<boolean> => {
  const { error } = await supabase
    .from('bookings')
    .insert([booking])
  if (error) {
    console.error('Supabase insert error:', error)
    return false
  }
  return true
}

const deleteExpiredBookingsFromSupabase = async (): Promise<number> => {
  // This assumes you have a way to determine expired bookings in SQL or via JS
  const { data, error } = await supabase
    .from('bookings')
    .delete()
    .match({ expired: true }) // You may need to adjust this logic
  if (error) {
    console.error('Supabase delete error:', error)
    return 0
  }
  return (data as any)?.length || 0
}

// Clean up expired bookings with proper timezone handling
const cleanupExpiredBookings = (bookings: Booking[]): Booking[] => {
  return bookings.filter((booking) => {
    try {
      const expired = isBookingExpired(booking.date, booking.end_time)
      
      if (expired) {
        console.log(`Auto-removing expired booking: ${booking.booker_name} - ${booking.date} ${booking.end_time}`)
      }
      
      return !expired
    } catch (error) {
      console.error("Error processing booking during cleanup:", booking, error)
      // Keep booking if there's an error parsing dates
      return true
    }
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
    let bookings = await getBookingsFromSupabase()

    // Clean up expired bookings (in-memory, for ownership info)
    const activeBookings = cleanupExpiredBookings(bookings)

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
    return NextResponse.json({ error: "ไม่สามารถโหลดข้อมูลการจองได้" }, { status: 500 })
  }
}

// POST - Create new booking with session ownership
export async function POST(request: NextRequest) {
  try {
    const sessionId = getSessionId()
    if (!sessionId) {
      return NextResponse.json({ error: "ไม่พบเซสชั่น กรุณารีเฟรชหน้าเว็บ" }, { status: 401 })
    }

    const body = await request.json()
    const { bookerName, machine, date, startTime, endTime, phone } = body

    // Basic validation
    if (!bookerName || !machine || !date || !startTime || !endTime || !phone) {
      return NextResponse.json({ error: "กรุณากรอกข้อมูลให้ครบถ้วน" }, { status: 400 })
    }

    // Validate Thai phone number
    if (!validateThaiPhone(phone)) {
      return NextResponse.json({ 
        error: "เบอร์โทรศัพท์ไม่ถูกต้อง กรุณาใส่เบอร์โทรศัพท์ที่ถูกต้อง (เช่น 08X-XXX-XXXX หรือ 02-XXX-XXXX)" 
      }, { status: 400 })
    }

    if (endTime <= startTime) {
      return NextResponse.json({ error: "เวลาสิ้นสุดต้องหลังเวลาเริ่มต้น" }, { status: 400 })
    }

    const bookingStartDateTime = new Date(`${date}T${startTime}`)
    const now = new Date()
    if (bookingStartDateTime <= now) {
      return NextResponse.json({ error: "ไม่สามารถจองย้อนหลังได้ กรุณาเลือกเวลาในอนาคต" }, { status: 400 })
    }

    // Read current bookings from Supabase
    let bookings = await getBookingsFromSupabase()
    bookings = cleanupExpiredBookings(bookings)

    // Create new booking object
    const newBookingData = {
      booker_name: bookerName,
      machine,
      date,
      start_time: startTime,
      end_time: endTime,
      phone,
    }

    // Check for overlapping bookings
    if (hasOverlappingBooking(bookings, newBookingData)) {
      return NextResponse.json(
        { error: "ช่วงเวลานี้มีคนจองแล้ว กรุณาเลือกเวลาอื่น" },
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

    // Insert to Supabase
    const success = await insertBookingToSupabase(newBooking)
    if (!success) {
      return NextResponse.json({ error: "ไม่สามารถสร้างการจองได้" }, { status: 500 })
    }

    console.log(
      `การจองใหม่: ${bookerName} - ${machine} วันที่ ${date} เวลา ${startTime} ถึง ${endTime} (เซสชั่น: ${sessionId})`,
    )

    return NextResponse.json(
      {
        message: "จองสำเร็จ",
        booking: { ...newBooking, isOwner: true },
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("Error in POST /api/bookings:", error)
    return NextResponse.json({ error: "ไม่สามารถสร้างการจองได้" }, { status: 500 })
  }
}

// DELETE - Remove expired bookings manually
export async function DELETE() {
  try {
    // This should be improved: ideally, expired bookings are flagged in Supabase
    const deletedCount = await deleteExpiredBookingsFromSupabase()
    return NextResponse.json({
      message: `ลบการจองที่หมดอายุแล้ว ${deletedCount} รายการ`,
      deletedCount: deletedCount,
    })
  } catch (error) {
    console.error("Error in DELETE /api/bookings:", error)
    return NextResponse.json({ error: "ไม่สามารถลบการจองที่หมดอายุได้" }, { status: 500 })
  }
}

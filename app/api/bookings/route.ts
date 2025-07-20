import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import fs from "fs"
import path from "path"

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
    throw new Error("ไม่สามารถบันทึกข้อมูลการจองได้")
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

    // Add to bookings array
    bookings.push(newBooking)

    // Save to file
    writeBookings(bookings)

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
    const bookings = readBookings()
    const originalCount = bookings.length

    // Clean up expired bookings
    const activeBookings = cleanupExpiredBookings(bookings)
    const deletedCount = originalCount - activeBookings.length

    // Save cleaned bookings
    writeBookings(activeBookings)

    return NextResponse.json({
      message: `ลบการจองที่หมดอายุแล้ว ${deletedCount} รายการ`,
      deletedCount: deletedCount,
    })
  } catch (error) {
    console.error("Error in DELETE /api/bookings:", error)
    return NextResponse.json({ error: "ไม่สามารถลบการจองที่หมดอายุได้" }, { status: 500 })
  }
}

import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { supabase } from "@/lib/supabase"

interface Booking {
  id: string
  booker_name: string
  machine: string
  date: string
  start_time: string
  end_time: string
  phone: string
  created_at: string
  session_id: string
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

// ...existing code...

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

    // Fetch booking from Supabase
    const { data: booking, error: fetchError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .single()
    if (fetchError || !booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 })
    }

    if (!body?.isAdmin) {
      if (booking.session_id !== sessionId) {
        return NextResponse.json({ error: "You can only delete your own bookings" }, { status: 403 })
      }
    }

    // Delete booking from Supabase
    const { error: deleteError } = await supabase
      .from('bookings')
      .delete()
      .eq('id', bookingId)
    if (deleteError) {
      return NextResponse.json({ error: "Failed to delete booking" }, { status: 500 })
    }

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

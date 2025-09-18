import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

interface Booking {
    id: string
    booker_name: string
    phone: string
    machine: string
    date: string
    start_time: string
    end_time: string
    created_at: string
    session_id: string
}

// Fetch all bookings from Supabase
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

// Delete bookings by IDs
const deleteBookingsByIds = async (ids: string[]): Promise<number> => {
    if (ids.length === 0) return 0
    const { data, error } = await supabase
        .from('bookings')
        .delete()
        .in('id', ids)
        .select('id')
    if (error) {
        console.error('Supabase delete error:', error)
        return 0
    }
    return data ? data.length : 0
}

export function isBookingExpired(bookingDate: string, bookingEndTime: string): boolean {
    const serverTime = new Date();
    const endDateTime = new Date(`${bookingDate}T${bookingEndTime}`)
    // Keep if end_time + 30min > now
    console.log(new Date(endDateTime.getTime() + 30 * 60 * 1000).toISOString(), new Date(serverTime.getTime() + (7 * 60 * 60 * 1000)).toISOString())
    return endDateTime.getTime() + 30 * 60 * 1000 < serverTime.getTime()
}

// Cleanup API route: DELETE expired bookings
export async function POST() {
    try {
        const bookings = await getBookingsFromSupabase()
        const expiredBookings = bookings.filter(b => isBookingExpired(b.date, b.end_time))
        const expiredIds = expiredBookings.map(b => b.id)
        const deletedCount = await deleteBookingsByIds(expiredIds)

        return NextResponse.json({
            message: `ลบการจองที่หมดอายุแล้ว ${deletedCount} รายการ`,
            deletedCount,
            expiredIds,
        })
    } catch (error) {
        console.error("Error in POST /api/cleanup:", error)
        return NextResponse.json({ error: "ไม่สามารถลบการจองที่หมดอายุได้" }, { status: 500 })
    }
}

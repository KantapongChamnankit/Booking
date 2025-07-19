"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Trash2, RefreshCw, Calendar, Clock, User, Settings, Database, FileText } from "lucide-react"

interface Booking {
  id: string
  booker_name: string
  machine: string
  date: string
  start_time: string
  end_time: string
  created_at: string
}

export default function AdminPage() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const fetchBookings = async () => {
    try {
      const response = await fetch("/api/bookings")
      if (response.ok) {
        const data = await response.json()
        setBookings(data.bookings)
      }
    } catch (error) {
      console.error("Failed to fetch bookings:", error)
    }
  }

  const removeExpiredBookings = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/cleanup", { method: "POST" })
      if (response.ok) {
        const result = await response.json()
        toast({
          title: "Success",
          description: result.message,
        })
        fetchBookings()
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.error || "Failed to remove expired bookings",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to remove expired bookings",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Add this function to handle individual booking removal
  const removeBooking = async (id: string) => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/bookings/${id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isAdmin: true })
      })
      if (response.ok) {
        toast({
          title: "Booking Removed",
          description: `Booking ${id} has been deleted.`,
        })
        fetchBookings()
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.error || "Failed to remove booking",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to remove booking",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchBookings()
  }, [])

  const formatTimeSlot = (startTime: string, endTime: string) => {
    const formatTime = (time: string) => {
      const [hours, minutes] = time.split(":")
      const hour = Number.parseInt(hours)
      const ampm = hour >= 12 ? "PM" : "AM"
      const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
      return `${displayHour}:${minutes} ${ampm}`
    }
    return `${formatTime(startTime)} - ${formatTime(endTime)}`
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const getBookingStatus = (booking: Booking) => {
    const bookingStartDateTime = new Date(`${booking.date}T${booking.start_time}`)
    const bookingEndDateTime = new Date(`${booking.date}T${booking.end_time}`)
    const now = new Date()

    if (now < bookingStartDateTime) {
      return { status: "upcoming", color: "bg-blue-100 text-blue-800" }
    } else if (now >= bookingStartDateTime && now <= bookingEndDateTime) {
      return { status: "active", color: "bg-green-100 text-green-800" }
    } else {
      return { status: "expired", color: "bg-gray-100 text-gray-800" }
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            <Database className="h-6 w-6 text-blue-500" />
          </div>
          <p className="text-gray-600">Manage bookings and system maintenance</p>
          <div className="flex items-center justify-center gap-2 text-sm text-blue-600">
            <FileText className="h-4 w-4" />
            <span>Data stored in: /data/bookings.json</span>
          </div>
        </div>

        <div className="flex gap-4 justify-center">
          <Button onClick={fetchBookings} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={removeExpiredBookings} disabled={isLoading}>
            <Trash2 className="h-4 w-4 mr-2" />
            {isLoading ? "Removing..." : "Remove Expired"}
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Bookings</CardTitle>
            <CardDescription>Total bookings: {bookings.length}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {bookings.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No bookings found</p>
                </div>
              ) : (
                bookings.map((booking) => {
                  const { status, color } = getBookingStatus(booking)
                  return (
                    <div key={booking.id} className="p-4 border rounded-lg bg-white shadow-sm">
                      <div className="flex justify-between items-start mb-3">
                        <div className="space-y-1">
                          <div className="font-medium text-gray-900 flex items-center gap-2">
                            <User className="h-4 w-4" />
                            {booking.booker_name}
                          </div>
                          <div className="text-sm text-gray-600 flex items-center gap-2">
                            <Settings className="h-4 w-4" />
                            {booking.machine}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <Badge className={color}>{status}</Badge>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => removeBooking(booking.id)}
                            disabled={isLoading}
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Remove
                          </Button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center gap-2 text-gray-600">
                          <Calendar className="h-4 w-4" />
                          {formatDate(booking.date)}
                        </div>
                        <div className="flex items-center gap-2 text-gray-600">
                          <Clock className="h-4 w-4" />
                          {formatTimeSlot(booking.start_time, booking.end_time)}
                        </div>
                      </div>

                      <div className="mt-2 text-xs text-gray-400 space-y-1">
                        <div>ID: {booking.id}</div>
                        <div>Created: {new Date(booking.created_at).toLocaleString()}</div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

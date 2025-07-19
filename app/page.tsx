"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { Calendar, Clock, User, Settings, RefreshCw, AlertCircle, Database, Trash2, Shield } from "lucide-react"

interface Booking {
  id: string
  booker_name: string
  machine: string
  date: string
  start_time: string
  end_time: string
  created_at: string
  session_id: string
  isOwner?: boolean
}

const machines = ["big indoor", "small indoor", "outdoor"]

export default function BookingSystem() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [formData, setFormData] = useState({
    bookerName: "",
    machine: "",
    date: "",
    startTime: "",
    endTime: "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const { toast } = useToast()

  // Initialize session
  const initializeSession = async () => {
    try {
      const response = await fetch("/api/auth/session")
      if (response.ok) {
        const data = await response.json()
        setSessionId(data.sessionId)
      }
    } catch (error) {
      console.error("Failed to initialize session:", error)
    }
  }

  // Fetch bookings from local JSON
  const fetchBookings = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/bookings")
      if (response.ok) {
        const data = await response.json()
        setBookings(data.bookings || [])
        if (data.sessionId) {
          setSessionId(data.sessionId)
        }
      } else {
        setError("Failed to load bookings")
        console.error("Failed to fetch bookings:", response.status)
      }
    } catch (error) {
      setError("Network error loading bookings")
      console.error("Failed to fetch bookings:", error)
    } finally {
      setIsLoading(false)
    }
  }

  // Delete a booking
  const deleteBooking = async (bookingId: string) => {
    setDeletingId(bookingId)
    try {
      const response = await fetch(`/api/bookings/${bookingId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isAdmin: false }) // Pass isAdmin flag for admin deletion
      })

      const result = await response.json()

      if (response.ok) {
        toast({
          title: "Success",
          description: "Booking deleted successfully!",
        })
        await fetchBookings() // Refresh the list
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to delete booking.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Delete error:", error)
      toast({
        title: "Error",
        description: "Network error. Please try again.",
        variant: "destructive",
      })
    } finally {
      setDeletingId(null)
    }
  }

  // Manual cleanup
  const handleCleanup = async () => {
    try {
      const response = await fetch("/api/cleanup", { method: "POST" })
      if (response.ok) {
        const result = await response.json()
        toast({
          title: "Cleanup Complete",
          description: result.message,
        })
        await fetchBookings() // Refresh the list
      }
    } catch (error) {
      toast({
        title: "Cleanup Failed",
        description: "Failed to remove expired bookings",
        variant: "destructive",
      })
    }
  }

  // Initial load and periodic refresh
  useEffect(() => {
    initializeSession()
    fetchBookings()

    // Set up periodic refresh every 30 seconds
    const interval = setInterval(fetchBookings, 30000)

    return () => clearInterval(interval)
  }, [])

  // Validate form
  const validateForm = () => {
    const { bookerName, machine, date, startTime, endTime } = formData

    if (!bookerName || !machine || !date || !startTime || !endTime) {
      toast({
        title: "Validation Error",
        description: "All fields are required.",
        variant: "destructive",
      })
      return false
    }

    if (endTime <= startTime) {
      toast({
        title: "Validation Error",
        description: "End time must be after start time.",
        variant: "destructive",
      })
      return false
    }

    const bookingDateTime = new Date(`${date}T${startTime}`)
    const now = new Date()
    if (bookingDateTime <= now) {
      toast({
        title: "Validation Error",
        description: "Bookings must be for current or future date/time.",
        variant: "destructive",
      })
      return false
    }

    return true
  }

  // Submit booking
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    setIsSubmitting(true)

    try {
      console.log("Submitting booking:", formData)

      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      const result = await response.json()
      console.log("Response:", result)

      if (response.ok) {
        toast({
          title: "Success",
          description: "Booking created successfully!",
        })
        setFormData({
          bookerName: "",
          machine: "",
          date: "",
          startTime: "",
          endTime: "",
        })
        // Refresh bookings
        await fetchBookings()
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to create booking.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Submit error:", error)
      toast({
        title: "Error",
        description: "Network error. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Format time for display
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

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  // Get user's bookings
  const myBookings = bookings.filter((booking) => booking.isOwner)

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <h1 className="text-3xl font-bold text-gray-900">Equipment Booking System</h1>
            <Database className="h-6 w-6 text-blue-500"/>
          </div>
          <p className="text-gray-600">Reserve machines and equipment for your scheduled time slots</p>
          <div className="flex items-center justify-center gap-4 text-sm">
            <span className="text-blue-600">📁 Data stored locally in JSON file</span>
            {sessionId && (
              <span className="text-green-600 flex items-center gap-1">
                <Shield className="h-3 w-3" />
                Session: {sessionId.slice(0, 8)}...
              </span>
            )}
          </div>
          {error && (
            <div className="flex items-center justify-center gap-2 text-red-600 bg-red-50 p-2 rounded">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">{error}</span>
            </div>
          )}
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Booking Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                New Booking
              </CardTitle>
              <CardDescription>Fill out the form below to reserve equipment</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="bookerName" className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Booker Name
                  </Label>
                  <Input
                    id="bookerName"
                    value={formData.bookerName}
                    onChange={(e) => setFormData({ ...formData, bookerName: e.target.value })}
                    placeholder="Enter your name"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="machine" className="flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Machine/Equipment
                  </Label>
                  <Select
                    value={formData.machine}
                    onValueChange={(value) => setFormData({ ...formData, machine: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a machine" />
                    </SelectTrigger>
                    <SelectContent>
                      {machines.map((machine) => (
                        <SelectItem key={machine} value={machine}>
                          {machine}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    min={new Date().toISOString().split("T")[0]}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startTime" className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Start Time
                    </Label>
                    <Input
                      id="startTime"
                      type="time"
                      value={formData.startTime}
                      onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endTime">End Time</Label>
                    <Input
                      id="endTime"
                      type="time"
                      value={formData.endTime}
                      onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? "Creating Booking..." : "Book Equipment"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Current Bookings */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Current Bookings</CardTitle>
                  <CardDescription>
                    Active reservations ({bookings.length} total, {myBookings.length} yours)
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleCleanup}>
                    Clean
                  </Button>
                  <Button variant="outline" size="sm" onClick={fetchBookings} disabled={isLoading}>
                    <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {bookings.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Settings className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No active bookings</p>
                    <p className="text-sm">Create your first booking to get started</p>
                  </div>
                ) : (
                  bookings.map((booking) => (
                    <div
                      key={booking.id}
                      className={`p-3 border rounded-lg shadow-sm hover:shadow-md transition-shadow ${
                        booking.isOwner ? "bg-blue-50 border-blue-200" : "bg-white"
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <div className="font-medium text-gray-900 flex items-center gap-2">
                            {booking.booker_name}
                            {booking.isOwner && <Shield className="h-3 w-3 text-blue-500" />}
                          </div>
                          <div className="text-sm text-gray-600 flex items-center gap-1">
                            <Settings className="h-3 w-3" />
                            {booking.machine}
                          </div>
                          <div className="text-sm text-gray-500 flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(booking.date)}
                          </div>
                        </div>
                        <div className="text-right flex flex-col items-end gap-2">
                          <div className="text-sm font-medium text-blue-600 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatTimeSlot(booking.start_time, booking.end_time)}
                          </div>
                          {booking.isOwner && (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => deleteBooking(booking.id)}
                              disabled={deletingId === booking.id}
                            >
                              {deletingId === booking.id ? (
                                <RefreshCw className="h-3 w-3 animate-spin" />
                              ) : (
                                <Trash2 className="h-3 w-3" />
                              )}
                            </Button>
                          )}
                          <div className="text-xs text-gray-400">ID: {booking.id}</div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* My Bookings Section */}
        {myBookings.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-blue-500" />
                My Bookings
              </CardTitle>
              <CardDescription>Your personal bookings ({myBookings.length} total)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {myBookings.map((booking) => (
                  <div key={booking.id} className="p-3 border rounded-lg bg-blue-50 border-blue-200">
                    <div className="flex justify-between items-start mb-2">
                      <div className="space-y-1">
                        <div className="font-medium text-gray-900">{booking.booker_name}</div>
                        <div className="text-sm text-gray-600">{booking.machine}</div>
                        <div className="text-sm text-gray-500">{formatDate(booking.date)}</div>
                        <div className="text-sm text-blue-600">
                          {formatTimeSlot(booking.start_time, booking.end_time)}
                        </div>
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteBooking(booking.id)}
                        disabled={deletingId === booking.id}
                      >
                        {deletingId === booking.id ? (
                          <RefreshCw className="h-3 w-3 animate-spin" />
                        ) : (
                          <Trash2 className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

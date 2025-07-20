"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { Calendar, Clock, User, Settings, RefreshCw, AlertCircle, Database, Trash2, Shield, PhoneCall, Waves } from "lucide-react"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { cn } from "@/lib/utils"

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
  isOwner?: boolean
}

const machines = ["big indoor", "small indoor", "outdoor"]

// Add this custom washing machine icon component
const WashingMachineIcon = ({ className = "h-6 w-6" }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
  >
    <rect x="2" y="2" width="20" height="20" rx="4" ry="4" />
    <rect x="4" y="4" width="4" height="1.5" rx="0.75" fill="white" />
    <circle cx="16" cy="5" r="1" fill="white" />
    <circle cx="19" cy="5" r="1" fill="white" />
    <circle cx="12" cy="14" r="6" fill="white" />
    <path d="M8 14 C8 14, 10 12, 14 12 C18 12, 18 16, 16 18 C14 20, 10 18, 8 16 Z" fill="black" />
  </svg>
)

export default function BookingSystem() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [formData, setFormData] = useState({
    bookerName: "",
    phone: "",
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
  const [showMachineModal, setShowMachineModal] = useState(false)
  const [date, setDate] = useState<Date>()
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
        setError("โหลดข้อมูลการจองล้มเหลว")
        console.error("Failed to fetch bookings:", response.status)
      }
    } catch (error) {
      setError("เกิดข้อผิดพลาดในการเชื่อมต่อ")
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
          title: "ลบการจองสำเร็จ!",
          description: "รายการจองถูกลบเรียบร้อยแล้ว",
        })
        await fetchBookings() // Refresh the list
      } else {
        toast({
          title: "ลบการจองไม่สำเร็จ",
          description: result.error || "ไม่สามารถลบรายการจองได้",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Delete error:", error)
      toast({
        title: "ลบการจองไม่สำเร็จ",
        description: "เกิดข้อผิดพลาดในการเชื่อมต่อ. กรุณาลองอีกครั้ง.",
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

  // Update form data when date changes
  useEffect(() => {
    if (date) {
      setFormData({ ...formData, date: format(date, "yyyy-MM-dd") })
    }
  }, [date])

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

  // Validate form
  const validateForm = () => {
    const { bookerName, machine, startTime, endTime, phone } = formData
    const date = new Date().toISOString().split("T")[0]

    if (!bookerName || !machine || !date || !startTime || !endTime || !phone) {
      toast({
        title: "จองไม่สำเร็จ",
        description: "กรุณากรอกข้อมูลให้ครบถ้วน",
        variant: "destructive",
      })
      return false
    }

    // Validate Thai phone number
    if (!validateThaiPhone(phone)) {
      toast({
        title: "จองไม่สำเร็จ",
        description: "กรุณาใส่เบอร์โทรศัพท์ที่ถูกต้อง (เช่น 08X-XXX-XXXX หรือ 02-XXX-XXXX)",
        variant: "destructive",
      })
      return false
    }

    if (endTime <= startTime) {
      toast({
        title: "จองไม่สำเร็จ",
        description: "เวลาสิ้นสุดต้องหลังเวลาเริ่มต้น",
        variant: "destructive",
      })
      return false
    }

    const bookingDateTime = new Date(`${date}T${startTime}`)
    const now = new Date()
    if (bookingDateTime <= now) {
      toast({
        title: "จองไม่สำเร็จ",
        description: "เวลาจองต้องเป็นปัจจุบันหรืออนาคต",
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
      const submissionData = {
        bookerName: formData.bookerName,
        phone: formData.phone,
        machine: formData.machine,
        date: new Date().toISOString().split("T")[0],
        startTime: formData.startTime,
        endTime: formData.endTime,
      }

      console.log("Submitting booking:", submissionData)

      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(submissionData),
      })

      const result = await response.json()
      console.log("Response:", result)

      if (response.ok) {
        toast({
          title: "จองสำเร็จ",
          description: "สร้างรายการจองสำเร็จ!",
        })
        setFormData({
          bookerName: "",
          machine: "",
          date: "",
          startTime: "",
          endTime: "",
          phone: "",
        })
        await fetchBookings()
      } else {
        toast({
          title: "จองไม่สำเร็จ",
          description: result.error || "ไม่สามารถสร้างรายการจองได้",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Submit error:", error)
      toast({
        title: "จองไม่สำเร็จ",
        description: "เกิดข้อผิดพลาดในการเชื่อมต่อ. กรุณาลองอีกครั้ง.",
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

  // Group bookings by machine
  const groupedBookings = {
    "เครื่องซักผ้าในหอ (ใหญ่)": bookings.filter(b => b.machine === "เครื่องซักผ้าในหอ (ใหญ่)"),
    "เครื่องซักผ้าในหอ (เล็ก)": bookings.filter(b => b.machine === "เครื่องซักผ้าในหอ (เล็ก)"),
    "เครื่องซักผ้านอกหอ": bookings.filter(b => b.machine === "เครื่องซักผ้านอกหอ")
  }

  const machineOptions = [
    {
      id: "big-indoor",
      name: "เครื่องซักผ้าในหอ (ใหญ่)",
      description: "",
      icon: <WashingMachineIcon className="h-24 w-24" />
    },
    {
      id: "small-indoor",
      name: "เครื่องซักผ้าในหอ (เล็ก)",
      description: "",
      icon: <WashingMachineIcon className="h-20 w-20" />
    },
    {
      id: "outdoor",
      name: "เครื่องซักผ้านอกหอ",
      description: "",
      icon: <WashingMachineIcon className="h-28 w-28" />
    }
  ]

  const handleMachineSelect = (machineId: string) => {
    const machine = machineOptions.find(m => m.id === machineId)
    if (machine) {
      setFormData({ ...formData, machine: machine.name })
      setShowMachineModal(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <h1 className="text-3xl font-bold text-gray-900">ระบบจองเครื่องซักผ้า</h1>
            <Database className="h-6 w-6 text-blue-500" />
          </div>
          <div className="flex items-center justify-center gap-4 text-sm">
            {sessionId && (
              <span className="text-green-600 flex items-center gap-1">
                <Shield className="h-3 w-3" />
                เซสชั่น: {sessionId.slice(0, 16)}...
              </span>
            )}
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              วันที่ {new Date().toLocaleDateString("th-TH", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
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
                จองคิวเครื่องซักผ้า
              </CardTitle>
              <CardDescription>กรอกแบบฟอร์มด้านล่างเพื่อจองเครื่องซักผ้า</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="bookerName" className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    ชื่อผู้จอง
                  </Label>
                  <Input
                    id="bookerName"
                    value={formData.bookerName}
                    onChange={(e) => setFormData({ ...formData, bookerName: e.target.value })}
                    placeholder="ใส่ชื่อของคุณ"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone" className="flex items-center gap-2">
                    <PhoneCall className="h-4 w-4" />
                    เบอร์โทรศัพท์
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => {
                      setFormData({ ...formData, phone: e.target.value })
                    }}
                    placeholder="เช่น 081-234-5678 หรือ 0812345678"
                    required
                    className={`${formData.phone && !validateThaiPhone(formData.phone)
                        ? "border-red-500 focus:border-red-500"
                        : ""
                      }`}
                  />
                  {formData.phone && !validateThaiPhone(formData.phone) && (
                    <p className="text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      กรุณาใส่เบอร์โทรศัพท์ที่ถูกต้อง
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="machine" className="flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    เครื่องซักผ้า
                  </Label>
                  <Dialog open={showMachineModal} onOpenChange={setShowMachineModal}>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                        type="button"
                      >
                        <WashingMachineIcon className="h-4 w-4 mr-2" />
                        {formData.machine || "เลือกเครื่องซักผ้า"}
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                          <WashingMachineIcon className="h-5 w-5" />
                          เลือกเครื่องซักผ้า
                        </DialogTitle>
                        <DialogDescription>
                          เลือกเครื่องซักผ้าที่คุณต้องการจอง
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-3 py-4">
                        {machineOptions.map((machine) => (
                          <Button
                            key={machine.id}
                            variant="outline"
                            className="h-16 p-4 text-left justify-start hover:bg-blue-50"
                            onClick={() => handleMachineSelect(machine.id)}
                          >
                            <div className="flex flex-col items-center justify-center gap-2 w-full">
                              <div className="font-medium text-center">{machine.name}</div>
                              {machine.description && (
                                <div className="text-gray-500 text-center">{machine.description}</div>
                              )}
                            </div>
                          </Button>
                        ))}
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>

                <div className="flex items-center gap-2 my-2">
                  <div className="flex-1 h-px bg-gray-200" />
                  <span className="text-xs text-gray-500">จองได้ไม่เกิน 1 ชั่วโมง</span>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>
                <div className="flex gap-4">
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="startTime" className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      เวลาเริ่มจอง
                    </Label>
                    <Input
                      id="startTime"
                      type="time"
                      value={formData.startTime}
                      step="60"
                      min="00:00"
                      max="23:59"
                      onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                      required
                    />
                  </div>
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="endTime" className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      เวลาสิ้นสุด
                    </Label>
                    <Input
                      id="endTime"
                      type="time"
                      value={formData.endTime}
                      step="60"
                      min="00:00"
                      max="23:59"
                      onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? "กำลังจอง..." : "เริ่มจองคิว"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Current Bookings */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>คิวตอนนี้</CardTitle>
                  <CardDescription>
                    รายการคิว ({bookings.length} ทั้งหมด, {myBookings.length} ของคุณ)
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={fetchBookings} disabled={isLoading}>
                    <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                {Object.entries(groupedBookings).map(([machineName, machineBookings]) => (
                  <div key={machineName} className="space-y-3">
                    <div className="flex gap-2 p-2 bg-gray-100 rounded-lg h-20">
                      <WashingMachineIcon className="h-5 w-5 text-blue-600" />
                      <div>
                        <h3 className="font-medium text-sm">{machineName}</h3>
                        <p className="text-xs text-gray-500">{machineBookings.length} คิว</p>
                      </div>
                    </div>
                    <div className="space-y-2 max-h-80 overflow-y-auto">
                      {machineBookings.length === 0 ? (
                        <div className="text-center py-4 text-gray-400">
                          <Waves className="h-8 w-8 mx-auto mb-1 opacity-50" />
                          <p className="text-xs">ว่าง</p>
                        </div>
                      ) : (
                        machineBookings.map((booking) => (
                          <div
                            key={booking.id}
                            className={`p-2 border rounded-lg shadow-sm hover:shadow-md transition-shadow text-sm ${booking.isOwner ? "bg-blue-50 border-blue-200" : "bg-white"
                              }`}
                          >
                            <div className="flex justify-between items-start">
                              <div className="space-y-1 flex-1">
                                <div className="font-medium text-gray-900 flex items-center gap-1 text-sm">
                                  {booking.booker_name}
                                  {booking.isOwner && <Shield className="h-3 w-3 text-blue-500" />}
                                </div>
                                <div className="text-xs text-gray-500 flex items-center gap-1">
                                  <PhoneCall className="h-3 w-3" />
                                  {booking.phone}
                                </div>
                                <div className="text-xs font-medium text-blue-600 flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {formatTimeSlot(booking.start_time, booking.end_time)}
                                </div>
                              </div>
                              {booking.isOwner && (
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  className="h-6 w-6 p-0"
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
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ))}
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
                คิวของฉัน
              </CardTitle>
              <CardDescription>รายการจองของคุณ ({myBookings.length} ทั้งหมด)</CardDescription>
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

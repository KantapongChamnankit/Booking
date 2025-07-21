"use client"

import type React from "react"
import { useState, useEffect, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { Calendar, Clock, User, Settings, RefreshCw, AlertCircle, Database, Trash2, Shield, PhoneCall, Waves } from "lucide-react"
import { getCurrentDateString } from "@/lib/timezone"

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

interface FormData {
  bookerName: string
  phone: string
  machine: string
  date: string
  startTime: string
  endTime: string
}

// Constants
const MACHINE_OPTIONS = [
  {
    id: "big-indoor",
    name: "เครื่องซักผ้าในหอ (ใหญ่)",
    description: "",
  },
  {
    id: "small-indoor",
    name: "เครื่องซักผ้าในหอ (เล็ก)",
    description: "",
  },
  {
    id: "outdoor",
    name: "เครื่องซักผ้านอกหอ",
    description: "",
  }
] as const

const INITIAL_FORM_DATA: FormData = {
  bookerName: "",
  phone: "",
  machine: "",
  date: "",
  startTime: "",
  endTime: "",
}

const REFRESH_INTERVAL = 5000 // 30 seconds

// Components
const WashingMachineIcon = ({ className = "h-6 w-6" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <rect x="2" y="2" width="20" height="20" rx="4" ry="4" />
    <rect x="4" y="4" width="4" height="1.5" rx="0.75" fill="white" />
    <circle cx="16" cy="5" r="1" fill="white" />
    <circle cx="19" cy="5" r="1" fill="white" />
    <circle cx="12" cy="14" r="6" fill="white" />
    <path d="M8 14 C8 14, 10 12, 14 12 C18 12, 18 16, 16 18 C14 20, 10 18, 8 16 Z" fill="black" />
  </svg>
)

// Utility functions
const validateThaiPhone = (phone: string): boolean => {
  const cleanPhone = phone.replace(/[\s\-\(\)]/g, '')
  const patterns = [
    /^0[689]\d{8}$/,
    /^0[2-7]\d{7,8}$/,
    /^\+66[689]\d{8}$/,
    /^\+660[2-7]\d{7,8}$/,
    /^66[689]\d{8}$/,
    /^660[2-7]\d{7,8}$/
  ]
  return patterns.some(pattern => pattern.test(cleanPhone))
}

const formatTimeSlot = (startTime: string, endTime: string): string => {
  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(":")
    const hour = Number.parseInt(hours)
    const ampm = hour >= 12 ? "PM" : "AM"
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
    return `${displayHour}:${minutes} ${ampm}`
  }
  return `${formatTime(startTime)} - ${formatTime(endTime)}`
}

const formatDate = (dateString: string): string => {
  const date = new Date(dateString)
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

// API functions
const apiCall = async (url: string, options?: RequestInit) => {
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    ...options,
  })
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Network error" }))
    throw new Error(error.error || `HTTP ${response.status}`)
  }
  
  return response.json()
}

export default function BookingSystem() {
  // State
  const [bookings, setBookings] = useState<Booking[]>([])
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM_DATA)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [showMachineModal, setShowMachineModal] = useState(false)
  
  const { toast } = useToast()

  // Memoized values
  const myBookings = useMemo(
    () => bookings.filter((booking) => booking.isOwner),
    [bookings]
  )

  const groupedBookings = useMemo(() => ({
    "เครื่องซักผ้าในหอ (ใหญ่)": bookings.filter(b => b.machine === "เครื่องซักผ้าในหอ (ใหญ่)"),
    "เครื่องซักผ้าในหอ (เล็ก)": bookings.filter(b => b.machine === "เครื่องซักผ้าในหอ (เล็ก)"),
    "เครื่องซักผ้านอกหอ": bookings.filter(b => b.machine === "เครื่องซักผ้านอกหอ")
  }), [bookings])

  const isFormValid = useMemo(() => {
    const { bookerName, machine, startTime, endTime, phone } = formData
    return !!(bookerName && machine && startTime && endTime && phone && validateThaiPhone(phone))
  }, [formData])

  // API functions
  const initializeSession = useCallback(async () => {
    try {
      const data = await apiCall("/api/auth/session")
      setSessionId(data.sessionId)
    } catch (error) {
      console.error("Failed to initialize session:", error)
    }
  }, [])

  const handleCleanup = useCallback(async () => {
    try {
      const result = await apiCall("/api/cleanup", { method: "POST" })
      return result
    } catch (error) {
      console.error("Cleanup failed:", error)
      // Silent cleanup failure - don't show error to user for automatic cleanup
      return { deletedCount: 0, success: false }
    }
  }, [])

  const fetchBookings = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      await handleCleanup()
      const data = await apiCall("/api/bookings")
      
      setBookings(data.bookings || [])
      if (data.sessionId) {
        setSessionId(data.sessionId)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการเชื่อมต่อ"
      setError(message)
      console.error("Failed to fetch bookings:", error)
    } finally {
      setIsLoading(false)
    }
  }, [handleCleanup])

  const deleteBooking = useCallback(async (bookingId: string) => {
    setDeletingId(bookingId)
    
    try {
      await apiCall(`/api/bookings/${bookingId}`, {
        method: "DELETE",
        body: JSON.stringify({ isAdmin: false }),
      })

      toast({
        title: "ลบการจองสำเร็จ!",
        description: "รายการจองถูกลบเรียบร้อยแล้ว",
      })
      
      await fetchBookings()
    } catch (error) {
      const message = error instanceof Error ? error.message : "ไม่สามารถลบรายการจองได้"
      toast({
        title: "ลบการจองไม่สำเร็จ",
        description: message,
        variant: "destructive",
      })
    } finally {
      setDeletingId(null)
    }
  }, [toast, fetchBookings])

  // Form handlers
  const updateFormData = useCallback((updates: Partial<FormData>) => {
    setFormData(prev => ({ ...prev, ...updates }))
  }, [])

  const validateForm = useCallback((): boolean => {
    const { bookerName, machine, startTime, endTime, phone } = formData
    const currentDate = getCurrentDateString()

    if (!bookerName || !machine || !currentDate || !startTime || !endTime || !phone) {
      toast({
        title: "จองไม่สำเร็จ",
        description: "กรุณากรอกข้อมูลให้ครบถ้วน",
        variant: "destructive",
      })
      return false
    }

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

    const bookingDateTime = new Date(`${currentDate}T${startTime}`)
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
  }, [formData, toast])

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    setIsSubmitting(true)

    try {
      const submissionData = {
        bookerName: formData.bookerName,
        phone: formData.phone,
        machine: formData.machine,
        date: getCurrentDateString(),
        startTime: formData.startTime,
        endTime: formData.endTime,
      }

      await apiCall("/api/bookings", {
        method: "POST",
        body: JSON.stringify(submissionData),
      })

      toast({
        title: "จองสำเร็จ",
        description: "สร้างรายการจองสำเร็จ!",
      })
      
      setFormData(INITIAL_FORM_DATA)
      await fetchBookings()
    } catch (error) {
      const message = error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการเชื่อมต่อ. กรุณาลองอีกครั้ง."
      toast({
        title: "จองไม่สำเร็จ",
        description: message,
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }, [formData, validateForm, toast, fetchBookings])

  const handleMachineSelect = useCallback((machineId: string) => {
    const machine = MACHINE_OPTIONS.find(m => m.id === machineId)
    if (machine) {
      updateFormData({ machine: machine.name })
      setShowMachineModal(false)
    }
  }, [updateFormData])

  // Effects
  useEffect(() => {
    initializeSession()
    fetchBookings()

    const interval = setInterval(fetchBookings, REFRESH_INTERVAL)
    return () => clearInterval(interval)
  }, [initializeSession, fetchBookings])

  return (
    <div className="min-h-screen bg-gray-50 p-2 sm:p-4">
      <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">ระบบจองเครื่องซักผ้า</h1>
            <Database className="h-5 w-5 sm:h-6 sm:w-6 text-blue-500" />
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 text-xs sm:text-sm">
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
            <div className="flex items-center justify-center gap-2 text-red-600 bg-red-50 p-2 rounded mx-2">
              <AlertCircle className="h-4 w-4" />
              <span className="text-xs sm:text-sm">{error}</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Booking Form */}
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <Calendar className="h-4 w-4 sm:h-5 sm:w-5" />
                จองคิวเครื่องซักผ้า
              </CardTitle>
              <CardDescription className="text-sm">กรอกแบบฟอร์มด้านล่างเพื่อจองเครื่องซักผ้า</CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="bookerName" className="flex items-center gap-2 text-sm">
                    <User className="h-3 w-3 sm:h-4 sm:w-4" />
                    ชื่อผู้จอง
                  </Label>
                  <Input
                    id="bookerName"
                    value={formData.bookerName}
                    onChange={(e) => updateFormData({ bookerName: e.target.value })}
                    placeholder="ใส่ชื่อของคุณ"
                    required
                    className="h-10 sm:h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone" className="flex items-center gap-2 text-sm">
                    <PhoneCall className="h-3 w-3 sm:h-4 sm:w-4" />
                    เบอร์โทรศัพท์
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => updateFormData({ phone: e.target.value })}
                    placeholder="เช่น 081-234-5678"
                    required
                    className={`h-10 sm:h-11 ${
                      formData.phone && !validateThaiPhone(formData.phone)
                        ? "border-red-500 focus:border-red-500"
                        : ""
                    }`}
                  />
                  {formData.phone && !validateThaiPhone(formData.phone) && (
                    <p className="text-xs text-red-600 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      กรุณาใส่เบอร์โทรศัพท์ที่ถูกต้อง
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="machine" className="flex items-center gap-2 text-sm">
                    <Settings className="h-3 w-3 sm:h-4 sm:w-4" />
                    เครื่องซักผ้า
                  </Label>
                  <Dialog open={showMachineModal} onOpenChange={setShowMachineModal}>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal h-10 sm:h-11 text-sm"
                        type="button"
                      >
                        <WashingMachineIcon className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                        <span className="truncate">{formData.machine || "เลือกเครื่องซักผ้า"}</span>
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md mx-4 rounded-lg">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-lg">
                          <WashingMachineIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                          เลือกเครื่องซักผ้า
                        </DialogTitle>
                        <DialogDescription className="text-sm">
                          เลือกเครื่องซักผ้าที่คุณต้องการจอง
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-2 py-4">
                        {MACHINE_OPTIONS.map((machine) => (
                          <Button
                            key={machine.id}
                            variant="outline"
                            className="h-12 sm:h-16 p-3 sm:p-4 text-left justify-start hover:bg-blue-50 text-sm"
                            onClick={() => handleMachineSelect(machine.id)}
                          >
                            <div className="flex flex-col items-center justify-center gap-1 w-full">
                              <div className="font-medium text-center text-xs sm:text-sm">{machine.name}</div>
                            </div>
                          </Button>
                        ))}
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>

                <div className="flex items-center gap-2 my-2">
                  <div className="flex-1 h-px bg-gray-200" />
                  <span className="text-xs text-gray-500 px-2">จองได้ไม่เกิน 1 ชั่วโมง</span>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>

                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startTime" className="flex items-center gap-2 text-sm">
                      <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
                      เวลาเริ่ม
                    </Label>
                    <Input
                      id="startTime"
                      type="time"
                      value={formData.startTime}
                      step="60"
                      min="00:00"
                      max="23:59"
                      onChange={(e) => updateFormData({ startTime: e.target.value })}
                      required
                      className="h-10 sm:h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endTime" className="flex items-center gap-2 text-sm">
                      <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
                      เวลาสิ้นสุด
                    </Label>
                    <Input
                      id="endTime"
                      type="time"
                      value={formData.endTime}
                      step="60"
                      min="00:00"
                      max="23:59"
                      onChange={(e) => updateFormData({ endTime: e.target.value })}
                      required
                      className="h-10 sm:h-11"
                    />
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full h-11 sm:h-12 text-sm sm:text-base" 
                  disabled={isSubmitting || !isFormValid}
                >
                  {isSubmitting ? "กำลังจอง..." : "เริ่มจองคิว"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Current Bookings */}
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg sm:text-xl">คิวตอนนี้</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    รายการคิว ({bookings.length} ทั้งหมด, {myBookings.length} ของคุณ)
                  </CardDescription>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={fetchBookings} 
                  disabled={isLoading} 
                  className="h-8 w-8 p-0"
                >
                  <RefreshCw className={`h-3 w-3 sm:h-4 sm:w-4 ${isLoading ? "animate-spin" : ""}`} />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
                {Object.entries(groupedBookings).map(([machineName, machineBookings]) => (
                  <div key={machineName} className="space-y-2 sm:space-y-3">
                    <div className="flex gap-2 p-2 sm:p-3 bg-gray-100 rounded-lg">
                      <WashingMachineIcon className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <h3 className="font-medium text-xs sm:text-sm truncate">{machineName}</h3>
                        <p className="text-xs text-gray-500">{machineBookings.length} คิว</p>
                      </div>
                    </div>
                    <div className="space-y-2 max-h-60 sm:max-h-80 overflow-y-auto">
                      {machineBookings.length === 0 ? (
                        <div className="text-center py-3 sm:py-4 text-gray-400">
                          <Waves className="h-6 w-6 sm:h-8 sm:w-8 mx-auto mb-1 opacity-50" />
                          <p className="text-xs">ว่าง</p>
                        </div>
                      ) : (
                        machineBookings.map((booking) => (
                          <div
                            key={booking.id}
                            className={`p-2 sm:p-3 border rounded-lg shadow-sm hover:shadow-md transition-shadow text-xs sm:text-sm ${
                              booking.isOwner ? "bg-blue-50 border-blue-200" : "bg-white"
                            }`}
                          >
                            <div className="flex justify-between items-start gap-2">
                              <div className="space-y-1 flex-1 min-w-0">
                                <div className="font-medium text-gray-900 flex items-center gap-1">
                                  <span className="truncate">{booking.booker_name}</span>
                                  {booking.isOwner && <Shield className="h-3 w-3 text-blue-500 flex-shrink-0" />}
                                </div>
                                <div className="text-xs text-gray-500 flex items-center gap-1">
                                  <PhoneCall className="h-3 w-3 flex-shrink-0" />
                                  <span className="truncate">{booking.phone}</span>
                                </div>
                                <div className="text-xs font-medium text-blue-600 flex items-center gap-1">
                                  <Clock className="h-3 w-3 flex-shrink-0" />
                                  <span className="truncate">{formatTimeSlot(booking.start_time, booking.end_time)}</span>
                                </div>
                              </div>
                              {booking.isOwner && (
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  className="h-6 w-6 p-0 flex-shrink-0"
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
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <Shield className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500" />
                คิวของฉัน
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                รายการจองของคุณ ({myBookings.length} ทั้งหมด)
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {myBookings.map((booking) => (
                  <div key={booking.id} className="p-3 sm:p-4 border rounded-lg bg-blue-50 border-blue-200">
                    <div className="flex justify-between items-start gap-2 mb-2">
                      <div className="space-y-1 flex-1 min-w-0">
                        <div className="font-medium text-gray-900 text-sm truncate">{booking.booker_name}</div>
                        <div className="text-xs sm:text-sm text-gray-600 truncate">{booking.machine}</div>
                        <div className="text-xs text-gray-500">{formatDate(booking.date)}</div>
                        <div className="text-xs sm:text-sm text-blue-600">
                          {formatTimeSlot(booking.start_time, booking.end_time)}
                        </div>
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteBooking(booking.id)}
                        disabled={deletingId === booking.id}
                        className="h-8 w-8 p-0 flex-shrink-0"
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

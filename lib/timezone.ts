// Timezone utilities for the booking system
// Handles Thailand timezone (UTC+7) properly

export const THAILAND_TIMEZONE_OFFSET = 7 * 60 * 60 * 1000 // 7 hours in milliseconds

/**
 * Get current time in Thailand timezone
 */
export const getCurrentThailandTime = (): Date => {
  const now = new Date()
  return new Date(now.getTime() + THAILAND_TIMEZONE_OFFSET)
}

/**
 * Create a booking end datetime in Thailand timezone
 */
export const createBookingEndDateTime = (date: string, endTime: string): Date => {
  try {
    const bookingDate = new Date(date)
    const [hours, minutes] = endTime.split(':').map(Number)
    
    // Set the time properly
    bookingDate.setHours(hours, minutes, 0, 0)
    
    // Add timezone offset for Thailand (UTC+7)
    return new Date(bookingDate.getTime() + THAILAND_TIMEZONE_OFFSET)
  } catch (error) {
    console.error("Error creating booking end datetime:", { date, endTime, error })
    throw error
  }
}

/**
 * Check if a booking is expired
 */
export const isBookingExpired = (date: string, endTime: string): boolean => {
  try {
    const bookingEndDateTime = createBookingEndDateTime(date, endTime)
    const now = getCurrentThailandTime()
    return bookingEndDateTime <= now
  } catch (error) {
    console.error("Error checking if booking is expired:", { date, endTime, error })
    // Return false if we can't determine - safer to keep the booking
    return false
  }
}

/**
 * Format date for display in Thailand format
 */
export const formatThailandDate = (dateString: string): string => {
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString("th-TH", {
      year: "numeric",
      month: "long", 
      day: "numeric",
      timeZone: "Asia/Bangkok"
    })
  } catch (error) {
    console.error("Error formatting Thailand date:", { dateString, error })
    return dateString
  }
}

/**
 * Get current date in YYYY-MM-DD format for Thailand timezone
 */
export const getCurrentDateString = (): string => {
  try {
    const now = getCurrentThailandTime()
    return now.toISOString().split('T')[0]
  } catch (error) {
    console.error("Error getting current date string:", error)
    // Fallback to regular date
    return new Date().toISOString().split('T')[0]
  }
}

/**
 * Debug function to log timezone information
 */
export const logTimezoneDebug = (context: string) => {
  const now = new Date()
  const utc = now.toISOString()
  const local = now.toString()
  const thailand = getCurrentThailandTime().toISOString()
  
  console.log(`[${context}] Timezone Debug:`, {
    utc,
    local,
    thailand,
    timezoneOffset: now.getTimezoneOffset(),
    serverTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone
  })
}

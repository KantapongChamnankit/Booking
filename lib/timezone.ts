// Timezone utilities for the booking system
// Handles Thailand timezone (UTC+7) properly

export const THAILAND_TIMEZONE_OFFSET = 7 * 60 * 60 * 1000 // 7 hours in milliseconds
// Add proper Thailand timezone handling
export const THAILAND_TIMEZONE = 'Asia/Bangkok'

/**
 * Get current time in Thailand timezone
 */
export const getCurrentThailandTime = (): Date => {
  const now = new Date()
  return new Date(now.getTime() + THAILAND_TIMEZONE_OFFSET)
}

// Get current date in Thailand timezone
export const getCurrentThailandDate = (): Date => {
  return new Date(new Date().toLocaleString("en-US", { timeZone: THAILAND_TIMEZONE }))
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
    // Get current time in Thailand
    const nowInThailand = getCurrentThailandDate()
    
    // Create booking end datetime
    const bookingEndDateTime = new Date(`${date}T${endTime}:00`)
    
    // Convert booking time to Thailand timezone
    const bookingEndInThailand = new Date(bookingEndDateTime.toLocaleString("en-US", { timeZone: THAILAND_TIMEZONE }))
    
    console.log(`Checking expiry: Current Thailand time: ${nowInThailand.toISOString()}, Booking end: ${bookingEndInThailand.toISOString()}`)
    
    return nowInThailand > bookingEndInThailand
  } catch (error) {
    console.error("Error checking booking expiry:", error)
    return false // Don't delete if we can't determine expiry
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
 * Get current date string in Thailand timezone (YYYY-MM-DD format)
 */
export const getCurrentDateString = (): string => {
  const now = getCurrentThailandDate()
  return now.toISOString().split('T')[0]
}

/**
 * Debug function to log timezone information
 */
export const logTimezoneDebug = (context: string = "Debug") => {
  const now = new Date()
  const utcTime = now.toISOString()
  const thailandTime = now.toLocaleString("en-US", { timeZone: THAILAND_TIMEZONE })
  const serverLocalTime = now.toString()
  
  console.log(`=== ${context} - Timezone Debug ===`)
  console.log(`UTC Time: ${utcTime}`)
  console.log(`Thailand Time: ${thailandTime}`)
  console.log(`Server Local Time: ${serverLocalTime}`)
  console.log(`Server Timezone: ${Intl.DateTimeFormat().resolvedOptions().timeZone}`)
  console.log(`Thailand Date String: ${getCurrentDateString()}`)
  console.log(`=====================================`)
}

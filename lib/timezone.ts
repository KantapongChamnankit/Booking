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
  // Force timezone to Asia/Bangkok for Vercel
  process.env.TZ = 'Asia/Bangkok'
  
  // Get current UTC time
  const now = new Date()
  
  // Convert to Thailand time (UTC+7)
  // Use Intl API for reliable timezone conversion
  const thailandTimeString = now.toLocaleString("sv-SE", { 
    timeZone: THAILAND_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
  
  // Parse the formatted string back to a Date object
  // sv-SE format: "YYYY-MM-DD HH:mm:ss"
  const thailandDate = new Date(thailandTimeString)
  
  return thailandDate
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
    // Get current time in Thailand timezone
    const nowInThailand = getCurrentThailandDate()
    
    // Create booking end date/time in Thailand timezone
    // Parse the date and time components
    const [year, month, day] = date.split('-').map(Number)
    const [hours, minutes] = endTime.split(':').map(Number)
    
    // Create a date object representing the booking end time in Thailand
    // We'll create it as a local date and then interpret it as Thailand time
    const bookingEndThailand = new Date(year, month - 1, day, hours, minutes, 0, 0)
    
    console.log(`🕐 Booking expiry check:`)
    console.log(`   Input booking: ${date} ${endTime}`)
    console.log(`   Current Thailand time: ${nowInThailand.toLocaleString('en-US', { timeZone: THAILAND_TIMEZONE })}`)
    console.log(`   Booking end time: ${bookingEndThailand.toLocaleString('en-US', { timeZone: THAILAND_TIMEZONE })}`)
    console.log(`   Current Thailand epoch: ${nowInThailand.getTime()}`)
    console.log(`   Booking end epoch: ${bookingEndThailand.getTime()}`)
    
    // Compare the times (both should be in the same reference frame now)
    const isExpired = nowInThailand.getTime() > bookingEndThailand.getTime()
    console.log(`   Result: ${isExpired ? 'EXPIRED ❌' : 'ACTIVE ✅'}`)
    
    return isExpired
  } catch (error) {
    console.error("❌ Error checking booking expiry:", error)
    console.error("   Booking data:", { date, endTime })
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
  const thailandDate = getCurrentThailandDate()
  
  console.log(`\n=== ${context} - Timezone Debug ===`)
  console.log(`🌍 UTC Time: ${utcTime}`)
  console.log(`🇹🇭 Thailand Time (formatted): ${thailandTime}`)
  console.log(`🇹🇭 Thailand Date (computed): ${thailandDate.toLocaleString('en-US')}`)
  console.log(`🇹🇭 Thailand ISO: ${thailandDate.toISOString()}`)
  console.log(`💻 Server Local Time: ${serverLocalTime}`)
  console.log(`⚙️  Server Timezone: ${Intl.DateTimeFormat().resolvedOptions().timeZone}`)
  console.log(`📅 Thailand Date String: ${getCurrentDateString()}`)
  console.log(`=====================================\n`)
}

/**
 * Test function to verify timezone calculations
 */
export const testTimezoneCalculations = (testDate: string, testTime: string) => {
  console.log(`\n🧪 Testing timezone calculations for: ${testDate} ${testTime}`)
  
  const nowThailand = getCurrentThailandDate()
  const isExpired = isBookingExpired(testDate, testTime)
  
  console.log(`Current Thailand time: ${nowThailand.toLocaleString('en-US')}`)
  console.log(`Test booking end: ${testDate} ${testTime}`)
  console.log(`Is expired: ${isExpired}`)
  console.log(`=====================================\n`)
  
  return { nowThailand, isExpired }
}

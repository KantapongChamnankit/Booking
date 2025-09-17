// Timezone utilities for the booking system
// Handles Thailand timezone (UTC+7) properly

export const THAILAND_TIMEZONE_OFFSET = 7 * 60 * 60 * 1000 // 7 hours in milliseconds
// Add proper Thailand timezone handling
export const THAILAND_TIMEZONE = 'Asia/Bangkok'

/**
 * Get current time in Thailand timezone (auto-handles Vercel UTC)
 */
export const getCurrentThailandTime = (): Date => {
  const now = new Date()
  // Always use Intl API for reliable timezone conversion (works on Vercel)
  return new Date(now.toLocaleString("en-US", { timeZone: THAILAND_TIMEZONE }))
}

// Get current date in Thailand timezone (Vercel-compatible)
export const getCurrentThailandDate = (): Date => {
  // Get current UTC time (this works reliably on Vercel)
  const now = new Date()
  
  // Use Intl API for timezone conversion (automatically handles UTC→Thailand)
  const thailandTimeString = now.toLocaleString("sv-SE", { 
    timeZone: THAILAND_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
  
  // sv-SE format: "YYYY-MM-DD HH:mm:ss" - easier to parse
  const thailandDate = new Date(thailandTimeString)
  
  // Fallback method if Intl API fails
  if (isNaN(thailandDate.getTime())) {
    console.warn('Intl API failed, using manual UTC+7 offset')
    return new Date(now.getTime() + THAILAND_TIMEZONE_OFFSET)
  }
  
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
 * Check if a booking is expired (Vercel UTC auto-handler)
 */
export const isBookingExpired = (date: string, endTime: string): boolean => {
  try {
    // Get current time in Thailand timezone (works on Vercel UTC)
    const nowInThailand = getCurrentThailandDate()
    
    // Create booking end date/time - treat input as Thailand timezone
    const bookingEndString = `${date}T${endTime}:00`
    
    // Method 1: Use Intl API to create Thailand time
    const tempDate = new Date(bookingEndString)
    const thailandTimeString = tempDate.toLocaleString("sv-SE", { timeZone: THAILAND_TIMEZONE })
    const bookingEndThailand = new Date(thailandTimeString)
    
    // Method 2: Fallback - manual parsing if Intl fails
    let finalBookingEnd = bookingEndThailand
    if (isNaN(bookingEndThailand.getTime())) {
      console.warn('Using fallback timezone calculation')
      const [year, month, day] = date.split('-').map(Number)
      const [hours, minutes] = endTime.split(':').map(Number)
      finalBookingEnd = new Date(year, month - 1, day, hours, minutes, 0, 0)
    }
    
    console.log(`🕐 Booking expiry check (Vercel-compatible):`)
    console.log(`   Input: ${date} ${endTime}`)
    console.log(`   Current Thailand: ${nowInThailand.toISOString()} (${nowInThailand.toLocaleString('th-TH', { timeZone: THAILAND_TIMEZONE })})`)
    console.log(`   Booking end: ${finalBookingEnd.toISOString()} (${finalBookingEnd.toLocaleString('th-TH', { timeZone: THAILAND_TIMEZONE })})`)
    
    const isExpired = nowInThailand.getTime() > finalBookingEnd.getTime()
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
 * Get current date string in Thailand timezone (YYYY-MM-DD format) - Vercel compatible
 */
export const getCurrentDateString = (): string => {
  // Use Intl API for reliable date formatting (auto-handles Vercel UTC)
  const now = new Date()
  const thailandDateString = now.toLocaleDateString("sv-SE", { 
    timeZone: THAILAND_TIMEZONE 
  })
  return thailandDateString // Already in YYYY-MM-DD format
}

/**
 * Debug function to log timezone information (Vercel-aware)
 */
export const logTimezoneDebug = (context: string = "Debug") => {
  const now = new Date()
  const utcTime = now.toISOString()
  const thailandTime = now.toLocaleString("en-US", { timeZone: THAILAND_TIMEZONE })
  const serverLocalTime = now.toString()
  const thailandDate = getCurrentThailandDate()
  const serverTz = Intl.DateTimeFormat().resolvedOptions().timeZone
  
  console.log(`\n=== ${context} - Timezone Debug (Vercel-compatible) ===`)
  console.log(`🌍 UTC Time: ${utcTime}`)
  console.log(`🇹🇭 Thailand Time (Intl API): ${thailandTime}`)
  console.log(`🇹🇭 Thailand Date (computed): ${thailandDate.toLocaleString('en-US')}`)
  console.log(`🇹🇭 Thailand ISO: ${thailandDate.toISOString()}`)
  console.log(`💻 Server Local: ${serverLocalTime}`)
  console.log(`⚙️  Server TZ: ${serverTz} ${serverTz === 'UTC' ? '(Vercel detected ✅)' : '(Local dev 🏠)'}`)
  console.log(`📅 Thailand Date String: ${getCurrentDateString()}`)
  console.log(`🔧 Auto-handler: ${serverTz === 'UTC' ? 'Using Intl API' : 'Using local time'}`)
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

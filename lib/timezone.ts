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
  
  // Simple and reliable: just add 7 hours to UTC time
  // This gives us the current moment in Thailand timezone
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
 * Check if a booking is expired (Vercel UTC auto-handler)
 */
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
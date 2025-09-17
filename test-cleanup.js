// Simple test to understand the cleanup logic
const testBooking = {
  id: "test",
  booker_name: "พู่กัน",
  date: "2025-09-17",
  start_time: "21:24",
  end_time: "21:25",
  created_at: "2025-09-17T14:23:54.314Z"
}

console.log("=== CLEANUP TEST ===")

// Current time in Thailand (simulating the cleanup logic)
const getCurrentThailandDate = () => {
  const now = new Date()
  const thailandTimeString = now.toLocaleString("sv-SE", { 
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
  return new Date(thailandTimeString)
}

const now = getCurrentThailandDate()
console.log(`Current Thailand time: ${now.toLocaleString('en-US', { timeZone: 'Asia/Bangkok' })}`)
console.log(`Current Thailand ISO: ${now.toISOString()}`)

// Test booking end time calculation
const bookingDateStr = `${testBooking.date}T${testBooking.end_time}:00`
console.log(`Booking end string: ${bookingDateStr}`)

// Parse as Thailand local time
const [datePart, timePart] = bookingDateStr.split('T')
const [year, month, day] = datePart.split('-').map(Number)
const [hours, minutes] = timePart.split(':').map(Number)

const endDateTime = new Date(year, month - 1, day, hours, minutes, 0, 0)
console.log(`Booking end (Thailand): ${endDateTime.toLocaleString('en-US', { timeZone: 'Asia/Bangkok' })}`)
console.log(`Booking end ISO: ${endDateTime.toISOString()}`)

// Calculate difference
const timeDiff = now.getTime() - endDateTime.getTime()
const minutesDiff = Math.floor(timeDiff / (1000 * 60))
console.log(`Time difference: ${minutesDiff} minutes`)

if (timeDiff > 30 * 60 * 1000) {
  console.log(`❌ EXPIRED (${minutesDiff} min ago) - should delete`)
} else {
  console.log(`✅ ACTIVE (expires in ${-minutesDiff} min)`)
}

console.log("=== END TEST ===")
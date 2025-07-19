import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Create client with minimal configuration
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false, // Disable auth session to avoid conflicts
  },
  realtime: {
    params: {
      eventsPerSecond: 2, // Limit real-time events
    },
  },
})

export type Database = {
  public: {
    Tables: {
      bookings: {
        Row: {
          id: string
          booker_name: string
          machine: string
          date: string
          start_time: string
          end_time: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          booker_name: string
          machine: string
          date: string
          start_time: string
          end_time: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          booker_name?: string
          machine?: string
          date?: string
          start_time?: string
          end_time?: string
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}

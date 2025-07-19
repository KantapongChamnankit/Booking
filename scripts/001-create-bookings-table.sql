-- Drop everything and start fresh
DROP TABLE IF EXISTS bookings CASCADE;
DROP FUNCTION IF EXISTS delete_expired_bookings() CASCADE;
DROP FUNCTION IF EXISTS cleanup_expired_bookings() CASCADE;
DROP FUNCTION IF EXISTS trigger_delete_expired_bookings() CASCADE;

-- Create a simple bookings table without any triggers or complex constraints
CREATE TABLE bookings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booker_name TEXT NOT NULL,
  machine TEXT NOT NULL,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create simple indexes for performance
CREATE INDEX idx_bookings_machine_date ON bookings(machine, date);
CREATE INDEX idx_bookings_date ON bookings(date);

-- Disable Row Level Security to avoid any policy conflicts
ALTER TABLE bookings DISABLE ROW LEVEL SECURITY;

-- Grant full access to authenticated users
GRANT ALL ON bookings TO authenticated;
GRANT ALL ON bookings TO anon;

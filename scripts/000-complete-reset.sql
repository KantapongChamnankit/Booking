-- Complete database reset - drop everything related to bookings
DROP TABLE IF EXISTS bookings CASCADE;
DROP SCHEMA IF EXISTS booking_system CASCADE;

-- Create a fresh schema
CREATE SCHEMA IF NOT EXISTS booking_system;

-- Create the table in the new schema
CREATE TABLE booking_system.bookings (
  id SERIAL PRIMARY KEY,
  booker_name VARCHAR(255) NOT NULL,
  machine VARCHAR(255) NOT NULL,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create simple indexes
CREATE INDEX idx_bookings_machine_date ON booking_system.bookings(machine, date);
CREATE INDEX idx_bookings_date ON booking_system.bookings(date);

-- Grant permissions
GRANT ALL ON SCHEMA booking_system TO postgres;
GRANT ALL ON booking_system.bookings TO postgres;
GRANT USAGE ON SCHEMA booking_system TO anon;
GRANT ALL ON booking_system.bookings TO anon;
GRANT USAGE ON SCHEMA booking_system TO authenticated;
GRANT ALL ON booking_system.bookings TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE booking_system.bookings_id_seq TO anon;
GRANT USAGE, SELECT ON SEQUENCE booking_system.bookings_id_seq TO authenticated;

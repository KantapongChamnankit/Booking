-- Create safe RPC functions that don't cause recursion

-- Function to get active bookings
CREATE OR REPLACE FUNCTION get_active_bookings(today_date DATE)
RETURNS TABLE(
  id INTEGER,
  booker_name TEXT,
  machine TEXT,
  date DATE,
  start_time TIME,
  end_time TIME,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    b.id,
    b.booker_name,
    b.machine,
    b.date,
    b.start_time,
    b.end_time,
    b.created_at
  FROM booking_system.bookings b
  WHERE b.date >= today_date
    AND (b.date > today_date OR b.end_time > CURRENT_TIME)
  ORDER BY b.date ASC, b.start_time ASC;
END;
$$ LANGUAGE plpgsql;

-- Function to safely create a booking
CREATE OR REPLACE FUNCTION create_booking_safe(
  p_booker_name TEXT,
  p_machine TEXT,
  p_date DATE,
  p_start_time TIME,
  p_end_time TIME
)
RETURNS JSON AS $$
DECLARE
  overlap_count INTEGER;
  new_booking_id INTEGER;
  result JSON;
BEGIN
  -- Check for overlapping bookings
  SELECT COUNT(*) INTO overlap_count
  FROM booking_system.bookings
  WHERE machine = p_machine
    AND date = p_date
    AND (
      (start_time < p_end_time AND end_time > p_start_time)
    );

  -- If there's an overlap, return error
  IF overlap_count > 0 THEN
    result := json_build_object(
      'success', false,
      'message', 'Time slot conflicts with existing booking'
    );
    RETURN result;
  END IF;

  -- Insert the new booking
  INSERT INTO booking_system.bookings (booker_name, machine, date, start_time, end_time)
  VALUES (p_booker_name, p_machine, p_date, p_start_time, p_end_time)
  RETURNING id INTO new_booking_id;

  -- Return success with booking info
  result := json_build_object(
    'success', true,
    'message', 'Booking created successfully',
    'booking', json_build_object(
      'id', new_booking_id,
      'booker_name', p_booker_name,
      'machine', p_machine,
      'date', p_date,
      'start_time', p_start_time,
      'end_time', p_end_time
    )
  );

  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to cleanup expired bookings
CREATE OR REPLACE FUNCTION cleanup_expired_bookings()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete bookings from past dates
  DELETE FROM booking_system.bookings
  WHERE date < CURRENT_DATE;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  -- Delete today's expired bookings
  DELETE FROM booking_system.bookings
  WHERE date = CURRENT_DATE
    AND end_time < CURRENT_TIME;

  GET DIAGNOSTICS deleted_count = deleted_count + ROW_COUNT;

  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

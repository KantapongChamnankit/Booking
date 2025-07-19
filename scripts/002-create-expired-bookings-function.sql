-- Drop the problematic function and trigger completely
DROP FUNCTION IF EXISTS delete_expired_bookings() CASCADE;
DROP TRIGGER IF EXISTS cleanup_expired_bookings ON bookings CASCADE;
DROP FUNCTION IF EXISTS trigger_delete_expired_bookings() CASCADE;

-- Create a simple, safe function that doesn't cause recursion
CREATE OR REPLACE FUNCTION cleanup_expired_bookings()
RETURNS TABLE(deleted_count INTEGER) AS $$
BEGIN
  -- Simple DELETE without any triggers or recursive calls
  DELETE FROM bookings 
  WHERE (date::date + end_time::time) < NOW();
  
  -- Return the count of deleted rows
  RETURN QUERY SELECT CAST(FOUND AS INTEGER) as deleted_count;
END;
$$ LANGUAGE plpgsql;

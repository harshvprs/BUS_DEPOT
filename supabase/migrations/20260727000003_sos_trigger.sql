-- ==============================================================================
-- SOS Cover Broadcast Trigger
-- ==============================================================================
-- When a shift status changes to 'missed' or 'cancelled',
-- notify all available employees who are free on that day.

CREATE OR REPLACE FUNCTION notify_sos_cover()
RETURNS TRIGGER AS $$
DECLARE
  emp_rec RECORD;
  route_code TEXT;
  shift_date TEXT;
BEGIN
  -- Only fire when status changes to missed or cancelled
  IF (NEW.status IN ('missed', 'cancelled')) AND (OLD.status NOT IN ('missed', 'cancelled')) THEN
    
    -- Get route code
    SELECT r.route_code INTO route_code FROM routes r WHERE r.id = NEW.route_id;
    shift_date := TO_CHAR(NEW.date, 'DD Mon');

    -- Find all active employees who:
    -- 1. Are not already assigned a shift on that date
    -- 2. Are not on approved leave on that date
    FOR emp_rec IN
      SELECT p.id FROM profiles p
      WHERE p.role = 'employee'
        AND p.is_active = true
        AND p.id != NEW.employee_id
        AND NOT EXISTS (
          SELECT 1 FROM shifts s 
          WHERE s.employee_id = p.id 
            AND s.date = NEW.date 
            AND s.status NOT IN ('missed', 'cancelled')
        )
        AND NOT EXISTS (
          SELECT 1 FROM leave_requests lr
          WHERE lr.employee_id = p.id
            AND lr.status = 'approved'
            AND NEW.date >= lr.start_date
            AND NEW.date <= lr.end_date
        )
    LOOP
      INSERT INTO notifications (user_id, message, is_read)
      VALUES (emp_rec.id, '🚨 SOS: Route ' || COALESCE(route_code, '?') || ' needs coverage on ' || shift_date || '. Open the app to offer to cover!', false);
    END LOOP;
    
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sos_cover ON shifts;
CREATE TRIGGER trg_sos_cover
AFTER UPDATE ON shifts
FOR EACH ROW
EXECUTE FUNCTION notify_sos_cover();

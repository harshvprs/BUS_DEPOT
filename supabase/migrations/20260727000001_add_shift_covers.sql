-- ==============================================================================
-- Table: shift_covers
-- ==============================================================================

CREATE TABLE IF NOT EXISTS shift_covers (
  id SERIAL PRIMARY KEY,
  shift_id UUID REFERENCES shifts(id) ON DELETE CASCADE,
  requesting_employee_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(shift_id, requesting_employee_id)
);

-- RLS Policies
ALTER TABLE shift_covers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON shift_covers
  FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users" ON shift_covers
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for admin users" ON shift_covers
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

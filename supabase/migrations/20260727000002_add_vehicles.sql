-- ==============================================================================
-- Fleet & Vehicle Management
-- ==============================================================================

-- Vehicles table
CREATE TABLE IF NOT EXISTS vehicles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  bus_number VARCHAR(20) UNIQUE NOT NULL,
  capacity INTEGER DEFAULT 40,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'maintenance', 'retired')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add vehicle_id to shifts
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS vehicle_id UUID REFERENCES vehicles(id);

-- RLS
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON vehicles
  FOR SELECT USING (true);

CREATE POLICY "Enable all for admins" ON vehicles
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

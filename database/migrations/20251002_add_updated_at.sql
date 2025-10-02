-- Adds updated_at columns and triggers for tables that have BEFORE UPDATE triggers expecting this field.
-- Apply this migration in your database console if you want to retain UPDATE flows instead of DELETE fallbacks.

-- 1) Add updated_at to hostels
ALTER TABLE hostels ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- 2) Add updated_at to rooms
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- 3) Add updated_at to room_allotments (optional if you only DELETE, but recommended)
ALTER TABLE room_allotments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- 4) Generic trigger function to auto-update updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5) Attach triggers
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_hostels' ) THEN
    CREATE TRIGGER set_updated_at_hostels
    BEFORE UPDATE ON hostels
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_rooms' ) THEN
    CREATE TRIGGER set_updated_at_rooms
    BEFORE UPDATE ON rooms
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_room_allotments' ) THEN
    CREATE TRIGGER set_updated_at_room_allotments
    BEFORE UPDATE ON room_allotments
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;
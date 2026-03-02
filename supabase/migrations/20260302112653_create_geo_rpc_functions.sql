CREATE OR REPLACE FUNCTION nearby_venues(
  user_lat DOUBLE PRECISION,
  user_lng DOUBLE PRECISION,
  radius_meters INTEGER DEFAULT 2000,
  limit_count INTEGER DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  location GEOGRAPHY(POINT, 4326),
  address_full TEXT,
  address_district TEXT,
  phone TEXT,
  operating_hours JSONB,
  amenities TEXT[],
  total_seats INTEGER,
  parking_available BOOLEAN,
  distance_meters DOUBLE PRECISION,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_location GEOGRAPHY(POINT, 4326) := ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography;
BEGIN
  RETURN QUERY
  SELECT
    v.id,
    v.name,
    v.location,
    v.address_full,
    v.address_district,
    v.phone,
    v.operating_hours,
    v.amenities,
    v.total_seats,
    v.parking_available,
    ST_Distance(v.location, user_location) AS distance_meters,
    v.created_at,
    v.updated_at
  FROM venues AS v
  WHERE ST_DWithin(v.location, user_location, radius_meters)
  ORDER BY distance_meters
  LIMIT limit_count;
END;
$$;

CREATE OR REPLACE FUNCTION nearest_venues(
  user_lat DOUBLE PRECISION,
  user_lng DOUBLE PRECISION,
  limit_count INTEGER DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  location GEOGRAPHY(POINT, 4326),
  address_full TEXT,
  address_district TEXT,
  phone TEXT,
  operating_hours JSONB,
  amenities TEXT[],
  total_seats INTEGER,
  parking_available BOOLEAN,
  distance_meters DOUBLE PRECISION,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_location GEOGRAPHY(POINT, 4326) := ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography;
BEGIN
  RETURN QUERY
  SELECT
    v.id,
    v.name,
    v.location,
    v.address_full,
    v.address_district,
    v.phone,
    v.operating_hours,
    v.amenities,
    v.total_seats,
    v.parking_available,
    ST_Distance(v.location, user_location) AS distance_meters,
    v.created_at,
    v.updated_at
  FROM venues AS v
  ORDER BY distance_meters
  LIMIT limit_count;
END;
$$;

GRANT EXECUTE ON FUNCTION nearby_venues(DOUBLE PRECISION, DOUBLE PRECISION, INTEGER, INTEGER) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION nearest_venues(DOUBLE PRECISION, DOUBLE PRECISION, INTEGER) TO anon, authenticated;

COMMENT ON FUNCTION nearby_venues(DOUBLE PRECISION, DOUBLE PRECISION, INTEGER, INTEGER)
  IS 'Find PC bangs within specified radius (meters) from user location, sorted by distance';
COMMENT ON FUNCTION nearest_venues(DOUBLE PRECISION, DOUBLE PRECISION, INTEGER)
  IS 'Find N nearest PC bangs to user location, sorted by distance';

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE peripheral_type AS ENUM ('keyboard', 'mouse', 'headset', 'chair');
CREATE TYPE image_category AS ENUM ('exterior', 'interior', 'setup', 'menu');

CREATE TABLE venues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  location GEOGRAPHY(POINT, 4326) NOT NULL,
  address_full TEXT NOT NULL,
  address_district TEXT NOT NULL,
  phone TEXT,
  operating_hours JSONB NOT NULL DEFAULT '{}'::jsonb,
  amenities TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  total_seats INTEGER,
  parking_available BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT venues_total_seats_non_negative CHECK (total_seats IS NULL OR total_seats >= 0)
);

CREATE INDEX idx_venues_location ON venues USING GIST (location);
CREATE INDEX idx_venues_address_district ON venues (address_district);

CREATE TABLE venue_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  tier_name TEXT NOT NULL,
  pricing_structure JSONB NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT venue_pricing_venue_tier_unique UNIQUE (venue_id, tier_name),
  CONSTRAINT venue_pricing_structure_is_object CHECK (jsonb_typeof(pricing_structure) = 'object')
);

CREATE INDEX idx_venue_pricing_venue_id ON venue_pricing (venue_id);

CREATE TABLE venue_specs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL UNIQUE REFERENCES venues(id) ON DELETE CASCADE,
  cpu TEXT NOT NULL,
  gpu TEXT NOT NULL,
  ram_gb INTEGER NOT NULL,
  storage TEXT NOT NULL,
  monitor TEXT NOT NULL,
  internet_speed_mbps INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT venue_specs_ram_gb_positive CHECK (ram_gb > 0),
  CONSTRAINT venue_specs_internet_speed_non_negative CHECK (internet_speed_mbps IS NULL OR internet_speed_mbps >= 0)
);

CREATE INDEX idx_venue_specs_venue_id ON venue_specs (venue_id);

CREATE TABLE venue_peripherals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  peripheral_type peripheral_type NOT NULL,
  brand TEXT NOT NULL,
  model TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT venue_peripherals_venue_type_unique UNIQUE (venue_id, peripheral_type)
);

CREATE INDEX idx_venue_peripherals_venue_id ON venue_peripherals (venue_id);

CREATE TABLE venue_menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  item_name TEXT NOT NULL,
  price_krw INTEGER NOT NULL,
  is_available BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT venue_menu_items_price_non_negative CHECK (price_krw >= 0)
);

CREATE INDEX idx_venue_menu_items_venue_id ON venue_menu_items (venue_id);
CREATE INDEX idx_venue_menu_items_category ON venue_menu_items (category);

CREATE TABLE venue_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  image_category image_category NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  alt_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT venue_images_display_order_non_negative CHECK (display_order >= 0)
);

CREATE INDEX idx_venue_images_venue_id ON venue_images (venue_id);
CREATE INDEX idx_venue_images_category ON venue_images (image_category);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_venues_updated_at
BEFORE UPDATE ON venues
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_venue_pricing_updated_at
BEFORE UPDATE ON venue_pricing
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_venue_specs_updated_at
BEFORE UPDATE ON venue_specs
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_venue_peripherals_updated_at
BEFORE UPDATE ON venue_peripherals
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_venue_menu_items_updated_at
BEFORE UPDATE ON venue_menu_items
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_venue_images_updated_at
BEFORE UPDATE ON venue_images
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

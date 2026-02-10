-- Supabase Database Schema for Analytics
-- Run this in your Supabase SQL Editor after creating your project

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Page Views Table
CREATE TABLE page_views (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id TEXT NOT NULL,
    page_url TEXT NOT NULL,
    page_title TEXT,
    referrer TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    ip_address TEXT,
    user_agent TEXT,
    screen_width INTEGER,
    screen_height INTEGER,
    viewport_width INTEGER,
    viewport_height INTEGER,
    country TEXT,
    city TEXT
);

-- Sessions Table
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id TEXT UNIQUE NOT NULL,
    first_visit TIMESTAMPTZ DEFAULT NOW(),
    last_visit TIMESTAMPTZ DEFAULT NOW(),
    page_views INTEGER DEFAULT 1,
    country TEXT,
    city TEXT,
    browser TEXT,
    os TEXT,
    device_type TEXT,
    ip_address TEXT
);

-- Events Table
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    event_data JSONB,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_page_views_timestamp ON page_views(timestamp);
CREATE INDEX idx_page_views_session ON page_views(session_id);
CREATE INDEX idx_sessions_first_visit ON sessions(first_visit);
CREATE INDEX idx_events_timestamp ON events(timestamp);
CREATE INDEX idx_events_type ON events(event_type);

-- =====================================================
-- Booking Operations (Availability + Reservations)
-- =====================================================
CREATE TABLE booking_slots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    capacity_social INTEGER DEFAULT 12,
    is_blocked BOOLEAN DEFAULT false,
    notes TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_booking_slots_unique ON booking_slots(date, start_time);
CREATE INDEX idx_booking_slots_date ON booking_slots(date);

CREATE TABLE booking_reservations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    booking_type TEXT NOT NULL CHECK (booking_type IN ('private', 'social')),
    guests INTEGER DEFAULT 1,
    name TEXT,
    email TEXT,
    notes TEXT,
    status TEXT DEFAULT 'confirmed',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_booking_reservations_date ON booking_reservations(date);
CREATE INDEX idx_booking_reservations_time ON booking_reservations(date, start_time);

-- Enable Row Level Security (RLS)
ALTER TABLE page_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_reservations ENABLE ROW LEVEL SECURITY;

-- Create policies to allow service role access
-- These policies allow your Netlify Functions (using service role key) to read/write

CREATE POLICY "Allow service role all access on page_views"
ON page_views
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow service role all access on sessions"
ON sessions
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow service role all access on events"
ON events
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow service role all access on booking_slots"
ON booking_slots
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow service role all access on booking_reservations"
ON booking_reservations
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Optional: Create a policy for anon key (for read-only dashboard access)
-- Uncomment if you want dashboard to use anon key instead of service key

-- CREATE POLICY "Allow anon read access on page_views"
-- ON page_views
-- FOR SELECT
-- TO anon
-- USING (true);

-- CREATE POLICY "Allow anon read access on sessions"
-- ON sessions
-- FOR SELECT
-- TO anon
-- USING (true);

-- CREATE POLICY "Allow anon read access on events"
-- ON events
-- FOR SELECT
-- TO anon
-- USING (true);

-- Function to clean old data (optional - for data retention)
CREATE OR REPLACE FUNCTION clean_old_analytics_data(days_to_keep INTEGER DEFAULT 180)
RETURNS void AS $$
BEGIN
    DELETE FROM page_views WHERE timestamp < NOW() - (days_to_keep || ' days')::INTERVAL;
    DELETE FROM events WHERE timestamp < NOW() - (days_to_keep || ' days')::INTERVAL;
    DELETE FROM sessions WHERE first_visit < NOW() - (days_to_keep || ' days')::INTERVAL;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- Grant execute permission to service role
GRANT EXECUTE ON FUNCTION clean_old_analytics_data TO service_role;

-- Create a view for easy dashboard queries
CREATE OR REPLACE VIEW analytics_overview
WITH (security_invoker = true) AS
SELECT
    COUNT(DISTINCT pv.session_id) as unique_visitors,
    COUNT(pv.id) as total_page_views,
    COUNT(DISTINCT pv.session_id) FILTER (
        WHERE pv.session_id IN (
            SELECT session_id FROM page_views GROUP BY session_id HAVING COUNT(*) = 1
        )
    ) as bounced_sessions,
    AVG(s.page_views) as avg_pages_per_session
FROM page_views pv
LEFT JOIN sessions s ON pv.session_id = s.session_id;

-- Grant select on view
GRANT SELECT ON analytics_overview TO service_role;
-- GRANT SELECT ON analytics_overview TO anon;  -- Uncomment for anon access

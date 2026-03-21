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

-- =====================================================
-- Atomic Booking Reservation (prevents race conditions)
-- =====================================================
CREATE OR REPLACE FUNCTION reserve_booking_slot(
    p_date DATE,
    p_start_time TIME,
    p_end_time TIME,
    p_booking_type TEXT,
    p_guests INTEGER,
    p_name TEXT,
    p_email TEXT,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
    v_capacity INTEGER;
    v_is_blocked BOOLEAN;
    v_booked_social INTEGER;
    v_has_private BOOLEAN;
BEGIN
    -- Advisory lock on date+time to handle empty-slot case
    -- Separator prevents ambiguous concatenation (e.g., date '2026-02-1' + time '709:00')
    PERFORM pg_advisory_xact_lock(hashtext(p_date::TEXT || '|' || p_start_time::TEXT));

    -- Check slot overrides (capacity, blocking)
    SELECT capacity_social, is_blocked
    INTO v_capacity, v_is_blocked
    FROM booking_slots
    WHERE date = p_date AND start_time = p_start_time
    FOR UPDATE;

    IF NOT FOUND THEN
        v_capacity := 12;
        v_is_blocked := false;
    END IF;

    IF v_is_blocked THEN
        RAISE EXCEPTION 'Slot is blocked' USING HINT = 'SLOT_BLOCKED';
    END IF;

    -- Count existing reservations (locked)
    -- Note: no status filter -- cancellations are hard deletes, so all rows are active
    SELECT
        COALESCE(SUM(CASE WHEN booking_type = 'social' THEN guests ELSE 0 END), 0),
        COALESCE(BOOL_OR(booking_type = 'private'), false)
    INTO v_booked_social, v_has_private
    FROM booking_reservations
    WHERE date = p_date AND start_time = p_start_time
    FOR UPDATE;

    -- Business rules
    IF v_has_private THEN
        RAISE EXCEPTION 'Slot has a private booking' USING HINT = 'SLOT_UNAVAILABLE';
    END IF;

    IF p_booking_type = 'private' AND v_booked_social > 0 THEN
        RAISE EXCEPTION 'Slot already has bookings' USING HINT = 'SLOT_HAS_BOOKINGS';
    END IF;

    IF p_booking_type = 'social' AND v_booked_social + p_guests > v_capacity THEN
        RAISE EXCEPTION 'Not enough capacity' USING HINT = 'CAPACITY_EXCEEDED';
    END IF;

    -- Insert (still inside transaction)
    INSERT INTO booking_reservations (
        date, start_time, end_time, booking_type,
        guests, name, email, notes, created_at
    ) VALUES (
        p_date, p_start_time, p_end_time, p_booking_type,
        p_guests, p_name, p_email, p_notes, NOW()
    );

    RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION reserve_booking_slot TO service_role;

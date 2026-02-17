// Netlify Function: Booking Availability (public)
// Endpoint: /.netlify/functions/booking-availability
// NOTE: Booking validation rules also exist in the reserve_booking_slot RPC function
// (supabase-schema.sql). Keep both in sync when rules change.

const { buildCorsHeaders, jsonResponse } = require('./lib/http');
const { getSupabaseClient } = require('./lib/supabase');
const {
  buildSlots,
  DEFAULT_SOCIAL_CAPACITY,
  isValidDate,
  normalizeTime
} = require('./lib/booking');

exports.handler = async (event) => {
  const headers = buildCorsHeaders(event, {
    allowAnyOrigin: true,
    allowHeaders: 'Content-Type',
    allowMethods: 'GET, OPTIONS'
  });

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return jsonResponse(405, headers, { error: 'Method not allowed' });
  }

  try {
    let supabase;
    try {
      supabase = getSupabaseClient();
    } catch {
      return jsonResponse(500, headers, { error: 'Missing Supabase environment variables' });
    }

    const params = event.queryStringParameters || {};
    const date = params.date;

    if (!date || !isValidDate(date)) {
      return jsonResponse(400, headers, { error: 'Invalid date' });
    }

    const slots = buildSlots();

    const { data: slotOverrides } = await supabase
      .from('booking_slots')
      .select('date, start_time, end_time, capacity_social, is_blocked')
      .eq('date', date);

    const { data: reservations } = await supabase
      .from('booking_reservations')
      .select('start_time, booking_type, guests')
      .eq('date', date);

    const overridesByTime = new Map();
    slotOverrides?.forEach((row) => {
      overridesByTime.set(normalizeTime(row.start_time), row);
    });

    const bookingStats = new Map();
    reservations?.forEach((row) => {
      const key = normalizeTime(row.start_time);
      if (!bookingStats.has(key)) {
        bookingStats.set(key, { booked_social: 0, has_private: false });
      }
      const stats = bookingStats.get(key);
      if (row.booking_type === 'private') {
        stats.has_private = true;
      } else {
        stats.booked_social += row.guests || 1;
      }
    });

    const responseSlots = slots.map((slot) => {
      const override = overridesByTime.get(slot.start);
      const stats = bookingStats.get(slot.start) || { booked_social: 0, has_private: false };
      const capacity = typeof override?.capacity_social === 'number' ? override.capacity_social : DEFAULT_SOCIAL_CAPACITY;
      const isBlocked = Boolean(override?.is_blocked);
      const hasPrivate = Boolean(stats.has_private);
      const bookedSocial = stats.booked_social || 0;

      let status = 'open';
      if (isBlocked) status = 'blocked';
      else if (hasPrivate) status = 'private';
      else if (bookedSocial >= capacity) status = 'full';

      const availableSocial = status === 'open' ? Math.max(capacity - bookedSocial, 0) : 0;

      return {
        start: slot.start,
        end: slot.end,
        capacity_social: capacity,
        booked_social: bookedSocial,
        available_social: availableSocial,
        has_private: hasPrivate,
        is_blocked: isBlocked,
        status
      };
    });

    return jsonResponse(200, headers, { date, slots: responseSlots });
  } catch (error) {
    console.error('Availability error:', error);
    return jsonResponse(500, headers, { error: 'Internal server error' });
  }
};

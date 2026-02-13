// Netlify Function: Booking Reserve (public)
// Endpoint: /.netlify/functions/booking-reserve

const { buildCorsHeaders, jsonResponse, parseJsonBody } = require('./lib/http');
const { getSupabaseClient } = require('./lib/supabase');
const {
  SLOT_DEFINITIONS,
  DEFAULT_SOCIAL_CAPACITY,
  SOCIAL_MAX_GUESTS,
  PRIVATE_MAX_GUESTS,
  MIN_ADVANCE_HOURS,
  isValidDate,
  isValidTime,
  normalizeTime
} = require('./lib/booking');

function isValidSlot(startTime, endTime) {
  const s = normalizeTime(startTime);
  const e = normalizeTime(endTime);
  return SLOT_DEFINITIONS.some((slot) => slot.start === s && slot.end === e);
}

exports.handler = async (event) => {
  const headers = buildCorsHeaders(event, {
    allowAnyOrigin: true,
    allowHeaders: 'Content-Type',
    allowMethods: 'POST, OPTIONS'
  });

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, headers, { error: 'Method not allowed' });
  }

  try {
    let supabase;
    try {
      supabase = getSupabaseClient();
    } catch {
      return jsonResponse(500, headers, { error: 'Missing Supabase environment variables' });
    }

    const { data: payload, error: parseError } = parseJsonBody(event.body);
    if (parseError) {
      return jsonResponse(400, headers, { error: parseError });
    }

    const { date, start_time, end_time, booking_type, notes } = payload;

    // --- Validate fields ---

    if (!date || !isValidDate(date)) {
      return jsonResponse(400, headers, { error: 'Invalid date' });
    }

    if (!start_time || !end_time || !isValidTime(start_time) || !isValidTime(end_time)) {
      return jsonResponse(400, headers, { error: 'Invalid time' });
    }

    if (!isValidSlot(start_time, end_time)) {
      return jsonResponse(400, headers, { error: 'Invalid time slot' });
    }

    if (booking_type !== 'social' && booking_type !== 'private') {
      return jsonResponse(400, headers, { error: 'Invalid booking type' });
    }

    const guests = parseInt(payload.guests || 1, 10);
    const maxGuests = booking_type === 'private' ? PRIVATE_MAX_GUESTS : SOCIAL_MAX_GUESTS;
    if (!Number.isFinite(guests) || guests < 1 || guests > maxGuests) {
      return jsonResponse(400, headers, { error: 'Invalid number of guests' });
    }

    const name = payload.name ? String(payload.name).trim().slice(0, 200) : '';
    if (!name) {
      return jsonResponse(400, headers, { error: 'Name is required' });
    }

    const email = payload.email ? String(payload.email).trim().toLowerCase() : '';
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return jsonResponse(400, headers, { error: 'Valid email is required' });
    }

    // Check minimum advance time
    const normStart = normalizeTime(start_time);
    const normEnd = normalizeTime(end_time);
    const slotStart = new Date(`${date}T${normStart}:00`);
    const earliest = new Date(Date.now() + MIN_ADVANCE_HOURS * 60 * 60 * 1000);
    if (slotStart < earliest) {
      return jsonResponse(409, headers, { error: 'Slot is no longer bookable' });
    }

    // --- Check availability ---

    const [slotResult, reservationResult] = await Promise.all([
      supabase
        .from('booking_slots')
        .select('capacity_social, is_blocked')
        .eq('date', date)
        .eq('start_time', normStart)
        .maybeSingle(),
      supabase
        .from('booking_reservations')
        .select('booking_type, guests')
        .eq('date', date)
        .eq('start_time', normStart)
    ]);

    const slotOverride = slotResult.data;
    const existingBookings = reservationResult.data || [];

    if (slotOverride?.is_blocked) {
      return jsonResponse(409, headers, { error: 'This time slot is not available' });
    }

    let bookedSocial = 0;
    let hasPrivate = false;
    existingBookings.forEach((row) => {
      if (row.booking_type === 'private') {
        hasPrivate = true;
      } else {
        bookedSocial += row.guests || 1;
      }
    });

    if (hasPrivate) {
      return jsonResponse(409, headers, { error: 'This time slot is not available' });
    }

    const capacity = typeof slotOverride?.capacity_social === 'number'
      ? slotOverride.capacity_social
      : DEFAULT_SOCIAL_CAPACITY;

    if (booking_type === 'private') {
      if (existingBookings.length > 0) {
        return jsonResponse(409, headers, { error: 'This time slot already has bookings' });
      }
    } else {
      if (bookedSocial + guests > capacity) {
        return jsonResponse(409, headers, { error: 'Not enough spots available' });
      }
    }

    // --- Insert reservation ---

    const { error: insertError } = await supabase
      .from('booking_reservations')
      .insert({
        date,
        start_time: normStart,
        end_time: normEnd,
        booking_type,
        guests,
        name,
        email,
        notes: notes ? String(notes).trim().slice(0, 1000) : null,
        created_at: new Date().toISOString()
      });

    if (insertError) throw insertError;

    return jsonResponse(200, headers, { success: true });
  } catch (error) {
    console.error('Booking reserve error:', error);
    return jsonResponse(500, headers, { error: 'Internal server error' });
  }
};

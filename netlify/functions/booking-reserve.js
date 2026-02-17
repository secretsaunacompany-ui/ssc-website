// Netlify Function: Booking Reserve (public)
// Endpoint: /.netlify/functions/booking-reserve

const { buildCorsHeaders, jsonResponse, parseJsonBody } = require('./lib/http');
const { getSupabaseClient } = require('./lib/supabase');
const {
  SLOT_DEFINITIONS,
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

    // --- Atomic reserve via RPC (prevents race conditions) ---

    const { data, error: rpcError } = await supabase.rpc('reserve_booking_slot', {
      p_date: date,
      p_start_time: normStart,
      p_end_time: normEnd,
      p_booking_type: booking_type,
      p_guests: guests,
      p_name: name,
      p_email: email,
      p_notes: notes ? String(notes).trim().slice(0, 1000) : null
    });

    if (rpcError) {
      // Match on hint field (set via RAISE EXCEPTION ... USING HINT) for reliable error mapping
      const hint = rpcError.hint || '';
      if (hint === 'SLOT_BLOCKED' || hint === 'SLOT_UNAVAILABLE') {
        return jsonResponse(409, headers, { error: 'This time slot is not available' });
      }
      if (hint === 'SLOT_HAS_BOOKINGS') {
        return jsonResponse(409, headers, { error: 'This time slot already has bookings' });
      }
      if (hint === 'CAPACITY_EXCEEDED') {
        return jsonResponse(409, headers, { error: 'Not enough spots available' });
      }
      throw rpcError;
    }

    return jsonResponse(200, headers, { success: true });
  } catch (error) {
    console.error('Booking reserve error:', error);
    return jsonResponse(500, headers, { error: 'Internal server error' });
  }
};

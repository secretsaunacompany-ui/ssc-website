// Netlify Function: Booking Reservation (public)
// Endpoint: /.netlify/functions/booking-reserve

const { buildCorsHeaders, jsonResponse, parseJsonBody } = require('./lib/http');
const { getSupabaseClient } = require('./lib/supabase');
const {
  DEFAULT_SOCIAL_CAPACITY,
  SLOT_DEFINITIONS,
  PRIVATE_MAX_GUESTS,
  SOCIAL_MAX_GUESTS,
  MIN_ADVANCE_HOURS,
  isValidDate,
  isValidTime
} = require('./lib/booking');

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
    const { data: payload, error } = parseJsonBody(event.body);
    if (error) {
      return jsonResponse(400, headers, { error });
    }

    let supabase;
    try {
      supabase = getSupabaseClient();
    } catch {
      return jsonResponse(500, headers, { error: 'Missing Supabase environment variables' });
    }
    const date = payload.date;
    const startTime = payload.start_time;
    const endTime = payload.end_time;
    const bookingType = payload.booking_type;
    const guests = parseInt(payload.guests || 1, 10);

    if (!isValidDate(date) || !isValidTime(startTime) || !isValidTime(endTime)) {
      return jsonResponse(400, headers, { error: 'Invalid booking time' });
    }

    const slotMatch = SLOT_DEFINITIONS.find((slot) => slot.start === startTime && slot.end === endTime);
    if (!slotMatch) {
      return jsonResponse(400, headers, { error: 'Invalid slot selection' });
    }

    if (!['private', 'social'].includes(bookingType)) {
      return jsonResponse(400, headers, { error: 'Invalid booking type' });
    }

    const slotDateTime = new Date(`${date}T${startTime}:00`);
    const earliestBookable = new Date(Date.now() + MIN_ADVANCE_HOURS * 60 * 60 * 1000);
    if (slotDateTime < earliestBookable) {
      return jsonResponse(409, headers, { error: 'Slot is no longer bookable' });
    }

    if (bookingType === 'private' && (guests < 1 || guests > PRIVATE_MAX_GUESTS)) {
      return jsonResponse(400, headers, { error: 'Invalid guest count' });
    }

    if (bookingType === 'social' && (guests < 1 || guests > SOCIAL_MAX_GUESTS)) {
      return jsonResponse(400, headers, { error: 'Invalid guest count' });
    }

    const { data: slotOverrides } = await supabase
      .from('booking_slots')
      .select('capacity_social, is_blocked')
      .eq('date', date)
      .eq('start_time', startTime)
      .single();

    const { data: reservations } = await supabase
      .from('booking_reservations')
      .select('booking_type, guests')
      .eq('date', date)
      .eq('start_time', startTime);

    const capacity = typeof slotOverrides?.capacity_social === 'number' ? slotOverrides.capacity_social : DEFAULT_SOCIAL_CAPACITY;
    const isBlocked = Boolean(slotOverrides?.is_blocked);

    let bookedSocial = 0;
    let hasPrivate = false;

    reservations?.forEach((row) => {
      if (row.booking_type === 'private') {
        hasPrivate = true;
      } else {
        bookedSocial += row.guests || 1;
      }
    });

    if (isBlocked) {
      return jsonResponse(409, headers, { error: 'Slot is blocked' });
    }

    if (hasPrivate) {
      return jsonResponse(409, headers, { error: 'Slot already booked' });
    }

    if (bookingType === 'private' && bookedSocial > 0) {
      return jsonResponse(409, headers, { error: 'Slot already has social bookings' });
    }

    if (bookingType === 'social' && bookedSocial + guests > capacity) {
      return jsonResponse(409, headers, { error: 'Not enough spots available' });
    }

    // Validate and sanitize contact fields
    const name = payload.name ? String(payload.name).trim().slice(0, 200) : null;
    const email = payload.email ? String(payload.email).trim() : null;
    const phone = payload.phone ? String(payload.phone).replace(/[^\d+\-() ]/g, '').trim() : null;

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return jsonResponse(400, headers, { error: 'Invalid email address' });
    }

    if (phone) {
      const digits = phone.replace(/\D/g, '');
      if (digits.length < 7 || digits.length > 15) {
        return jsonResponse(400, headers, { error: 'Invalid phone number' });
      }
    }

    const { error: insertError } = await supabase
      .from('booking_reservations')
      .insert({
        date,
        start_time: startTime,
        end_time: endTime,
        booking_type: bookingType,
        guests,
        name,
        email,
        notes: payload.notes ? String(payload.notes).trim().slice(0, 1000) : null,
        status: 'confirmed'
      });

    if (insertError) throw insertError;

    return jsonResponse(200, headers, { success: true });
  } catch (error) {
    console.error('Booking reserve error:', error);
    return jsonResponse(500, headers, { error: 'Internal server error' });
  }
};

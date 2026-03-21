// Netlify Function: Booking Ops (admin)
// Endpoint: /.netlify/functions/booking-admin

const { buildCorsHeaders, jsonResponse, parseJsonBody } = require('./lib/http');
const { getSupabaseClient } = require('./lib/supabase');
const {
  SLOT_DEFINITIONS,
  DEFAULT_SOCIAL_CAPACITY,
  buildSlots,
  isValidDate,
  normalizeTime
} = require('./lib/booking');
let supabase;

function addDays(dateStr, offset) {
  const date = new Date(`${dateStr}T00:00:00`);
  date.setDate(date.getDate() + offset);
  return date.toISOString().slice(0, 10);
}

function isAuthorized(event) {
  const token = event.headers['x-admin-token'] || event.headers['X-Admin-Token'];
  const expected = process.env.OPS_ADMIN_TOKEN;
  if (!expected) return false;
  return token && token === expected;
}

exports.handler = async (event) => {
  const headers = buildCorsHeaders(event, {
    allowAnyOrigin: true,
    allowHeaders: 'Content-Type, X-Admin-Token',
    allowMethods: 'GET, POST, OPTIONS'
  });

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    supabase = getSupabaseClient();
  } catch {
    return jsonResponse(500, headers, { error: 'Missing Supabase environment variables' });
  }

  if (!isAuthorized(event)) {
    return jsonResponse(401, headers, { error: 'Unauthorized' });
  }

  try {
    if (event.httpMethod === 'GET') {
      const params = event.queryStringParameters || {};
      const action = params.action || 'sessions';
      const date = params.date && isValidDate(params.date) ? params.date : new Date().toISOString().slice(0, 10);
      const days = Math.min(parseInt(params.days || '1', 10), 31);

      const dateList = [];
      for (let i = 0; i < days; i++) {
        dateList.push(addDays(date, i));
      }

      if (action === 'reservations') {
        const { data: reservations } = await supabase
          .from('booking_reservations')
          .select('id, date, start_time, end_time, booking_type, guests, name, email, notes, created_at')
          .in('date', dateList)
          .order('date', { ascending: true })
          .order('start_time', { ascending: true });

        return jsonResponse(200, headers, { date, days, reservations: reservations || [] });
      }

      const slots = buildSlots();

      const { data: slotOverrides } = await supabase
        .from('booking_slots')
        .select('date, start_time, end_time, capacity_social, is_blocked, notes')
        .in('date', dateList);

      const { data: reservations } = await supabase
        .from('booking_reservations')
        .select('date, start_time, booking_type, guests')
        .in('date', dateList);

      const overridesMap = new Map();
      slotOverrides?.forEach((row) => {
        overridesMap.set(`${row.date}_${normalizeTime(row.start_time)}`, row);
      });

      const bookingStats = new Map();
      reservations?.forEach((row) => {
        const key = `${row.date}_${normalizeTime(row.start_time)}`;
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

      const sessions = [];
      dateList.forEach((day) => {
        slots.forEach((slot) => {
          const override = overridesMap.get(`${day}_${slot.start}`);
          const stats = bookingStats.get(`${day}_${slot.start}`) || { booked_social: 0, has_private: false };
          const capacity = typeof override?.capacity_social === 'number' ? override.capacity_social : DEFAULT_SOCIAL_CAPACITY;
          const isBlocked = Boolean(override?.is_blocked);
          const hasPrivate = Boolean(stats.has_private);
          const bookedSocial = stats.booked_social || 0;

          let status = 'open';
          if (isBlocked) status = 'blocked';
          else if (hasPrivate) status = 'private';
          else if (bookedSocial >= capacity) status = 'full';

          sessions.push({
            date: day,
            start: slot.start,
            end: slot.end,
            capacity_social: capacity,
            booked_social: bookedSocial,
            available_social: status === 'open' ? Math.max(capacity - bookedSocial, 0) : 0,
            has_private: hasPrivate,
            is_blocked: isBlocked,
            status,
            notes: override?.notes || ''
          });
        });
      });

      return jsonResponse(200, headers, { date, days, sessions });
    }

    if (event.httpMethod === 'POST') {
      const { data: payload, error } = parseJsonBody(event.body);
      if (error) {
        return jsonResponse(400, headers, { error });
      }
      const action = payload.action;
      if (!action) {
        return jsonResponse(400, headers, { error: 'Invalid action' });
      }

      const date = payload.date;
      const startTime = payload.start_time;
      const endTime = payload.end_time;

      if (['update_slot', 'clear_slot', 'block_day', 'unblock_day', 'reset_day'].includes(action) && !isValidDate(date)) {
        return jsonResponse(400, headers, { error: 'Invalid date' });
      }

      if (action === 'update_slot') {
        if (!startTime || !endTime) {
          return jsonResponse(400, headers, { error: 'Invalid slot data' });
        }

        const capacityRaw = parseInt(payload.capacity_social ?? DEFAULT_SOCIAL_CAPACITY, 10);
        const capacity = Number.isFinite(capacityRaw) && capacityRaw >= 0 ? capacityRaw : DEFAULT_SOCIAL_CAPACITY;
        const isBlocked = Boolean(payload.is_blocked);

        const { error } = await supabase
          .from('booking_slots')
          .upsert({
            date,
            start_time: startTime,
            end_time: endTime,
            capacity_social: capacity,
            is_blocked: isBlocked,
            notes: payload.notes || null,
            updated_at: new Date().toISOString()
          }, { onConflict: 'date,start_time' });

        if (error) throw error;
        return jsonResponse(200, headers, { success: true });
      }

      if (action === 'clear_slot') {
        if (!startTime) {
          return jsonResponse(400, headers, { error: 'Invalid slot data' });
        }

        const { error } = await supabase
          .from('booking_reservations')
          .delete()
          .eq('date', date)
          .eq('start_time', startTime);

        if (error) throw error;
        return jsonResponse(200, headers, { success: true });
      }

      if (action === 'block_day' || action === 'unblock_day' || action === 'reset_day') {
        const isBlocked = action === 'block_day';
        const capacity = DEFAULT_SOCIAL_CAPACITY;
        const updates = SLOT_DEFINITIONS.map((slot) => ({
          date,
          start_time: slot.start,
          end_time: slot.end,
          capacity_social: capacity,
          is_blocked: isBlocked,
          updated_at: new Date().toISOString()
        }));

        const { error } = await supabase
          .from('booking_slots')
          .upsert(updates, { onConflict: 'date,start_time' });

        if (error) throw error;
        return jsonResponse(200, headers, { success: true });
      }

      if (action === 'cancel_reservation') {
        const { reservation_id } = payload;
        if (!reservation_id) {
          return jsonResponse(400, headers, { error: 'Missing reservation_id' });
        }
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(reservation_id)) {
          return jsonResponse(400, headers, { error: 'Invalid reservation_id format' });
        }
        const { data, error } = await supabase
          .from('booking_reservations')
          .delete()
          .eq('id', reservation_id)
          .select();
        if (error) throw error;
        if (!data || data.length === 0) {
          return jsonResponse(404, headers, { error: 'Reservation not found' });
        }
        return jsonResponse(200, headers, { success: true });
      }

      return jsonResponse(400, headers, { error: 'Invalid action' });
    }

    return jsonResponse(405, headers, { error: 'Method not allowed' });
  } catch (error) {
    console.error('Booking admin error:', error);
    return jsonResponse(500, headers, { error: 'Internal server error' });
  }
};

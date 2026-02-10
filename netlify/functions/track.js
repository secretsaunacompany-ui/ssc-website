// Netlify Function: Track Page Views and Events
// Endpoint: /.netlify/functions/track

const { buildCorsHeaders, jsonResponse, parseJsonBody } = require('./lib/http');
const { getSupabaseClient } = require('./lib/supabase');

// =====================================================
// SECURITY: Rate Limiting
// =====================================================
// Simple in-memory rate limiter (resets on function cold start)
// For production, use Redis or a database-backed solution
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 100; // Max requests per window per IP

function isRateLimited(ip) {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record) {
    rateLimitMap.set(ip, { count: 1, windowStart: now });
    return false;
  }

  // Reset window if expired
  if (now - record.windowStart > RATE_LIMIT_WINDOW) {
    rateLimitMap.set(ip, { count: 1, windowStart: now });
    return false;
  }

  // Increment count
  record.count++;

  if (record.count > RATE_LIMIT_MAX_REQUESTS) {
    return true;
  }

  return false;
}

// Clean up old entries periodically (prevent memory leak)
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of rateLimitMap.entries()) {
    if (now - record.windowStart > RATE_LIMIT_WINDOW * 2) {
      rateLimitMap.delete(ip);
    }
  }
}, RATE_LIMIT_WINDOW);

// =====================================================
// SECURITY: Input Validation & Sanitization
// =====================================================
function sanitizeString(str, maxLength = 500) {
  if (typeof str !== 'string') return '';
  // Remove potentially dangerous characters and limit length
  return str.slice(0, maxLength).replace(/<[^>]*>/g, '').trim();
}

function validateUrl(url) {
  if (typeof url !== 'string') return false;
  try {
    new URL(url);
    return url.length <= 2000;
  } catch {
    return false;
  }
}

function validateSessionId(sessionId) {
  if (typeof sessionId !== 'string') return false;
  // Session IDs should match our expected format
  return /^sess_[a-zA-Z0-9_-]{10,50}$/.test(sessionId);
}

function validateInteger(value, min = 0, max = 10000) {
  const num = parseInt(value);
  return !isNaN(num) && num >= min && num <= max;
}

// Parse user agent to extract browser and OS
function parseUserAgent(userAgent) {
  let browser = 'Unknown';
  let os = 'Unknown';
  let deviceType = 'Desktop';

  // Detect browser
  if (/Firefox/i.test(userAgent)) browser = 'Firefox';
  else if (/Chrome/i.test(userAgent)) browser = 'Chrome';
  else if (/Safari/i.test(userAgent) && !/Chrome/i.test(userAgent)) browser = 'Safari';
  else if (/Edge/i.test(userAgent)) browser = 'Edge';
  else if (/MSIE|Trident/i.test(userAgent)) browser = 'Internet Explorer';

  // Detect OS
  if (/Windows/i.test(userAgent)) os = 'Windows';
  else if (/Mac OS X/i.test(userAgent)) os = 'macOS';
  else if (/Linux/i.test(userAgent)) os = 'Linux';
  else if (/Android/i.test(userAgent)) os = 'Android';
  else if (/iOS|iPhone|iPad/i.test(userAgent)) os = 'iOS';

  // Detect device type
  if (/Mobile|Android|iPhone/i.test(userAgent)) deviceType = 'Mobile';
  else if (/iPad|Tablet/i.test(userAgent)) deviceType = 'Tablet';

  return { browser, os, deviceType };
}

// Get client IP address
function getClientIP(headers) {
  return headers['x-forwarded-for']?.split(',')[0] ||
         headers['client-ip'] ||
         'unknown';
}

exports.handler = async (event, context) => {
  // SECURITY: Restrict CORS to your domain only
  const allowedOrigins = [
    'https://secretsaunacompany.com',
    'https://www.secretsaunacompany.com',
    'http://localhost:8888',
    'http://localhost:3000'
  ];

  const headers = buildCorsHeaders(event, {
    allowedOrigins,
    allowHeaders: 'Content-Type',
    allowMethods: 'POST, OPTIONS',
    allowCredentials: true
  });

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // Only accept POST
  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, headers, { error: 'Method not allowed' });
  }

  // SECURITY: Rate limiting check
  const ip = getClientIP(event.headers);
  if (isRateLimited(ip)) {
    return jsonResponse(429, headers, { error: 'Too many requests. Please try again later.' });
  }

  try {
    const { data, error } = parseJsonBody(event.body);
    if (error) {
      return jsonResponse(400, headers, { error });
    }

    let supabase;
    try {
      supabase = getSupabaseClient();
    } catch {
      return jsonResponse(500, headers, { error: 'Missing Supabase environment variables' });
    }
    const userAgent = sanitizeString(event.headers['user-agent'] || '', 500);
    const uaInfo = parseUserAgent(userAgent);

    if (data.type === 'pageview') {
      // Track page view
      const { sessionId, pageUrl, pageTitle, referrer, screenWidth, screenHeight, viewportWidth, viewportHeight } = data;

      // SECURITY: Validate all inputs
      if (!validateSessionId(sessionId)) {
        return jsonResponse(400, headers, { error: 'Invalid session ID' });
      }

      if (!validateUrl(pageUrl)) {
        return jsonResponse(400, headers, { error: 'Invalid page URL' });
      }

      // Sanitize string inputs
      const cleanPageTitle = sanitizeString(pageTitle, 200);
      const cleanReferrer = referrer ? sanitizeString(referrer, 500) : null;

      // Validate numeric inputs
      const cleanScreenWidth = validateInteger(screenWidth, 0, 10000) ? parseInt(screenWidth) : null;
      const cleanScreenHeight = validateInteger(screenHeight, 0, 10000) ? parseInt(screenHeight) : null;
      const cleanViewportWidth = validateInteger(viewportWidth, 0, 10000) ? parseInt(viewportWidth) : null;
      const cleanViewportHeight = validateInteger(viewportHeight, 0, 10000) ? parseInt(viewportHeight) : null;

      // Insert or update session
      const { data: existingSession } = await supabase
        .from('sessions')
        .select('id, page_views')
        .eq('session_id', sessionId)
        .single();

      if (existingSession) {
        // Update existing session
        await supabase
          .from('sessions')
          .update({
            last_visit: new Date().toISOString(),
            page_views: existingSession.page_views + 1
          })
          .eq('session_id', sessionId);
      } else {
        // Create new session
        await supabase
          .from('sessions')
          .insert({
            session_id: sessionId,
            ip_address: ip,
            browser: uaInfo.browser,
            os: uaInfo.os,
            device_type: uaInfo.deviceType,
            page_views: 1
          });
      }

      // Insert page view with sanitized values
      const { error: pageViewError } = await supabase
        .from('page_views')
        .insert({
          session_id: sessionId,
          page_url: pageUrl,
          page_title: cleanPageTitle,
          referrer: cleanReferrer,
          ip_address: ip,
          user_agent: userAgent,
          screen_width: cleanScreenWidth,
          screen_height: cleanScreenHeight,
          viewport_width: cleanViewportWidth,
          viewport_height: cleanViewportHeight
        });

      if (pageViewError) throw pageViewError;

      return jsonResponse(200, headers, { success: true });

    } else if (data.type === 'event') {
      // Track custom event
      const { sessionId, eventType, eventData } = data;

      // SECURITY: Validate session ID
      if (!validateSessionId(sessionId)) {
        return jsonResponse(400, headers, { error: 'Invalid session ID' });
      }

      // Sanitize event type
      const cleanEventType = sanitizeString(eventType, 100);
      if (!cleanEventType) {
        return jsonResponse(400, headers, { error: 'Invalid event type' });
      }

      // Sanitize event data (limit size and depth)
      let cleanEventData = {};
      if (eventData && typeof eventData === 'object') {
        const jsonStr = JSON.stringify(eventData);
        if (jsonStr.length <= 5000) { // Limit event data size
          cleanEventData = eventData;
        }
      }

      const { error: eventError } = await supabase
        .from('events')
        .insert({
          session_id: sessionId,
          event_type: cleanEventType,
          event_data: cleanEventData
        });

      if (eventError) throw eventError;

      return jsonResponse(200, headers, { success: true });

    } else {
      return jsonResponse(400, headers, { error: 'Invalid tracking type' });
    }

  } catch (error) {
    // SECURITY: Log error server-side but don't expose details to client
    console.error('Tracking error:', error);
    return jsonResponse(500, headers, { error: 'Internal server error' });
  }
};

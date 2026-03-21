// Netlify Function: Analytics Data Retrieval
// Endpoint: /.netlify/functions/analytics

const { buildCorsHeaders, jsonResponse } = require('./lib/http');
const { getSupabaseClient } = require('./lib/supabase');

let supabase;

// Helper to get date range
function getDateRange(days) {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  return { startDate: startDate.toISOString(), endDate: endDate.toISOString() };
}

// Get overview statistics
async function getOverview(days = 30) {
  const { startDate } = getDateRange(days);

  // Total page views
  const { count: totalPageViews } = await supabase
    .from('page_views')
    .select('*', { count: 'exact', head: true })
    .gte('timestamp', startDate);

  // Unique visitors
  const { data: uniqueVisitorsData } = await supabase
    .from('page_views')
    .select('session_id')
    .gte('timestamp', startDate);

  const uniqueVisitors = new Set(uniqueVisitorsData?.map(v => v.session_id) || []).size;

  // Get sessions for bounce rate and avg duration
  const { data: sessions } = await supabase
    .from('sessions')
    .select('page_views, first_visit, last_visit')
    .gte('first_visit', startDate);

  // Calculate bounce rate
  const bouncedSessions = sessions?.filter(s => s.page_views === 1).length || 0;
  const bounceRate = sessions?.length > 0 ? Math.round((bouncedSessions / sessions.length) * 100) : 0;

  // Calculate average session duration
  const durations = sessions?.map(s => {
    const start = new Date(s.first_visit);
    const end = new Date(s.last_visit);
    return Math.floor((end - start) / 1000); // seconds
  }).filter(d => d > 0) || [];

  const avgDuration = durations.length > 0
    ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
    : 0;

  return {
    totalPageViews: totalPageViews || 0,
    uniqueVisitors,
    avgSessionDuration: avgDuration,
    bounceRate
  };
}

// Get traffic by date
async function getTrafficByDate(days = 30) {
  const { startDate } = getDateRange(days);

  const { data, error } = await supabase
    .rpc('get_traffic_by_date', {
      start_date: startDate
    });

  if (error) {
    // Fallback if custom function doesn't exist
    const { data: pageViews } = await supabase
      .from('page_views')
      .select('timestamp, session_id')
      .gte('timestamp', startDate)
      .order('timestamp', { ascending: true });

    // Group by date
    const groupedData = {};
    pageViews?.forEach(pv => {
      const date = pv.timestamp.split('T')[0];
      if (!groupedData[date]) {
        groupedData[date] = { date, page_views: 0, unique_visitors: new Set() };
      }
      groupedData[date].page_views++;
      groupedData[date].unique_visitors.add(pv.session_id);
    });

    return Object.values(groupedData).map(d => ({
      date: d.date,
      page_views: d.page_views,
      unique_visitors: d.unique_visitors.size
    }));
  }

  return data || [];
}

// Get top pages
async function getTopPages(days = 30, limit = 10) {
  const { startDate } = getDateRange(days);

  const { data } = await supabase
    .from('page_views')
    .select('page_url, page_title, session_id')
    .gte('timestamp', startDate);

  // Group and count
  const pages = {};
  data?.forEach(pv => {
    const key = pv.page_url;
    if (!pages[key]) {
      pages[key] = {
        page_url: pv.page_url,
        page_title: pv.page_title || 'Untitled',
        views: 0,
        unique_visitors: new Set()
      };
    }
    pages[key].views++;
    pages[key].unique_visitors.add(pv.session_id);
  });

  return Object.values(pages)
    .map(p => ({
      page_url: p.page_url,
      page_title: p.page_title,
      views: p.views,
      unique_visitors: p.unique_visitors.size
    }))
    .sort((a, b) => b.views - a.views)
    .slice(0, limit);
}

// Get referrers
async function getReferrers(days = 30, limit = 10) {
  const { startDate } = getDateRange(days);

  const { data } = await supabase
    .from('page_views')
    .select('referrer')
    .gte('timestamp', startDate)
    .not('referrer', 'is', null);

  // Categorize referrers
  const sources = {};
  data?.forEach(pv => {
    let source = 'Direct';
    const ref = pv.referrer?.toLowerCase() || '';

    if (ref.includes('google')) source = 'Google';
    else if (ref.includes('facebook')) source = 'Facebook';
    else if (ref.includes('instagram')) source = 'Instagram';
    else if (ref.includes('twitter') || ref.includes('t.co')) source = 'Twitter';
    else if (ref.includes('linkedin')) source = 'LinkedIn';
    else if (ref) source = pv.referrer;

    sources[source] = (sources[source] || 0) + 1;
  });

  return Object.entries(sources)
    .map(([source, visits]) => ({ source, visits }))
    .sort((a, b) => b.visits - a.visits)
    .slice(0, limit);
}

// Get device stats
async function getDeviceStats(days = 30) {
  const { startDate } = getDateRange(days);

  const { data } = await supabase
    .from('sessions')
    .select('device_type')
    .gte('first_visit', startDate);

  const devices = {};
  data?.forEach(s => {
    const type = s.device_type || 'Unknown';
    devices[type] = (devices[type] || 0) + 1;
  });

  return Object.entries(devices).map(([device_type, sessions]) => ({
    device_type,
    sessions
  }));
}

// Get browser stats
async function getBrowserStats(days = 30) {
  const { startDate } = getDateRange(days);

  const { data } = await supabase
    .from('sessions')
    .select('browser')
    .gte('first_visit', startDate);

  const browsers = {};
  data?.forEach(s => {
    const browser = s.browser || 'Unknown';
    browsers[browser] = (browsers[browser] || 0) + 1;
  });

  return Object.entries(browsers)
    .map(([browser, sessions]) => ({ browser, sessions }))
    .sort((a, b) => b.sessions - a.sessions);
}

// Get OS stats
async function getOSStats(days = 30) {
  const { startDate } = getDateRange(days);

  const { data } = await supabase
    .from('sessions')
    .select('os')
    .gte('first_visit', startDate);

  const systems = {};
  data?.forEach(s => {
    const os = s.os || 'Unknown';
    systems[os] = (systems[os] || 0) + 1;
  });

  return Object.entries(systems)
    .map(([os, sessions]) => ({ os, sessions }))
    .sort((a, b) => b.sessions - a.sessions);
}

// Get real-time visitors
async function getRealTimeVisitors() {
  const thirtyMinsAgo = new Date();
  thirtyMinsAgo.setMinutes(thirtyMinsAgo.getMinutes() - 30);

  const { data } = await supabase
    .from('page_views')
    .select('session_id')
    .gte('timestamp', thirtyMinsAgo.toISOString());

  const uniqueSessions = new Set(data?.map(v => v.session_id) || []);
  return uniqueSessions.size;
}

// Main handler
exports.handler = async (event, context) => {
  // SECURITY: Restrict CORS to your domain only
  // Change 'https://yourdomain.com' to your actual domain
  const allowedOrigins = [
    'https://secretsaunacompany.ca',
    'https://www.secretsaunacompany.ca',
    'http://localhost:8888', // For local development with Netlify CLI
    'http://localhost:3000'  // For local development
  ];

  const headers = buildCorsHeaders(event, {
    allowedOrigins,
    allowHeaders: 'Content-Type, Authorization',
    allowMethods: 'GET, OPTIONS',
    allowCredentials: true
  });

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return jsonResponse(405, headers, { error: 'Method not allowed' });
  }

  try {
    try {
      supabase = getSupabaseClient();
    } catch {
      return jsonResponse(500, headers, { error: 'Missing Supabase environment variables' });
    }

    const params = event.queryStringParameters || {};
    const action = params.action || 'overview';
    const days = Math.min(Math.max(parseInt(params.days || '30', 10) || 30, 1), 365);
    const limit = Math.min(Math.max(parseInt(params.limit || '10', 10) || 10, 1), 100);

    let result;

    switch (action) {
      case 'overview':
        result = await getOverview(days);
        break;
      case 'traffic':
        result = await getTrafficByDate(days);
        break;
      case 'pages':
        result = await getTopPages(days, limit);
        break;
      case 'referrers':
        result = await getReferrers(days, limit);
        break;
      case 'devices':
        result = await getDeviceStats(days);
        break;
      case 'browsers':
        result = await getBrowserStats(days);
        break;
      case 'os':
        result = await getOSStats(days);
        break;
      case 'realtime':
        result = { count: await getRealTimeVisitors() };
        break;
      default:
        return jsonResponse(400, headers, { error: 'Invalid action' });
    }

    return jsonResponse(200, headers, result);

  } catch (error) {
    // SECURITY: Log error server-side but don't expose details to client
    console.error('Analytics error:', error);
    return jsonResponse(500, headers, { error: 'Internal server error' });
  }
};

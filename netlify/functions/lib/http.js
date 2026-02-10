const DEFAULT_ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : [
    'https://secretsaunacompany.com',
    'https://www.secretsaunacompany.com'
  ];

function getAllowedOrigin(event, allowedOrigins = DEFAULT_ALLOWED_ORIGINS) {
  const origin = event.headers?.origin || event.headers?.Origin || '';
  return allowedOrigins.includes(origin) ? origin : allowedOrigins[0];
}

function buildCorsHeaders(event, options = {}) {
  const {
    allowedOrigins = DEFAULT_ALLOWED_ORIGINS,
    allowAnyOrigin = false,
    allowHeaders = 'Content-Type',
    allowMethods = 'GET, OPTIONS',
    allowCredentials = false,
    contentType = 'application/json'
  } = options;

  const headers = {
    'Access-Control-Allow-Origin': allowAnyOrigin ? '*' : getAllowedOrigin(event, allowedOrigins),
    'Access-Control-Allow-Headers': allowHeaders,
    'Access-Control-Allow-Methods': allowMethods,
    'Content-Type': contentType
  };

  if (allowCredentials && !allowAnyOrigin) {
    headers['Access-Control-Allow-Credentials'] = 'true';
  }

  return headers;
}

function jsonResponse(statusCode, headers, payload) {
  return {
    statusCode,
    headers,
    body: JSON.stringify(payload)
  };
}

function parseJsonBody(body) {
  if (!body) {
    return { data: null, error: 'Missing request body' };
  }

  try {
    return { data: JSON.parse(body), error: null };
  } catch {
    return { data: null, error: 'Invalid JSON payload' };
  }
}

module.exports = {
  DEFAULT_ALLOWED_ORIGINS,
  buildCorsHeaders,
  jsonResponse,
  parseJsonBody
};

// Netlify Function: AI Advisor
// Endpoint: POST /.netlify/functions/advisor
// Handles all advisor types via the 'type' parameter

const Anthropic = require('@anthropic-ai/sdk');
const { buildCorsHeaders, jsonResponse, parseJsonBody } = require('./lib/http');
const { checkRateLimit, getClientIp } = require('./lib/rate-limit');
const { getPromptConfig } = require('./prompts/index');

// Dark front-end means dark back-end. The advisor UI is feature-flagged in
// site.json; until 2026-08-06 the flag governed only the pages, leaving this
// endpoint publicly POST-able as an unauthenticated LLM proxy while nothing
// on the site could reach it. The same flag now gates the handler. The require
// is bundled by Netlify's zisi (probed 2026-08-06: site.json lands in the zip;
// prompts/faq.js has crossed the same boundary in production for months).
// ADVISOR_ENABLED_OVERRIDE exists for scripts/functions-gate.test.mjs, which
// must exercise both states without editing site.json; unset in production.
const SITE = require('../../src/_data/site.json');
function advisorEnabled() {
  const override = process.env.ADVISOR_ENABLED_OVERRIDE;
  if (override === 'true') return true;
  if (override === 'false') return false;
  return SITE.features && SITE.features.advisor === true;
}

const RATE_LIMIT_MAX = 10;       // requests per window per IP
const RATE_LIMIT_WINDOW = 60000; // 1 minute

const ALLOWED_ORIGINS = [
  'https://secretsaunacompany.ca',
  'https://www.secretsaunacompany.ca',
  'http://localhost:8888',
  'http://localhost:3000'
];

function sanitizeMessage(str, maxLength = 1000) {
  if (typeof str !== 'string') return '';
  return str.slice(0, maxLength).replace(/<[^>]*>/g, '').trim();
}

function validateHistory(history) {
  if (!Array.isArray(history)) return [];
  return history
    .filter(msg =>
      msg &&
      typeof msg.role === 'string' &&
      typeof msg.content === 'string' &&
      ['user', 'assistant'].includes(msg.role)
    )
    .slice(-12) // Keep last 6 exchanges (12 messages)
    .map(msg => ({
      role: msg.role,
      content: sanitizeMessage(msg.content, 2000)
    }));
}

exports.handler = async (event) => {
  const headers = buildCorsHeaders(event, {
    allowedOrigins: ALLOWED_ORIGINS,
    allowHeaders: 'Content-Type',
    allowMethods: 'POST, OPTIONS',
    contentType: 'application/json'
  });

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // Only accept POST
  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, headers, { error: 'Method not allowed' });
  }

  // Feature gate — before parsing, before rate-limit state, before the client.
  if (!advisorEnabled()) {
    return jsonResponse(503, headers, { error: 'advisor disabled' });
  }

  // Rate limiting
  const ip = getClientIp(event.headers);
  const rl = checkRateLimit(`advisor:${ip}`, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW);
  if (!rl.allowed) {
    return jsonResponse(429, {
      ...headers,
      'Retry-After': String(rl.retryAfterSec)
    }, { error: 'Too many requests. Please try again shortly.' });
  }

  // Parse body
  const { data, error } = parseJsonBody(event.body);
  if (error) {
    return jsonResponse(400, headers, { error });
  }

  const { type, message, history } = data;

  // Validate type
  if (!type || typeof type !== 'string') {
    return jsonResponse(400, headers, { error: 'Missing advisor type' });
  }

  // Load prompt config
  const promptConfig = getPromptConfig(type);
  if (!promptConfig) {
    return jsonResponse(400, headers, { error: `Unknown advisor type: ${type}` });
  }

  // Validate message
  const cleanMessage = sanitizeMessage(message);
  if (!cleanMessage) {
    return jsonResponse(400, headers, { error: 'Message is required' });
  }

  // Validate and clean history
  const cleanHistory = validateHistory(history);

  // Build messages array
  const messages = [
    ...cleanHistory,
    { role: 'user', content: cleanMessage }
  ];

  // Check API key
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('ANTHROPIC_API_KEY not set');
    return jsonResponse(500, headers, { error: 'Service temporarily unavailable' });
  }

  try {
    const anthropic = new Anthropic({ apiKey });

    const response = await anthropic.messages.create({
      model: promptConfig.model || 'claude-sonnet-4-6',
      max_tokens: promptConfig.maxTokens || 1024,
      temperature: 0.3,
      system: promptConfig.system,
      messages: messages
    });

    // Extract text from response
    const text = response.content
      .filter(block => block.type === 'text')
      .map(block => block.text)
      .join('');

    return jsonResponse(200, headers, {
      response: text,
      type: type
    });

  } catch (err) {
    console.error('Anthropic API error:', err.message);

    if (err.status === 429) {
      return jsonResponse(503, headers, {
        error: 'Service is busy. Please try again in a moment.'
      });
    }

    return jsonResponse(500, headers, {
      error: 'Something went wrong. Please try again or contact us directly.'
    });
  }
};

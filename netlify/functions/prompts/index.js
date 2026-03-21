/**
 * Prompt registry: maps advisor type to system prompt + configuration.
 * Each prompt module exports: { system, model, maxTokens }
 */

const VALID_TYPES = ['product', 'commercial', 'faq', 'inquiry', 'process', 'care'];

function getPromptConfig(type) {
  if (!VALID_TYPES.includes(type)) {
    return null;
  }

  try {
    return require(`./${type}`);
  } catch (e) {
    console.error(`Prompt module not found for type: ${type}`, e.message);
    return null;
  }
}

module.exports = { getPromptConfig, VALID_TYPES };

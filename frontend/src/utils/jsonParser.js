/**
 * jsonParser.js
 * Robust JSON sanitizer utility for Vision AI API responses.
 * Vision models frequently wrap JSON output in Markdown fences (```json...```)
 * which causes JSON.parse() to throw SyntaxError and fail silently.
 */

/**
 * Strips Markdown code fences, trims stray conversational text,
 * and parses the extracted JSON string.
 *
 * @param {string} rawText - Raw text response from a Vision AI model
 * @returns {Object} Parsed JSON object
 * @throws {Error} If the text is empty or contains no parseable JSON
 */
export const sanitizeAndParseJSON = (rawText) => {
  if (!rawText || typeof rawText !== 'string') {
    throw new Error('Empty or non-string response received from Vision API');
  }

  let cleaned = rawText.trim();

  // Strip ```json ... ``` or ``` ... ``` code block fences
  if (cleaned.startsWith('`')) {
    cleaned = cleaned
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```\s*$/, '');
  }

  // Strip any remaining single backtick wrapping (edge case)
  if (cleaned.startsWith('`') && cleaned.endsWith('`')) {
    cleaned = cleaned.slice(1, -1).trim();
  }

  // Find first '{' and last '}' to strip stray conversational text
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');

  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  } else {
    // Try array-style JSON as fallback: first '[' to last ']'
    const firstBracket = cleaned.indexOf('[');
    const lastBracket = cleaned.lastIndexOf(']');
    if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
      cleaned = cleaned.substring(firstBracket, lastBracket + 1);
    } else {
      throw new Error('No valid JSON object or array found in Vision API response');
    }
  }

  try {
    return JSON.parse(cleaned);
  } catch (parseError) {
    throw new Error(
      `JSON.parse failed after sanitization. Cleaned snippet: "${cleaned.slice(0, 120)}..." | Error: ${parseError.message}`
    );
  }
};

/**
 * Safe wrapper around sanitizeAndParseJSON that returns a fallback value
 * instead of throwing.
 *
 * @param {string} rawText - Raw text from Vision API
 * @param {*} fallback - Value to return if parsing fails (default: null)
 * @returns {Object|*} Parsed JSON or fallback
 */
export const safeParse = (rawText, fallback = null) => {
  try {
    return sanitizeAndParseJSON(rawText);
  } catch {
    return fallback;
  }
};

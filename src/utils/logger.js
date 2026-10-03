/**
 * Safe logger for errors and optional debug messages.
 */
export const logger = {
  debate(message, ...args) {
    if (process.env.DEBUG) console.log(`[Debate] ${message}`, ...args);
  },
  groq(message, ...args) {
    if (process.env.DEBUG) console.log(`[Groq] ${message}`, ...args);
  },
  storage(message, ...args) {
    if (process.env.DEBUG) console.log(`[Storage] ${message}`, ...args);
  },
  warn(category, message, ...args) {
    console.warn(`[${category}] WARN: ${message}`, ...args);
  },
  error(category, message, ...args) {
    console.error(`[${category}] ERROR: ${message}`, ...args);
  },
};

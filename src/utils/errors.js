/**
 * Standard error codes for the AI Debate Playground
 */
export const ErrorCodes = {
  INVALID_REQUEST: "INVALID_REQUEST",
  NOT_FOUND: "NOT_FOUND",
  DEBATE_COMPLETED: "DEBATE_COMPLETED",
  DEBATE_LOCKED: "DEBATE_LOCKED",
  GROQ_API_ERROR: "GROQ_API_ERROR",
  INVALID_API_KEY: "INVALID_API_KEY",
  MODEL_NOT_FOUND: "MODEL_NOT_FOUND",
  RATE_LIMIT_EXCEEDED: "RATE_LIMIT_EXCEEDED",
  FILE_SYSTEM_ERROR: "FILE_SYSTEM_ERROR",
  CONFIG_ERROR: "CONFIG_ERROR",
  INTERNAL_ERROR: "INTERNAL_ERROR",
};

/**
 * Custom Application Error class
 */
export class AppError extends Error {
  /**
   * @param {string} code - Error code from ErrorCodes
   * @param {string} message - Human-readable error message
   * @param {number} statusCode - HTTP status code (default 500)
   */
  constructor(code, message, statusCode = 500) {
    super(message);
    this.name = "AppError";
    this.code = code || ErrorCodes.INTERNAL_ERROR;
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
}

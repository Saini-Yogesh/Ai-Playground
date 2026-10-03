import dotenv from "dotenv";
import { AppError, ErrorCodes } from "../utils/errors.js";

dotenv.config();

/**
 * Validates required environment credentials (API keys only).
 * @param {boolean} strict
 * @returns {object}
 */
export function validateAndGetConfig(strict = true) {
  const missing = [];

  const GROQ_API_KEY_A = process.env.GROQ_API_KEY_A?.trim();
  const GROQ_API_KEY_B = process.env.GROQ_API_KEY_B?.trim();

  if (!GROQ_API_KEY_A) missing.push("GROQ_API_KEY_A");
  if (!GROQ_API_KEY_B) missing.push("GROQ_API_KEY_B");

  if (strict && missing.length > 0) {
    throw new AppError(
      ErrorCodes.CONFIG_ERROR,
      `Missing required environment variables in .env: ${missing.join(", ")}. Please configure them in .env.`,
    );
  }

  return {
    groqApiKeyA: GROQ_API_KEY_A || "",
    groqApiKeyB: GROQ_API_KEY_B || "",
  };
}

export const config = validateAndGetConfig(false);

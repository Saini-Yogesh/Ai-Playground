import { AppError, ErrorCodes } from "../utils/errors.js";

/**
 * Validates and constructs an agent configuration from user input and API credentials.
 *
 * @param {object} params
 * @param {'A' | 'B'} params.agentKey
 * @param {object} params.agentInput - Input from debate-input.json
 * @param {string} params.apiKey - API key from .env
 * @returns {object} Validated agent configuration
 */
export function buildAgentConfig({ agentKey, agentInput, apiKey }) {
  if (!agentInput) {
    throw new AppError(
      ErrorCodes.CONFIG_ERROR,
      `Missing configuration for Agent ${agentKey} in debate-input.json.`,
      400,
    );
  }

  if (
    !agentInput.name ||
    typeof agentInput.name !== "string" ||
    !agentInput.name.trim()
  ) {
    throw new AppError(
      ErrorCodes.CONFIG_ERROR,
      `Missing or empty 'name' for Agent ${agentKey} in debate-input.json.`,
      400,
    );
  }

  if (
    !agentInput.model ||
    typeof agentInput.model !== "string" ||
    !agentInput.model.trim()
  ) {
    throw new AppError(
      ErrorCodes.CONFIG_ERROR,
      `Missing or empty 'model' for Agent ${agentKey} in debate-input.json.`,
      400,
    );
  }

  if (
    !agentInput.systemPrompt ||
    typeof agentInput.systemPrompt !== "string" ||
    !agentInput.systemPrompt.trim()
  ) {
    throw new AppError(
      ErrorCodes.CONFIG_ERROR,
      `Missing or empty 'systemPrompt' for Agent ${agentKey} in debate-input.json.`,
      400,
    );
  }

  if (!apiKey) {
    throw new AppError(
      ErrorCodes.CONFIG_ERROR,
      `Missing API key for Agent ${agentKey}. Please configure GROQ_API_KEY_${agentKey} in your .env file.`,
      500,
    );
  }

  return {
    id: agentKey,
    name: agentInput.name.trim(),
    model: agentInput.model.trim(),
    apiKey: apiKey,
    systemPrompt: agentInput.systemPrompt.trim(),
  };
}

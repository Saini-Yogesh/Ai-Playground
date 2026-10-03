import Groq from "groq-sdk";
import { AppError, ErrorCodes } from "../utils/errors.js";
import { logger } from "../utils/logger.js";

/**
 * Service responsible solely for Groq API communication.
 * Isolates LLM provider interactions from the core debate orchestration engine.
 */
export class GroqService {
  /**
   * Generates a chat completion using Groq.
   *
   * @param {object} params
   * @param {string} params.apiKey - Groq API Key
   * @param {string} params.model - Model identifier (e.g. 'llama-3.3-70b-versatile')
   * @param {Array<{ role: string, content: string }>} params.messages - Formatted chat messages
   * @param {number} [params.temperature=0.7] - Sampling temperature
   * @param {number} [params.maxTokens=1024] - Max response tokens
   * @returns {Promise<string>} The assistant's text response
   */
  async generateResponse({
    apiKey,
    model,
    messages,
    temperature = 0.7,
    maxTokens = 1024,
  }) {
    if (!apiKey) {
      throw new AppError(
        ErrorCodes.CONFIG_ERROR,
        "Groq API key is missing. Please check your environment variables.",
        500,
      );
    }

    if (!model) {
      throw new AppError(
        ErrorCodes.CONFIG_ERROR,
        "Groq model is missing. Please check your environment variables.",
        500,
      );
    }

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      throw new AppError(
        ErrorCodes.INVALID_REQUEST,
        "Messages array cannot be empty when calling Groq service.",
        400,
      );
    }

    logger.groq(
      `Calling model '${model}' (messages: ${messages.length}, maxTokens: ${maxTokens})`,
    );

    try {
      const groq = new Groq({ apiKey });

      const completion = await groq.chat.completions.create({
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
      });

      const messageObj = completion.choices?.[0]?.message;
      const responseText = (
        messageObj?.content ||
        messageObj?.reasoning_content ||
        messageObj?.reasoning ||
        ""
      ).trim();

      if (!responseText) {
        logger.error("Groq", `Empty response payload from model '${model}': ${JSON.stringify(completion.choices?.[0] || {})}`);
        throw new AppError(
          ErrorCodes.GROQ_API_ERROR,
          "Received empty response from Groq API.",
          502,
        );
      }

      return responseText;
    } catch (err) {
      // If it's already an AppError, rethrow
      if (err instanceof AppError) {
        throw err;
      }

      // Map Groq SDK / HTTP errors to clean application errors
      const status = err.status || err.statusCode || 502;
      const rawMessage = err.message || "Unknown Groq error";

      logger.error(
        "Groq",
        `API request failed [Status ${status}]: ${rawMessage}`,
      );

      if (status === 401) {
        throw new AppError(
          ErrorCodes.INVALID_API_KEY,
          "Invalid or unauthorized Groq API key.",
          401,
        );
      }

      if (status === 404) {
        throw new AppError(
          ErrorCodes.MODEL_NOT_FOUND,
          `The requested model '${model}' was not found or is unavailable on Groq.`,
          404,
        );
      }

      if (status === 429) {
        throw new AppError(
          ErrorCodes.RATE_LIMIT_EXCEEDED,
          "Groq API rate limit exceeded. Please wait a moment and try again.",
          429,
        );
      }

      throw new AppError(
        ErrorCodes.GROQ_API_ERROR,
        `Groq API error: ${rawMessage}`,
        status >= 400 && status < 600 ? status : 502,
      );
    }
  }
}

export const groqService = new GroqService();

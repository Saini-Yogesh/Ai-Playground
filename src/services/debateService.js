import { generateId } from "../utils/generateId.js";
import { AppError, ErrorCodes } from "../utils/errors.js";
import { logger } from "../utils/logger.js";
import { lockManager } from "../utils/lockManager.js";
import { fileService } from "./fileService.js";
import { groqService } from "./groqService.js";
import { contextManager } from "./contextManager.js";
import { buildAgentConfig } from "../config/agents.js";
import { validateAndGetConfig } from "../config/env.js";

export class DebateService {
  constructor({
    storage = fileService,
    llmService = groqService,
    context = contextManager,
  } = {}) {
    this.storage = storage;
    this.llmService = llmService;
    this.context = context;
  }

  /**
   * Create a new debate. Strictly validates all required fields without silent fallbacks.
   *
   * @param {object} params
   * @param {string} params.topic - Debate topic (required)
   * @param {number} params.maxTurns - Positive integer (required)
   * @param {object} params.customAgents - Explicit Agent A & B configs (required)
   * @returns {Promise<object>} Created debate record
   */
  async createDebate({ topic, maxTurns, customAgents } = {}) {
    if (!topic || typeof topic !== "string" || !topic.trim()) {
      throw new AppError(
        ErrorCodes.INVALID_REQUEST,
        "Debate 'topic' is required and must be a non-empty string in debate-input.json.",
        400,
      );
    }

    if (!maxTurns || !Number.isInteger(maxTurns) || maxTurns <= 0) {
      throw new AppError(
        ErrorCodes.INVALID_REQUEST,
        "Debate 'maxTurns' is required and must be a positive integer in debate-input.json.",
        400,
      );
    }

    if (!customAgents || !customAgents.A || !customAgents.B) {
      throw new AppError(
        ErrorCodes.INVALID_REQUEST,
        "Both 'agentA' and 'agentB' configurations are required in debate-input.json.",
        400,
      );
    }

    // Validate environment and agent definitions strictly
    const env = validateAndGetConfig(true);
    buildAgentConfig({
      agentKey: "A",
      agentInput: customAgents.A,
      apiKey: env.groqApiKeyA,
    });
    buildAgentConfig({
      agentKey: "B",
      agentInput: customAgents.B,
      apiKey: env.groqApiKeyB,
    });

    const debateId = generateId("deb");
    const now = new Date().toISOString();

    const initialDebate = {
      id: debateId,
      topic: topic.trim(),
      status: "created",
      currentAgent: "A",
      turn: 0,
      maxTurns: maxTurns,
      customAgents: {
        A: customAgents.A,
        B: customAgents.B,
      },
      messages: [
        {
          role: "user",
          agent: null,
          content: topic.trim(),
          turn: 0,
          timestamp: now,
        },
      ],
      createdAt: now,
      updatedAt: now,
    };

    await this.storage.createDebate(initialDebate);
    logger.debate(
      `Created debate ${debateId} | Topic: "${topic.trim()}" | Max Turns: ${maxTurns}`,
    );

    return initialDebate;
  }

  /**
   * Execute exactly one AI turn in the debate.
   *
   * @param {string} debateId - ID of the debate
   * @returns {Promise<object>} Result of the turn execution
   */
  async executeNextTurn(debateId) {
    if (!debateId || typeof debateId !== "string") {
      throw new AppError(
        ErrorCodes.INVALID_REQUEST,
        "Debate ID is required.",
        400,
      );
    }

    return await lockManager.withLock(debateId, async () => {
      const debate = await this.storage.getDebate(debateId);

      if (debate.status === "completed" || debate.turn >= debate.maxTurns) {
        if (debate.status !== "completed") {
          debate.status = "completed";
          await this.storage.updateDebate(debateId, debate);
        }

        return {
          success: true,
          status: "completed",
          message: "Maximum number of turns reached.",
          debateId: debate.id,
          turn: debate.turn,
          maxTurns: debate.maxTurns,
        };
      }

      const currentAgentId = debate.currentAgent || "A";
      const env = validateAndGetConfig(true);
      const agentInput = debate.customAgents?.[currentAgentId];

      const agentConfig = buildAgentConfig({
        agentKey: currentAgentId,
        agentInput: agentInput,
        apiKey: currentAgentId === "A" ? env.groqApiKeyA : env.groqApiKeyB,
      });

      const nextTurnNumber = debate.turn + 1;
      logger.debate(
        `Turn ${nextTurnNumber} → Agent ${currentAgentId} (${agentConfig.name}) [Model: ${agentConfig.model}]`,
      );

      const contextMessages = this.context.buildContext({
        systemPrompt: agentConfig.systemPrompt,
        messages: debate.messages,
        currentAgent: currentAgentId,
      });

      let responseText;
      try {
        responseText = await this.llmService.generateResponse({
          apiKey: agentConfig.apiKey,
          model: agentConfig.model,
          messages: contextMessages,
        });
      } catch (err) {
        logger.error(
          "Debate",
          `Turn ${nextTurnNumber} failed for Agent ${currentAgentId}: ${err.message}`,
        );
        throw err;
      }

      const newMessage = {
        role: "assistant",
        agent: currentAgentId,
        content: responseText,
        turn: nextTurnNumber,
        timestamp: new Date().toISOString(),
      };

      debate.messages.push(newMessage);
      debate.turn = nextTurnNumber;

      const nextAgentId = currentAgentId === "A" ? "B" : "A";
      debate.currentAgent = nextAgentId;

      if (debate.turn >= debate.maxTurns) {
        debate.status = "completed";
        logger.debate(
          `Debate ${debateId} reached MAX_TURNS (${debate.maxTurns}) and is now COMPLETED.`,
        );
      } else {
        debate.status = "running";
        logger.debate(
          `Turn ${nextTurnNumber} completed for debate ${debateId}. Next up: Agent ${nextAgentId}`,
        );
      }

      await this.storage.updateDebate(debateId, debate);

      return {
        success: true,
        debateId: debate.id,
        turn: nextTurnNumber,
        agent: currentAgentId,
        response: responseText,
        nextAgent: nextAgentId,
        status: debate.status,
      };
    });
  }

  async getDebate(debateId) {
    if (!debateId || typeof debateId !== "string") {
      throw new AppError(
        ErrorCodes.INVALID_REQUEST,
        "Debate ID is required.",
        400,
      );
    }
    return await this.storage.getDebate(debateId);
  }

  async listDebates() {
    return await this.storage.listDebates();
  }
}

export const debateService = new DebateService();

import assert from "assert";
import { DebateService } from "../src/services/debateService.js";
import { FileService } from "../src/services/fileService.js";
import { ContextManager } from "../src/services/contextManager.js";
import { lockManager } from "../src/utils/lockManager.js";
import path from "path";
import fs from "fs/promises";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TEST_DATA_DIR = path.resolve(__dirname, "../data/test_debates");

class MockLLMService {
  constructor() {
    this.callHistory = [];
  }

  async generateResponse({ apiKey, model, messages }) {
    this.callHistory.push({ apiKey, model, messagesCount: messages.length });
    const lastMessage = messages[messages.length - 1];
    return `[Mock Response] Argument for: "${lastMessage.content.slice(0, 30)}..."`;
  }
}

async function runTests() {
  console.log("🧪 Starting AI Debate Playground Test Suite...\n");

  await fs.rm(TEST_DATA_DIR, { recursive: true, force: true });
  const testFileService = new FileService(TEST_DATA_DIR);
  const mockLLM = new MockLLMService();
  const contextMgr = new ContextManager();

  const testDebateService = new DebateService({
    storage: testFileService,
    llmService: mockLLM,
    context: contextMgr,
  });

  try {
    // -------------------------------------------------------------
    // Test 1: Strict Validation - Missing Topic
    // -------------------------------------------------------------
    console.log("▶ Test 1: Strict validation - missing topic throws error");
    let caughtTopic = false;
    try {
      await testDebateService.createDebate({
        topic: "",
        maxTurns: 3,
        customAgents: {
          A: { name: "A", model: "llama-3.3-70b-versatile", systemPrompt: "Prompt A" },
          B: { name: "B", model: "llama-3.3-70b-versatile", systemPrompt: "Prompt B" },
        },
      });
    } catch (err) {
      caughtTopic = true;
      assert.strictEqual(err.code, "INVALID_REQUEST");
    }
    assert(caughtTopic, "Must throw error when topic is empty");
    console.log("✔ Strict topic validation passed.\n");

    // -------------------------------------------------------------
    // Test 2: Strict Validation - Missing Model
    // -------------------------------------------------------------
    console.log("▶ Test 2: Strict validation - missing agent model throws error");
    let caughtModel = false;
    try {
      await testDebateService.createDebate({
        topic: "Topic",
        maxTurns: 3,
        customAgents: {
          A: { name: "A", systemPrompt: "Prompt A" },
          B: { name: "B", model: "llama-3.3-70b-versatile", systemPrompt: "Prompt B" },
        },
      });
    } catch (err) {
      caughtModel = true;
      assert.strictEqual(err.code, "CONFIG_ERROR");
    }
    assert(caughtModel, "Must throw error when model is missing from agent configuration");
    console.log("✔ Strict model validation passed.\n");

    // -------------------------------------------------------------
    // Test 3: Create and Execute Valid Debate
    // -------------------------------------------------------------
    console.log("▶ Test 3: Create and execute turn-by-turn debate");
    const debate = await testDebateService.createDebate({
      topic: "Should AI replace software engineers in 10 years?",
      maxTurns: 2,
      customAgents: {
        A: { name: "Agent A", model: "llama-3.3-70b-versatile", systemPrompt: "Prompt A" },
        B: { name: "Agent B", model: "llama-3.3-70b-versatile", systemPrompt: "Prompt B" },
      },
    });
    assert.strictEqual(debate.status, "created");
    assert.strictEqual(debate.maxTurns, 2);

    const turn1 = await testDebateService.executeNextTurn(debate.id);
    assert.strictEqual(turn1.turn, 1);
    assert.strictEqual(turn1.agent, "A");

    const turn2 = await testDebateService.executeNextTurn(debate.id);
    assert.strictEqual(turn2.turn, 2);
    assert.strictEqual(turn2.agent, "B");
    assert.strictEqual(turn2.status, "completed");

    console.log("✔ Debate turn-by-turn lifecycle passed.\n");

    console.log("🎉 ALL TESTS PASSED SUCCESSFULLY!\n");
  } finally {
    await fs.rm(TEST_DATA_DIR, { recursive: true, force: true });
  }
}

runTests().catch((err) => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});

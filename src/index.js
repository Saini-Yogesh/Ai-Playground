import fs from "fs/promises";
import { validateAndGetConfig } from "./config/env.js";
import { fileService } from "./services/fileService.js";
import { debateService } from "./services/debateService.js";

async function run() {
  // 1. Validate environment configuration strictly (stops if API keys are missing)
  validateAndGetConfig(true);
  await fileService.ensureDataDir();

  // 2. Read debate-input.json strictly
  let rawInput;
  try {
    rawInput = await fs.readFile("./debate-input.json", "utf-8");
  } catch (err) {
    throw new Error(
      `Cannot find 'debate-input.json' in root directory. Error: ${err.message}`,
    );
  }

  const input = JSON.parse(rawInput);

  if (!input.topic || typeof input.topic !== "string" || !input.topic.trim()) {
    throw new Error("Missing or empty 'topic' in debate-input.json");
  }

  if (
    !input.maxTurns ||
    !Number.isInteger(input.maxTurns) ||
    input.maxTurns <= 0
  ) {
    throw new Error(
      "Missing or invalid 'maxTurns' in debate-input.json (must be a positive integer)",
    );
  }

  if (!input.agentA || typeof input.agentA !== "object") {
    throw new Error("Missing 'agentA' object in debate-input.json");
  }

  if (!input.agentB || typeof input.agentB !== "object") {
    throw new Error("Missing 'agentB' object in debate-input.json");
  }

  const topic = input.topic.trim();
  const maxTurns = input.maxTurns;
  const customAgents = { A: input.agentA, B: input.agentB };

  console.log(`\n=== AI DEBATE STARTING ===`);
  console.log(`Topic: "${topic}"`);
  console.log(`Max Turns: ${maxTurns}`);
  console.log(
    `Agent A: ${customAgents.A.name} (Model: ${customAgents.A.model})`,
  );
  console.log(
    `Agent B: ${customAgents.B.name} (Model: ${customAgents.B.model})\n`,
  );

  let debate;
  try {
    debate = await debateService.createDebate({
      topic,
      maxTurns,
      customAgents,
    });

    while (
      debate.status !== "completed" &&
      debate.status !== "failed" &&
      debate.turn < maxTurns
    ) {
      const turnResult = await debateService.executeNextTurn(debate.id);
      const agentName =
        customAgents[turnResult.agent]?.name || `Agent ${turnResult.agent}`;

      console.log(`--- [Turn ${turnResult.turn}/${maxTurns}] ${agentName} ---`);
      console.log(`${turnResult.response}\n`);

      debate.turn = turnResult.turn;
      debate.status = turnResult.status;
    }

    if (debate.status === "completed") {
      console.log(`=== DEBATE COMPLETED ===`);
      console.log(`Saved transcript: data/debates/${debate.id}.json\n`);
    } else if (debate.status === "failed") {
      console.log(`=== DEBATE FAILED ===`);
      console.log(`Saved partial transcript: data/debates/${debate.id}.json\n`);
    }
  } catch (err) {
    if (debate && debate.id) {
      debate.status = "failed";
      debate.error = err.message;
      await fileService.updateDebate(debate.id, debate).catch(() => {});
    }
    throw err;
  }
}

run().catch((err) => {
  console.error(`\n❌ Error: ${err.message}`);
  process.exit(1);
});

# 🏗️ AI Debate Playground — System Architecture & Design

This document details the complete end-to-end architecture, module responsibilities, state transitions, and data flow of the **AI Debate Playground**.

---

## 1. High-Level System Flow

```text
               ┌────────────────────────────────────────────────────────┐
               │                  debate-input.json                     │
               │  - Topic proposition                                   │
               │  - Max turns count                                     │
               │  - Agent A (name, model, systemPrompt)                 │
               │  - Agent B (name, model, systemPrompt)                 │
               └───────────────────────────┬────────────────────────────┘
                                           │
                                           ▼
               ┌────────────────────────────────────────────────────────┐
               │                      src/index.js                      │
               │  - Reads & strictly validates debate-input.json        │
               │  - Validates API keys from .env via src/config/env.js  │
               │  - Initializes data/debates storage directory          │
               │  - Executes turn-by-turn loop with live terminal logs  │
               └───────────────────────────┬────────────────────────────┘
                                           │
                                           ▼
               ┌────────────────────────────────────────────────────────┐
               │               src/services/debateService               │
               │  - Manages debate state machine (created/running/done) │
               │  - Enforces max turns condition                        │
               │  - In-memory concurrency protection (lockManager.js)   │
               │  - Switches active agent: A <-> B                      │
               └───────────────┬────────────────────────┬───────────────┘
                               │                        │
        ┌──────────────────────┘                        └──────────────────────┐
        ▼                                                                      ▼
┌──────────────────────────────┐                              ┌──────────────────────────────┐
│  src/services/contextManager │                              │   src/services/fileService   │
│  - Formats stateless dialogue│                              │  - Saves data/debates/*.json │
│  - Preserves complete history│                              │  - Atomic read/write methods │
└──────────────┬───────────────┘                              └──────────────────────────────┘
               │
┌──────────────▼───────────────┐
│   src/services/groqService   │
│  - Communicates with Groq API│
│  - Strips credentials & maps │
│    errors to standard codes  │
└──────────────┬───────────────┘
               │
┌──────────────▼───────────────┐
│     Groq Cloud LLM API       │
│ (Llama 3.3 / Mixtral / etc.) │
└──────────────────────────────┘
```

---

## 2. Core Modules & Responsibilities

| Module | File | Purpose |
| :--- | :--- | :--- |
| **Runner** | [src/index.js](./src/index.js) | Entrypoint that loads `debate-input.json`, validates the environment, initiates the debate, streams turns live, and outputs the saved transcript location. |
| **Env Config** | [src/config/env.js](./src/config/env.js) | Validates that required secret keys (`GROQ_API_KEY_A`, `GROQ_API_KEY_B`) are present in `.env`. Fails immediately if any key is missing. |
| **Agent Config** | [src/config/agents.js](./src/config/agents.js) | Validates user-defined agent parameters (name, model, system prompt) from `debate-input.json`. Rejects incomplete definitions without hidden fallbacks. |
| **Debate Engine** | [src/services/debateService.js](./src/services/debateService.js) | Owns the orchestration state machine, coordinates agent turns, checks termination boundaries (`turn >= maxTurns`), and prevents race conditions. |
| **Context Manager** | [src/services/contextManager.js](./src/services/contextManager.js) | Transforms raw debate history into structured, stateless messages for the LLM. Formats previous turns clearly (`role: "assistant"` for the agent's own past statements, `role: "user"` with `[Agent X]:` prefix for the opponent). |
| **Groq Client** | [src/services/groqService.js](./src/services/groqService.js) | Dedicated Groq API client with error mapping (`INVALID_API_KEY`, `RATE_LIMIT_EXCEEDED`, `MODEL_NOT_FOUND`) and credential sanitization. |
| **Storage Engine** | [src/services/fileService.js](./src/services/fileService.js) | Handles atomic JSON persistence in `data/debates/<debateId>.json`. |
| **Concurrency Lock** | [src/utils/lockManager.js](./src/utils/lockManager.js) | In-memory mutex preventing overlapping turn execution on the same debate. |
| **Error Handling** | [src/utils/errors.js](./src/utils/errors.js) | Standardized `AppError` class and centralized `ErrorCodes`. |

---

## 3. Turn-by-Turn Execution Lifecycle

```text
Turn 0: Debate Initialized
┌─────────────────────────────────────────────────────────────────┐
│ Topic stored: "Should AI replace software engineers?"           │
│ Current Agent: "A" | Turn: 0 | Status: "created"                │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
Turn 1: Agent A Responds
┌─────────────────────────────────────────────────────────────────┐
│ Context built: [System A Prompt] + [Turn 0 Topic]               │
│ LLM Call: Groq executes Agent A's model                         │
│ Response saved to messages array as Turn 1                      │
│ Current Agent switched to "B" | Turn: 1 | Status: "running"     │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
Turn 2: Agent B Counters
┌─────────────────────────────────────────────────────────────────┐
│ Context built: [System B Prompt] + [Topic] + [Agent A Turn 1]   │
│ LLM Call: Groq executes Agent B's model                         │
│ Response saved to messages array as Turn 2                      │
│ Current Agent switched to "A" | Turn: 2 | Status: "running"     │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
Turn 3: Agent A Rebuts
┌─────────────────────────────────────────────────────────────────┐
│ Context built: [System A Prompt] + [Topic] + [A1] + [B1]        │
│ LLM Call: Groq executes Agent A's model                         │
│ Response saved to messages array as Turn 3                      │
│ Current Agent switched to "B" | Turn: 3                         │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
Turn N: Max Turns Boundary Reached
┌─────────────────────────────────────────────────────────────────┐
│ Turn == maxTurns                                                │
│ Status changed to "completed"                                   │
│ Transcript persisted to data/debates/<id>.json                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. Data Contract: `data/debates/<debateId>.json`

```json
{
  "id": "deb_3d71fba4e55c",
  "topic": "Should artificial intelligence replace software engineers in the next 10 years?",
  "status": "completed",
  "currentAgent": "A",
  "turn": 4,
  "maxTurns": 4,
  "customAgents": {
    "A": {
      "name": "Agent A (Affirmative / Pro-Automation)",
      "model": "llama-3.3-70b-versatile",
      "systemPrompt": "..."
    },
    "B": {
      "name": "Agent B (Critical / Human-Centric)",
      "model": "llama-3.3-70b-versatile",
      "systemPrompt": "..."
    }
  },
  "messages": [
    {
      "role": "user",
      "agent": null,
      "content": "Should artificial intelligence replace software engineers in the next 10 years?",
      "turn": 0,
      "timestamp": "2026-10-03T07:00:00.000Z"
    },
    {
      "role": "assistant",
      "agent": "A",
      "content": "Artificial intelligence is fundamentally transforming...",
      "turn": 1,
      "timestamp": "2026-10-03T07:00:15.000Z"
    },
    {
      "role": "assistant",
      "agent": "B",
      "content": "While syntax production is automated, software engineering involves...",
      "turn": 2,
      "timestamp": "2026-10-03T07:00:30.000Z"
    }
  ],
  "createdAt": "2026-10-03T07:00:00.000Z",
  "updatedAt": "2026-10-03T07:01:00.000Z"
}
```

---

## 5. Security & Isolation Principles

1. **No Secret Leaks**: API keys are loaded strictly from `.env` and never written to disk transcripts, logs, or error messages.
2. **Git Privacy**: `.gitignore` ensures that `.env`, `debate-input.json`, and dynamic outputs `data/debates/deb_*.json` are never committed to version control.
3. **Pluggable Architecture**: The LLM interaction is isolated in `src/services/groqService.js` and context assembly in `src/services/contextManager.js`, allowing future extensions (e.g. OpenAI, Anthropic, Ollama, or context compression/RAG) without touching the orchestration engine.
4. **LLM Generation Controls (`temperature` & `maxTokens`)**:
   - `temperature = 0.7`: Controls response creativity. Balances logical rigour with expressive phrasing across multiple turns.
   - `maxTokens = 1024`: Imposes a strict token ceiling (~800 words) per turn to cap latency/costs and allow reasoning models sufficient headroom for step-by-step thinking (`reasoning_content`) before generating text.

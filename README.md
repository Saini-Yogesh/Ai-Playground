# 🤖 AI Debate Playground

A local, lightweight, and extensible **multi-agent AI debate orchestration engine** powered by Node.js and the **Groq API**.

Two AI agents (**Agent A** and **Agent B**) debate autonomously turn-by-turn with user-defined models, personalities, and reasoning stances. The entire dialogue is driven by a single input file ([debate-input.json](file:///c:/Users/yoges/Desktop/GitHub/Ai-Playground/debate-input.json)), streamed live to the console, and automatically saved to structured JSON files.

---

## 🚀 Key Features

* **File-Driven Orchestration**: Define the debate topic, turn count, models, and custom agent prompts in `debate-input.json`.
* **Zero Silent Fallbacks**: Strict validation ensures all models, prompts, turn counts, and credentials must be explicitly configured.
* **Full Context Retention**: Stateless LLM context manager reconstructs the complete dialogue history ($A \rightarrow B \rightarrow A \rightarrow B$) on every turn.
* **Granular Agent Configuration**: Assign different Groq API keys, different LLM models (e.g. `llama-3.3-70b-versatile`), and distinct system prompts to each agent.
* **Automatic JSON Persistence**: Complete transcripts with timestamps and metadata are saved to `data/debates/<debate-id>.json`.
* **Privacy & Security**: Personal debate inputs, keys, and dynamic debate transcripts are excluded from Git via `.gitignore`.

---

## 🛠️ Getting Started

### 1. Prerequisites
* **Node.js**: v18.0.0 or higher (v20+ recommended)
* One or two **Groq API Keys** from [Groq Console](https://console.groq.com/)

### 2. Installation
```bash
git clone https://github.com/Saini-Yogesh/Ai-Playground.git
cd Ai-Playground
npm install
```

### 3. Configure API Credentials
Copy the example environment file and add your Groq API keys:
```bash
cp .env.example .env
```
Edit [.env](file:///c:/Users/yoges/Desktop/GitHub/Ai-Playground/.env):
```env
GROQ_API_KEY_A=gsk_your_first_groq_api_key
GROQ_API_KEY_B=gsk_your_second_groq_api_key
```

### 4. Configure Your Debate
Copy the template file to create your local [debate-input.json](file:///c:/Users/yoges/Desktop/GitHub/Ai-Playground/debate-input.json):
```bash
cp debate-input.example.json debate-input.json
```
Customize your debate settings in [debate-input.json](file:///c:/Users/yoges/Desktop/GitHub/Ai-Playground/debate-input.json):
```json
{
  "topic": "Should artificial intelligence replace software engineers in the next 10 years?",
  "maxTurns": 4,
  "agentA": {
    "name": "Agent A (Affirmative / Pro-Automation)",
    "model": "llama-3.3-70b-versatile",
    "systemPrompt": "You are Agent A in a high-level academic debate. Defend the proposition that AI will replace the majority of traditional software engineering roles within 10 years. Use concrete examples like code synthesis, automated testing, neural compiler optimization, and autonomous developer agents. Respond directly to Agent B's counterarguments."
  },
  "agentB": {
    "name": "Agent B (Critical / Human-Centric)",
    "model": "llama-3.3-70b-versatile",
    "systemPrompt": "You are Agent B in a high-level academic debate. Challenge the proposition and defend the enduring necessity of human software engineers. Focus on system architecture, ambiguous requirements, domain empathy, cybersecurity accountability, and philosophical limitations of LLMs. Directly dissect and refute Agent A's points."
  }
}
```

### 5. Start the Debate
```bash
npm run dev
# or: npm start
```

---

## 💻 Example Terminal Output

```text
=== AI DEBATE STARTING ===
Topic: "Should artificial intelligence replace software engineers in the next 10 years?"
Max Turns: 4
Agent A: Agent A (Affirmative / Pro-Automation) (Model: llama-3.3-70b-versatile)
Agent B: Agent B (Critical / Human-Centric) (Model: llama-3.3-70b-versatile)

--- [Turn 1/4] Agent A (Affirmative / Pro-Automation) ---
Artificial intelligence is fundamentally transforming software engineering. Over the next decade, advances in neural code synthesis, autonomous agentic loops, automated unit and regression testing, and self-optimizing compilers will automate the repetitive coding tasks that occupy the bulk of traditional developer hours...

--- [Turn 2/4] Agent B (Critical / Human-Centric) ---
While AI undeniably accelerates syntax production and boilerplate generation, writing code represents only a small fraction of software engineering. True software engineering centers on ambiguous requirements discovery, socio-technical domain empathy, high-reliability architecture, security threat modeling, and legal compliance...

=== DEBATE COMPLETED ===
Saved transcript: data/debates/deb_a8f1e29c.json
```

---

## 📂 Output & Persistence

Every debate is stored as an independent JSON record in `data/debates/<debate-id>.json`.

See [data/debates/sample_output.json](file:///c:/Users/yoges/Desktop/GitHub/Ai-Playground/data/debates/sample_output.json) for a full example.

```json
{
  "id": "deb_a8f1e29c",
  "topic": "Should artificial intelligence replace software engineers in the next 10 years?",
  "status": "completed",
  "currentAgent": "A",
  "turn": 4,
  "maxTurns": 4,
  "customAgents": { ... },
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
    }
  ],
  "createdAt": "2026-10-03T07:00:00.000Z",
  "updatedAt": "2026-10-03T07:01:00.000Z"
}
```

---

## 🧪 Running Tests

Run the automated integration test suite:
```bash
npm test
```

---

## 🏛️ Project Architecture

```text
ai-debate-playground/
├── src/
│   ├── config/
│   │   ├── env.js            # Strict validation for .env API keys
│   │   └── agents.js         # Strict validation for agent model/prompt specs
│   ├── services/
│   │   ├── debateService.js  # Turn orchestration state machine & limits
│   │   ├── groqService.js    # Groq API client with error mapping
│   │   ├── contextManager.js # Stateless complete dialogue context builder
│   │   └── fileService.js    # Atomic JSON filesystem storage
│   ├── utils/
│   │   ├── errors.js         # Standard error codes & AppError class
│   │   ├── generateId.js     # Unique debate ID generator (`deb_*`)
│   │   ├── lockManager.js    # In-memory concurrency locks
│   │   └── logger.js         # Safe logger without secret leakage
│   └── index.js              # Main execution runner
│
├── data/
│   └── debates/              # Persistent JSON debate records
│       ├── .gitkeep          # Tracks directory in Git
│       └── sample_output.json# Reference debate output
│
├── test/
│   └── test_flow.js          # Automated end-to-end integration test suite
│
├── debate-input.json         # Local user input configuration (Git-ignored)
├── debate-input.example.json # Public template configuration
├── .env                      # Local API keys (Git-ignored)
├── .env.example              # Public API key template
├── .gitignore                # Git exclusions
├── package.json              # Minimal dependencies (groq-sdk, dotenv)
├── ARCHITECTURE.md           # Deep-dive system design & architectural diagrams
└── README.md                 # Project documentation
```

---

## 📜 License
MIT
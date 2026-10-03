/**
 * Context Manager Strategy.
 * In this initial version, builds the full, uncompressed conversation history
 * for the stateless LLM API request.
 *
 * This modular design allows swapping in summarization, sliding window,
 * or RAG strategies in future versions without touching the debate orchestration engine.
 */
export class ContextManager {
  /**
   * Builds the messages array to send to the Groq Chat Completion API.
   *
   * @param {object} params
   * @param {string} params.systemPrompt - The agent's system instructions
   * @param {Array<object>} params.messages - Array of stored debate messages
   * @param {'A' | 'B'} params.currentAgent - The agent generating the next response
   * @returns {Array<{ role: string, content: string }>} Formatted messages for Groq API
   */
  buildContext({ systemPrompt, messages, currentAgent }) {
    const formattedMessages = [];

    // 1. Inject Agent's System Prompt
    if (systemPrompt) {
      formattedMessages.push({
        role: 'system',
        content: systemPrompt.trim()
      });
    }

    // 2. Iterate through stored debate messages
    for (const msg of messages) {
      if (msg.role === 'user') {
        // Initial debate topic / user prompt
        formattedMessages.push({
          role: 'user',
          content: msg.content
        });
      } else if (msg.role === 'assistant') {
        if (msg.agent === currentAgent) {
          // This agent's own previous statements are assistant turns
          formattedMessages.push({
            role: 'assistant',
            content: msg.content
          });
        } else {
          // Opponent agent's statements are presented as interlocutor user inputs
          formattedMessages.push({
            role: 'user',
            content: `[Agent ${msg.agent}]:\n${msg.content}`
          });
        }
      }
    }

    return formattedMessages;
  }
}

export const contextManager = new ContextManager();

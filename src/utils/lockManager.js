import { AppError, ErrorCodes } from './errors.js';

class LockManager {
  constructor() {
    /** @type {Set<string>} */
    this.lockedDebates = new Set();
  }

  /**
   * Acquire a lock for a given debate ID.
   * Throws AppError with DEBATE_LOCKED if already locked.
   * @param {string} debateId
   */
  acquire(debateId) {
    if (this.lockedDebates.has(debateId)) {
      throw new AppError(
        ErrorCodes.DEBATE_LOCKED,
        `A turn is already being processed for debate '${debateId}'. Please wait for it to complete.`,
        409
      );
    }
    this.lockedDebates.add(debateId);
  }

  /**
   * Release the lock for a given debate ID.
   * @param {string} debateId
   */
  release(debateId) {
    this.lockedDebates.delete(debateId);
  }

  /**
   * Check if a debate is currently locked.
   * @param {string} debateId
   * @returns {boolean}
   */
  isLocked(debateId) {
    return this.lockedDebates.has(debateId);
  }

  /**
   * Helper to run an async operation with automatic lock acquisition and release.
   * @template T
   * @param {string} debateId
   * @param {() => Promise<T>} fn
   * @returns {Promise<T>}
   */
  async withLock(debateId, fn) {
    this.acquire(debateId);
    try {
      return await fn();
    } finally {
      this.release(debateId);
    }
  }
}

export const lockManager = new LockManager();

import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { AppError, ErrorCodes } from "../utils/errors.js";
import { logger } from "../utils/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, "../../data/debates");

export class FileService {
  constructor(dataDir = DATA_DIR) {
    this.dataDir = dataDir;
    this.initialized = false;
  }

  /**
   * Ensure data/debates directory exists.
   */
  async ensureDataDir() {
    try {
      await fs.mkdir(this.dataDir, { recursive: true });
      this.initialized = true;
    } catch (err) {
      logger.error(
        "Storage",
        `Failed to create data directory ${this.dataDir}: ${err.message}`,
      );
      throw new AppError(
        ErrorCodes.FILE_SYSTEM_ERROR,
        `Failed to initialize storage directory: ${err.message}`,
      );
    }
  }

  /**
   * Get file path for a debate ID.
   * @param {string} id
   * @returns {string}
   */
  getDebateFilePath(id) {
    // Sanitize ID to prevent path traversal
    const safeId = path.basename(id);
    return path.join(this.dataDir, `${safeId}.json`);
  }

  /**
   * Create a new debate record on disk.
   * @param {object} debateData
   * @returns {Promise<object>} Saved debate object
   */
  async createDebate(debateData) {
    await this.ensureDataDir();
    const filePath = this.getDebateFilePath(debateData.id);

    try {
      const payload = JSON.stringify(debateData, null, 2);
      await fs.writeFile(filePath, payload, "utf-8");
      logger.storage(`Saved new debate file: ${debateData.id}.json`);
      return debateData;
    } catch (err) {
      logger.error(
        "Storage",
        `Failed to write debate ${debateData.id}: ${err.message}`,
      );
      throw new AppError(
        ErrorCodes.FILE_SYSTEM_ERROR,
        `Failed to persist debate ${debateData.id}: ${err.message}`,
      );
    }
  }

  /**
   * Read and parse a debate record by ID.
   * @param {string} id
   * @returns {Promise<object>} Debate object
   */
  async getDebate(id) {
    await this.ensureDataDir();
    const filePath = this.getDebateFilePath(id);

    try {
      const data = await fs.readFile(filePath, "utf-8");
      return JSON.parse(data);
    } catch (err) {
      if (err.code === "ENOENT") {
        throw new AppError(
          ErrorCodes.NOT_FOUND,
          `Debate with ID '${id}' was not found.`,
          404,
        );
      }
      logger.error("Storage", `Failed to read debate ${id}: ${err.message}`);
      throw new AppError(
        ErrorCodes.FILE_SYSTEM_ERROR,
        `Failed to read debate ${id}: ${err.message}`,
      );
    }
  }

  /**
   * Update an existing debate record on disk.
   * @param {string} id
   * @param {object} debateData
   * @returns {Promise<object>} Updated debate object
   */
  async updateDebate(id, debateData) {
    await this.ensureDataDir();
    const filePath = this.getDebateFilePath(id);

    try {
      const updatedData = {
        ...debateData,
        updatedAt: new Date().toISOString(),
      };
      const payload = JSON.stringify(updatedData, null, 2);
      await fs.writeFile(filePath, payload, "utf-8");
      logger.storage(
        `Updated debate file: ${id}.json (Turn ${updatedData.turn}, Status: ${updatedData.status})`,
      );
      return updatedData;
    } catch (err) {
      logger.error("Storage", `Failed to update debate ${id}: ${err.message}`);
      throw new AppError(
        ErrorCodes.FILE_SYSTEM_ERROR,
        `Failed to update debate ${id}: ${err.message}`,
      );
    }
  }

  /**
   * List all debate metadata summaries sorted by creation time descending.
   * @returns {Promise<Array<object>>}
   */
  async listDebates() {
    await this.ensureDataDir();

    try {
      const files = await fs.readdir(this.dataDir);
      const jsonFiles = files.filter((file) => file.endsWith(".json"));

      const debates = await Promise.all(
        jsonFiles.map(async (file) => {
          try {
            const raw = await fs.readFile(
              path.join(this.dataDir, file),
              "utf-8",
            );
            const data = JSON.parse(raw);
            return {
              id: data.id,
              topic: data.topic,
              status: data.status,
              currentAgent: data.currentAgent,
              turn: data.turn,
              maxTurns: data.maxTurns,
              createdAt: data.createdAt,
              updatedAt: data.updatedAt,
            };
          } catch (readErr) {
            logger.warn(
              "Storage",
              `Failed to parse debate file ${file}: ${readErr.message}`,
            );
            return null;
          }
        }),
      );

      return debates
        .filter(Boolean)
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
    } catch (err) {
      logger.error("Storage", `Failed to list debates: ${err.message}`);
      throw new AppError(
        ErrorCodes.FILE_SYSTEM_ERROR,
        `Failed to list debates: ${err.message}`,
      );
    }
  }
}

export const fileService = new FileService();

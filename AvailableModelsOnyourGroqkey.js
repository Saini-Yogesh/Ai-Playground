import Groq from "groq-sdk";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(ROOT, ".env") });

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY_A });

const res = await groq.models.list();
const ids = res.data.map((m) => m.id).sort();
console.log("\n=== Available Models on your Groq key ===\n");
ids.forEach((id) => console.log(" •", id));
console.log(`\nTotal: ${ids.length} models\n`);

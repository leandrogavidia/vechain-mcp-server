import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { start } from "./server.js"

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

start().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
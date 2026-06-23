import { Mastra } from "@mastra/core/mastra";
import { mastraAgents } from "./agents.js";
import { getMastraMemory } from "./memory.js";

const supabaseUrl = process.env["SUPABASE_URL"];
const memoryConfig = supabaseUrl
  ? {
      // Postgres connection string for Mastra memory.
      // Defaults to the local Supabase stack when SUPABASE_DB_URL is unset.
      connectionString:
        process.env["SUPABASE_DB_URL"] ??
        "postgresql://postgres:postgres@localhost:54322/postgres",
    }
  : undefined;

// Bootstrap memory asynchronously. Mastra accepts an undefined memory slot, so
// if `@mastra/pg` isn't installed we still boot — just without cross-session
// recall. The runtime tests assert this fallback path.
const memory = await getMastraMemory(memoryConfig);

export const mastra = new Mastra({
  agents: mastraAgents,
  ...(memory ? { memory: memory as never } : {}),
});

export { mastraAgents } from "./agents.js";
export { getMastraMemory, workingMemoryTemplate } from "./memory.js";
